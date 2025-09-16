'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useRouter, useSearchParams } from 'next/navigation';

/* ---------- Types ---------- */

type QuestionType =
  | 'text' | 'textarea' | 'radio' | 'checkbox'
  | 'select' | 'number' | 'date' | 'file';

type Option = { id?: string; label: string; value: string };

type Question = {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  helpText?: string | null;
  fileMultiple?: boolean | null;
  sortOrder?: number | null;
  options?: Option[]; // used by select/radio/checkbox if present
};

type PreviewItem = {
  id: string; qid: string; width: 0 | 1 | 2 | 3; align?: 'left' | 'center' | 'right';
};

type Mode = 'build' | 'preview';

/* ---------- Constants ---------- */

const BANK_ID = 'bank';
const PREVIEW_ID = 'preview';
const makeInstId = () =>
  `inst_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

/* ---------- Helpers ---------- */

function widthToCols(w: 0 | 1 | 2 | 3): 12 | 8 | 6 | 4 {
  switch (w) {
    case 3: return 12; // full
    case 2: return 8;  // 2/3
    case 0: return 6;  // half
    case 1:
    default: return 4; // 1/3
  }
}

function packPreviewToItems(preview: PreviewItem[]) {
  // Left→right packing; each row sums to 12; produces API-ready items
  let row = 1, col: 1 | 2 | 3 = 1, acc = 0;
  const items = [];
  for (const pi of preview) {
    const span = widthToCols(pi.width) as 12 | 8 | 6 | 4; // same mapping for Bootstrap cols & API span
    if (acc + span > 12) { row++; col = 1; acc = 0; }
    items.push({ qid: pi.qid, row, col, span });
    acc += span;
    col = (col + 1) as 1 | 2 | 3;
  }
  return items;
}

function shouldInsertAfter(targetId: string, pointerY: number) {
  const el = document.querySelector<HTMLElement>(`[data-preview-id="${targetId}"]`);
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  const midY = rect.top + rect.height / 2;
  return pointerY > midY; // below the midline → append after
}

/* ---------- Page ---------- */

export default function NewFormPage() {
  const router = useRouter();
  const params = useSearchParams();

  // Mode (SPA switch)
  const initialMode = (params.get('mode') as Mode) || 'build';
  const [mode, setMode] = useState<Mode>(initialMode);

  // Form meta
  const [title, setTitle] = useState('');

  // Bank
  const [bank, setBank] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  // Canvas
  const [preview, setPreview] = useState<PreviewItem[]>([]);
  const previewIds = preview.map(p => p.id); // instance ids

  // Drag overlay
  const [activeId, setActiveId] = useState<string | null>(null);

  // Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor)
  );

  // Load questions
  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/questions?order=sortOrder', { cache: 'no-store' });
        const data: Question[] = await res.json();
        if (ok) setBank(data);
      } catch (e) {
        console.error(e);
      } finally {
        if (ok) setLoading(false);
      }
    })();
    return () => { ok = false; };
  }, []);

  // URL reflect mode
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('mode', mode);
    window.history.replaceState(null, '', url.toString());
  }, [mode]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return bank;
    return bank.filter(x =>
      x.label.toLowerCase().includes(t) ||
      x.type.toLowerCase().includes(t)
    );
  }, [bank, q]);

  // Pointer tracking (for top/bottom decision on drop)
  const [pointerY, setPointerY] = useState<number>(0);
  useEffect(() => {
    const onMove = (e: PointerEvent) => setPointerY(e.clientY);
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);


  const bankIdSet = useMemo(() => new Set(bank.map(b => b.id)), [bank]);
  const getQuestion = (qid: string) => bank.find(b => b.id === qid);

  /* ---------- DnD Handlers ---------- */

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;

    const fromId = String(active.id);
    const toId = String(over.id);

    // Reorder within preview (instance ids on both sides)
    if (previewIds.includes(fromId) && previewIds.includes(toId)) {
      const oldIndex = previewIds.indexOf(fromId);
      const insertAfter = shouldInsertAfter(toId, pointerY);
      let newIndex = previewIds.indexOf(toId) + (insertAfter ? 1 : 0);
      // If moving down and inserting after a later index, account for removal shift
      if (newIndex > oldIndex) newIndex = Math.max(0, newIndex - 1);
      if (oldIndex !== newIndex) setPreview(p => arrayMove(p, oldIndex, newIndex));
      return;
    }

    // From Bank → onto Preview container (append)
    if (bankIdSet.has(fromId) && toId === PREVIEW_ID) {
      maybeAddToPreview(fromId, preview.length);
      return;
    }

    // From Bank → drop on specific Preview card (insert before)
    if (bankIdSet.has(fromId) && previewIds.includes(toId)) {
      const insertAfter = shouldInsertAfter(toId, pointerY);
      const baseIndex = previewIds.indexOf(toId);
      const insertIndex = baseIndex + (insertAfter ? 1 : 0);
      maybeAddToPreview(fromId, insertIndex);
      return;
    }

    // From Preview → dropped back on Bank: remove instance
    if (previewIds.includes(fromId) && toId === BANK_ID) {
      removeItem(fromId);
      return;
    }
  }

  function maybeAddToPreview(qid: string, insertIndex: number) {
    const already = preview.some(pi => pi.qid === qid);
    if (already) {
      const ok = confirm('This question is already in the form. Add another copy?');
      if (!ok) return;
    }
    // Default width = Full (3)
    const inst: PreviewItem = { id: makeInstId(), qid, width: 3 };
    setPreview(p => {
      const next = [...p];
      next.splice(insertIndex, 0, inst);
      return next;
    });
  }

  function setWidth(instId: string, w: 0 | 1 | 2 | 3) {
    setPreview(p => p.map(item => (item.id === instId ? { ...item, width: w } : item)));
  }

  function removeItem(instId: string) {
    setPreview(p => p.filter(item => item.id !== instId));
  }

  function handleReset() {
    if (preview.length === 0) return;
    const ok = confirm('Clear all questions from the canvas?');
    if (ok) setPreview([]);
  }

  async function handleSave() {
  if (!title.trim()) { alert('Please enter a form title.'); return; }
  if (preview.length === 0) { alert('Please add at least one question.'); return; }

  try {
    const payload = {
      title: title.trim(),
      items: packPreviewToItems(preview), // -> [{ qid,row,col,span }]
    };

    const res = await fetch('/api/forms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `Save failed (${res.status})`);

    alert('Form saved successfully ✅');
    // live view page:
    router.push(`/forms/${data.slug}`);
  } catch (err: any) {
    console.error(err);
    alert(err?.message || 'Failed to save the form. Please try again.');
  }
}


  /* ---------- Render ---------- */

  return (
    <div className="container py-3">
      {/* Utility CSS */}
      <style jsx>{`
        .empty-drop {
          text-align: center;
          color: #6c757d;
          font-size: 1.1rem;
          padding: 24px 8px;
        }
        .card-hover { position: relative; }
        .del-btn {
          position: absolute;
          top: 6px;
          left: 6px; /* left to avoid overlap with layout bars */
          visibility: hidden;
          opacity: 0;
          pointer-events: none;
          transition: opacity .12s ease-in-out, transform .12s ease-in-out;
          transform: translateY(-2px);
          z-index: 2;
        }
        .card-hover:hover .del-btn,
        .del-btn:focus {
          visibility: visible;
          opacity: 1;
          pointer-events: auto;
          transform: translateY(0);
        }

        /* Mini layout bars */
        .ff-layout { width: 80px; }
        .ff-layout .rowopt {
          display: flex;
          align-items: center;
          gap: 3px;
          margin: 4px 0;
        }
        .ff-layout .seg {
          height: 6px;
          border-radius: 2px;
          background: #e9ecef;
          transition: background 0.12s ease-in-out, transform 0.12s ease-in-out;
        }
        .ff-layout .seg:hover { background: #cfd6dd; }
        .ff-layout .seg.active { background: #0d6efd; }
        .ff-layout .label {
          width: 34px;
          font-size: 10px;
          color: #6c757d;
          text-align: right;
        }
        .ff-layout button {
          appearance: none;
          border: 0;
          background: transparent;
          padding: 0;
          margin: 0;
          line-height: 0;
          cursor: pointer;
        }
      `}</style>

      {/* Header */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2 mb-3">
        <div className="d-flex align-items-center gap-2">
          <h1 className="h4 mb-0">Create Form</h1>
          <div className="btn-group" role="group" aria-label="Mode">
            <button
              className={`btn btn-sm ${mode === 'build' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setMode('build')}
            >
              Build
            </button>
            <button
              className={`btn btn-sm ${mode === 'preview' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setMode('preview')}
              disabled={preview.length === 0}
            >
              Preview
            </button>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <input
            className="form-control form-control-sm"
            style={{ minWidth: 260 }}
            placeholder="Form title (required)"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          {mode === 'build' ? (
            <>
              <button
                className="btn btn-success btn-sm"
                onClick={handleSave}
                disabled={preview.length === 0 || !title.trim()}
                title="Save form"
              >
                Save
              </button>
              <button
                className="btn btn-outline-danger btn-sm"
                onClick={handleReset}
                disabled={preview.length === 0}
                title="Clear all"
              >
                Reset
              </button>
            </>
          ) : (
            <>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setMode('build')}
                title="Back to builder"
              >
                Back
              </button>
              <button
                className="btn btn-success btn-sm"
                onClick={handleSave}
                title="Save form"
              >
                Save
              </button>
            </>
          )}
        </div>
      </div>

      {mode === 'build' ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(e) => setActiveId(String(e.active.id))}
          onDragEnd={onDragEnd}
        >
          <div className="row g-3">
            {/* Bank (Left) */}
            <div className="col-12 col-md-5 col-lg-4">
              <div className="card shadow-sm h-100">
                <div className="card-header bg-white">
                  <div className="input-group">
                    <span className="input-group-text">Search</span>
                    <input
                      className="form-control"
                      placeholder="Questions..."
                      value={q}
                      onChange={e => setQ(e.target.value)}
                    />
                  </div>
                </div>
                <div className="card-body">
                  <Droppable id={BANK_ID}>
                    {loading && <div className="text-muted small">Loading…</div>}
                    {!loading && filtered.length === 0 && (
                      <div className="text-muted small">No questions.</div>
                    )}
                    <ul className="list-group list-group-flush">
                      {filtered.map(item => (
                        <li key={item.id} className="list-group-item p-2">
                          <DraggableBank id={item.id}>
                            <BankRow q={item} inPreview={preview.some(p => p.qid === item.id)} />
                          </DraggableBank>
                        </li>
                      ))}
                    </ul>
                  </Droppable>
                </div>
              </div>
            </div>

            {/* Canvas (Right) */}
            <div className="col-12 col-md-7 col-lg-8">
              <div className="card shadow-sm h-100">
                <div className="card-header bg-white d-flex justify-content-between align-items-center">
                  <span className="fw-semibold">A4 Preview (grid)</span>
                  <small className="text-muted">Drop here • Reorder</small>
                </div>
                <div className="card-body">
                  <Droppable id={PREVIEW_ID}>
                    <SortableContext items={previewIds} strategy={rectSortingStrategy}>
                      <div className="row g-3">
                        {preview.map(pi => {
                          const qn = getQuestion(pi.qid);
                          if (!qn) return null;
                          const col = widthToCols(pi.width);
                          return (
                            <div key={pi.id} className={`col-12 col-md-${col}`} data-preview-id={pi.id}>
                              <SortablePreview id={pi.id}>
                                <PreviewCard
                                  q={qn}
                                  width={pi.width}
                                  onSetWidth={(w) => setWidth(pi.id, w)}
                                  onDelete={() => removeItem(pi.id)}
                                />
                              </SortablePreview>
                            </div>
                          );
                        })}
                      </div>
                      {preview.length === 0 && (
                        <div className="empty-drop">Drop questions here</div>
                      )}
                    </SortableContext>
                  </Droppable>
                </div>
              </div>
            </div>
          </div>

          {/* Drag overlay (kept for MVP) */}
          <DragOverlay>
            {activeId ? <Ghost label={renderGhostLabel(activeId, bank, preview)} /> : null}
          </DragOverlay>
        </DndContext>
      ) : (
        // --------- Preview Mode (read-only) ----------
        <div className="card shadow-sm">
          <div className="card-body">
            {preview.length === 0 ? (
              <div className="text-muted">Nothing to preview.</div>
            ) : (
              <div className="row g-3">
                {preview.map((pi, idx) => {
                  const qn = getQuestion(pi.qid);
                  if (!qn) return null;
                  const col = widthToCols(pi.width);
                  return (
                    <div key={`${pi.id}_${idx}`} className={`col-12 col-md-${col}`} data-preview-id={pi.id}>
                      <ControlPreview q={qn} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- DnD primitives ---------- */

function Droppable({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} data-droppable-id={id} id={id}>
      {children}
    </div>
  );
}

function DraggableBank({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useDraggable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: 'grab',
    opacity: isDragging ? 0.6 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} aria-roledescription="draggable">
      {children}
    </div>
  );
}

function SortablePreview({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: 'grab',
    opacity: isDragging ? 0.6 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} aria-roledescription="sortable">
      {children}
    </div>
  );
}

/* ---------- UI pieces ---------- */

function BankRow({ q, inPreview }: { q: Question; inPreview: boolean }) {
  return (
    <div className="d-flex align-items-center justify-content-between">
      <div>
        <div className="fw-semibold">{q.label}</div>
        <small className="text-muted">{q.type}{q.required ? ' • required' : ''}</small>
      </div>
      {inPreview && <span className="badge text-bg-secondary">Added</span>}
    </div>
  );
}

function PreviewCard({
  q, width, onSetWidth, onDelete,
}: {
  q: Question; width: 0 | 1 | 2 | 3; onSetWidth: (w: 0 | 1 | 2 | 3) => void; onDelete: () => void;
}) {
  return (
    <div className="border rounded p-3 bg-light position-relative card-hover">
      {/* Hover-only delete (left) */}
      <button
        type="button"
        className="btn btn-sm btn-outline-danger del-btn"
        aria-label="Remove question"
        onClick={onDelete}
        title="Remove"
      >
        <i className="bi bi-trash" aria-hidden="true" />
      </button>

      <div className="d-flex gap-3 align-items-start">
        {/* Control on the LEFT */}
        <div className="flex-grow-1">
          <ControlPreview q={q} />
        </div>

        {/* Hamburger-style bars on the RIGHT (no labels) */}
        <div className="ff-bars" aria-label="Row layout">
          {/* Full */}
          <div className="rowopt">
            <button onClick={() => onSetWidth(3)} aria-label="Full width">
              <div className={`seg ${width === 3 ? 'active' : ''}`} style={{ width: 64 }} />
            </button>
          </div>
          {/* 1/2 + 1/2 */}
          <div className="rowopt">
            <button onClick={() => onSetWidth(0)} aria-label="Half left">
              <div className={`seg ${width === 0 ? 'active' : ''}`} style={{ width: 30 }} />
            </button>
            <button onClick={() => onSetWidth(0)} aria-label="Half right">
              <div className={`seg ${width === 0 ? 'active' : ''}`} style={{ width: 30 }} />
            </button>
          </div>
          {/* 1/3 + 1/3 + 1/3 */}
          <div className="rowopt">
            <button onClick={() => onSetWidth(1)} aria-label="Third 1">
              <div className={`seg ${width === 1 ? 'active' : ''}`} style={{ width: 20 }} />
            </button>
            <button onClick={() => onSetWidth(1)} aria-label="Third 2">
              <div className={`seg ${width === 1 ? 'active' : ''}`} style={{ width: 20 }} />
            </button>
            <button onClick={() => onSetWidth(1)} aria-label="Third 3">
              <div className={`seg ${width === 1 ? 'active' : ''}`} style={{ width: 20 }} />
            </button>
          </div>
          {/* 1/3 + 2/3 */}
          <div className="rowopt">
            <button onClick={() => onSetWidth(1)} aria-label="1/3 (left)">
              <div className={`seg ${width === 1 ? 'active' : ''}`} style={{ width: 20 }} />
            </button>
            <button onClick={() => onSetWidth(2)} aria-label="2/3 (right)">
              <div className={`seg ${width === 2 ? 'active' : ''}`} style={{ width: 42 }} />
            </button>
          </div>
          {/* 2/3 + 1/3 */}
          <div className="rowopt">
            <button onClick={() => onSetWidth(2)} aria-label="2/3 (left)">
              <div className={`seg ${width === 2 ? 'active' : ''}`} style={{ width: 42 }} />
            </button>
            <button onClick={() => onSetWidth(1)} aria-label="1/3 (right)">
              <div className={`seg ${width === 1 ? 'active' : ''}`} style={{ width: 20 }} />
            </button>
          </div>
        </div>
      </div>

      {/* Scoped styles so hover works reliably */}
      <style jsx>{`
        .card-hover { position: relative; }
        .del-btn {
          position: absolute;
          top: 6px;
          left: 6px;
          visibility: hidden;
          opacity: 0;
          pointer-events: none;
          transition: opacity .12s ease-in-out, transform .12s ease-in-out;
          transform: translateY(-2px);
          z-index: 2;
        }
        .card-hover:hover .del-btn,
        .del-btn:focus {
          visibility: visible;
          opacity: 1;
          pointer-events: auto;
          transform: translateY(0);
        }
        .ff-bars { width: 72px; }
        .ff-bars .rowopt {
          display: flex;
          align-items: center;
          gap: 4px;
          margin: 6px 0;
        }
        .ff-bars button {
          appearance: none;
          border: 0;
          background: transparent;
          padding: 0;
          margin: 0;
          line-height: 0;
          cursor: pointer;
        }
        .ff-bars .seg {
          height: 4px;                 /* thin pill (hamburger style) */
          border-radius: 999px;
          background: #e9ecef;
          transition: background .12s ease-in-out, transform .12s ease-in-out;
        }
        .ff-bars .seg:hover { background: #cfd6dd; }
        .ff-bars .seg.active { background: #0d6efd; } /* brand color when selected */
      `}</style>
    </div>
  );
}

function ControlPreview({ q }: { q: Question }) {
  const id = `ctrl_${q.id}`;
  const opts = q.options && q.options.length > 0
    ? q.options
    : [
      { label: 'Option A', value: 'A' },
      { label: 'Option B', value: 'B' },
    ];

  const Help = q.helpText ? (
    <i
      className="bi bi-question-circle ms-1 text-muted"
      title={q.helpText ?? ''}
      aria-label="Help"
      role="img"
    />
  ) : null;

  switch (q.type) {
    case 'text':
      return (
        <div>
          <label htmlFor={id} className="form-label">
            {q.label}{q.required ? ' *' : ''}{Help}
          </label>
          <input id={id} className="form-control" type="text" placeholder="Type here…" />
        </div>
      );
    case 'number':
      return (
        <div>
          <label htmlFor={id} className="form-label">
            {q.label}{q.required ? ' *' : ''}{Help}
          </label>
          <input id={id} className="form-control" type="number" placeholder="0" />
        </div>
      );
    case 'date':
      return (
        <div>
          <label htmlFor={id} className="form-label">
            {q.label}{q.required ? ' *' : ''}{Help}
          </label>
          <input id={id} className="form-control" type="date" />
        </div>
      );
    case 'textarea':
      return (
        <div>
          <label htmlFor={id} className="form-label">
            {q.label}{q.required ? ' *' : ''}{Help}
          </label>
          <textarea id={id} className="form-control" rows={3} placeholder="Enter text…" />
        </div>
      );
    case 'select':
      return (
        <div>
          <label htmlFor={id} className="form-label">
            {q.label}{q.required ? ' *' : ''}{Help}
          </label>
          <select id={id} className="form-select">
            <option value="">Select…</option>
            {opts.map((o, idx) => (
              <option key={o.value + idx} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      );
    case 'radio':
      return (
        <div>
          <div className="form-label">
            {q.label}{q.required ? ' *' : ''}{Help}
          </div>
          {opts.map((o, idx) => {
            const rid = `${id}_r_${idx}`;
            return (
              <div className="form-check" key={rid}>
                <input className="form-check-input" type="radio" name={id} id={rid} />
                <label className="form-check-label" htmlFor={rid}>{o.label}</label>
              </div>
            );
          })}
        </div>
      );
    case 'checkbox':
      return (
        <div>
          <div className="form-label">
            {q.label}{q.required ? ' *' : ''}{Help}
          </div>
          {opts.map((o, idx) => {
            const cid = `${id}_c_${idx}`;
            return (
              <div className="form-check" key={cid}>
                <input className="form-check-input" type="checkbox" id={cid} />
                <label className="form-check-label" htmlFor={cid}>{o.label}</label>
              </div>
            );
          })}
        </div>
      );
    case 'file':
      return (
        <div>
          <label htmlFor={id} className="form-label">
            {q.label}{q.required ? ' *' : ''}{q.helpText ? ' ' : ''}{Help}
          </label>
          <input id={id} className="form-control" type="file" multiple={!!q.fileMultiple} />
          {q.fileMultiple && <small className="text-muted">Multiple files allowed</small>}
        </div>
      );
    default:
      return (
        <div>
          <label htmlFor={id} className="form-label">
            {q.label}{q.required ? ' *' : ''}{Help}
          </label>
          <input id={id} className="form-control" type="text" placeholder="Preview" />
        </div>
      );
  }
}

/* ---------- Overlay bits ---------- */

function Ghost({ label }: { label: string }) {
  return (
    <div className="border rounded px-3 py-2 bg-white shadow-sm">
      <span className="small">{label}</span>
    </div>
  );
}

function renderGhostLabel(
  activeId: string,
  bank: Question[],
  preview: PreviewItem[]
): string {
  const fromBank = bank.find(b => b.id === activeId);
  if (fromBank) return fromBank.label;
  const inst = preview.find(p => p.id === activeId);
  if (inst) {
    const qn = bank.find(b => b.id === inst.qid);
    return qn?.label ?? 'Question';
  }
  return 'Question';
}
