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
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useRouter, useSearchParams } from 'next/navigation';

// Use the same types as your renderer to avoid drift
import { FormDef, Question } from '@/lib/types';
import FormRenderer from './FormRenderer';
import PreviewCard from './PreviewCard';

/* ---------- Types local to builder ---------- */

type QuestionType =
  | 'text' | 'textarea' | 'radio' | 'checkbox'
  | 'select' | 'number' | 'date' | 'file';

type Option = { id?: string; label: string; value: string };

type PreviewItem = {
  id: string;       // instance id
  qid: string;      // question id
  width: 0 | 1 | 2 | 3; // 3->12, 2->8, 0->6, 1->4
};

type Mode = 'build' | 'preview';

type LoadedForm = {
  id: string;
  slug: string;
  title: string;
  items: Array<{ qid: string; row: number; col: number; span: 4 | 6 | 8 | 12 }>;
};

/* ---------- Helpers ---------- */

const BANK_ID = 'bank';
const PREVIEW_ID = 'preview';
const makeInstId = () =>
  `inst_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function widthToCols(w: 0 | 1 | 2 | 3): 12 | 8 | 6 | 4 {
  switch (w) {
    case 3: return 12;
    case 2: return 8;
    case 0: return 6;
    case 1:
    default: return 4;
  }
}
function colsToWidth(cols: 4 | 6 | 8 | 12): 0 | 1 | 2 | 3 {
  switch (cols) {
    case 12: return 3;
    case 8: return 2;
    case 6: return 0;
    case 4: return 1;
  }
}
function packPreviewToItems(preview: PreviewItem[]) {
  let row = 1, col: 1 | 2 | 3 = 1, acc = 0;
  const items: Array<{ qid: string; row: number; col: 1 | 2 | 3; span: 4 | 6 | 8 | 12 }> = [];
  for (const pi of preview) {
    const span = widthToCols(pi.width);
    if (acc + span > 12) { row++; col = 1; acc = 0; }
    items.push({ qid: pi.qid, row, col, span });
    acc += span;
    col = (col + 1) as 1 | 2 | 3;
  }
  return items;
}
function buildPreviewFromFormItems(items: LoadedForm['items']): PreviewItem[] {
  return items.map(it => ({
    id: makeInstId(),
    qid: it.qid,
    width: colsToWidth(it.span),
  }));
}
function shouldInsertAfter(targetId: string, pointerY: number) {
  const el = document.querySelector<HTMLElement>(`[data-preview-id="${targetId}"]`);
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  return pointerY > rect.top + rect.height / 2;
}
function computeRows(preview: PreviewItem[]) {
  const groups: { start: number; end: number }[] = [];
  let acc = 0, start = 0;
  for (let i = 0; i < preview.length; i++) {
    const span = widthToCols(preview[i].width);
    if (acc + span > 12) { groups.push({ start, end: i - 1 }); start = i; acc = 0; }
    acc += span;
    if (acc === 12) { groups.push({ start, end: i }); start = i + 1; acc = 0; }
  }
  if (start <= preview.length - 1) groups.push({ start, end: preview.length - 1 });
  return groups;
}
function findRowIndexForItem(preview: PreviewItem[], itemIndex: number) {
  const rows = computeRows(preview);
  return rows.findIndex(r => itemIndex >= r.start && itemIndex <= r.end);
}
function getRowRemainder(preview: PreviewItem[], row: { start: number; end: number }) {
  let sum = 0;
  for (let i = row.start; i <= row.end; i++) sum += widthToCols(preview[i].width);
  return (12 - sum) as 0 | 4 | 6 | 8 | 12;
}
function insertAt<T>(arr: T[], index: number, item: T) {
  const next = [...arr];
  const i = Math.max(0, Math.min(index, next.length));
  next.splice(i, 0, item);
  return next;
}
function insertNewRowAt(pre: PreviewItem[], rowIndex: number, newItem: PreviewItem) {
  const rows = computeRows(pre);
  let insertPos = pre.length;
  if (rows.length) {
    if (rowIndex <= 0) insertPos = rows[0].start;
    else if (rowIndex >= rows.length) insertPos = rows[rows.length - 1].end + 1;
    else insertPos = rows[rowIndex].start;
  }
  const next = [...pre];
  next.splice(insertPos, 0, newItem);
  return next;
}
function dropIntoRow(pre: PreviewItem[], rowIndex: number, item: PreviewItem) {
  const rows = computeRows(pre);
  const row = rows[rowIndex];
  const rem = getRowRemainder(pre, row);
  if (rem === 0) return insertNewRowAt(pre, rowIndex + 1, { ...item, width: colsToWidth(12) });
  const newItem = { ...item, width: colsToWidth(rem as 4 | 6 | 8) };
  const next = [...pre];
  next.splice(row.end + 1, 0, newItem);
  return next;
}

/* ---------- Divider IDs ---------- */
const dividerId = (k: number) => `divider-${k}`; // 0..rows.length

/* ---------- Component ---------- */

export default function FormBuilder({ slug }: { slug?: string }) {
  const router = useRouter();
  const sp = useSearchParams();

  // Build / Preview toggle
  const initialMode = (sp.get('mode') as Mode) || 'build';
  const [mode, setMode] = useState<Mode>(initialMode);

  const [title, setTitle] = useState('');
  const [bank, setBank] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [preview, setPreview] = useState<PreviewItem[]>([]);
  const previewIds = preview.map(p => p.id);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor)
  );
  const [pointerY, setPointerY] = useState(0);
  useEffect(() => {
    const onMove = (e: PointerEvent) => setPointerY(e.clientY);
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  // Load bank + optional form
  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        setLoading(true);
        const [qRes, fRes] = await Promise.all([
          fetch('/api/questions?order=sortOrder', { cache: 'no-store' }),
          slug ? fetch(`/api/forms/${encodeURIComponent(slug)}`, { cache: 'no-store' }) : Promise.resolve(null),
        ]);
        if (!ok) return;
        setBank(await qRes.json());
        if (slug && fRes) {
          const form: LoadedForm = await fRes.json();
          setTitle(form?.title ?? '');
          setPreview(buildPreviewFromFormItems(form?.items ?? []));
        }
      } finally {
        if (ok) setLoading(false);
      }
    })();
    return () => { ok = false; };
  }, [slug]);

  // reflect mode in URL
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

  const bankIdSet = useMemo(() => new Set(bank.map(b => b.id)), [bank]);
  const getQuestion = (qid: string) => bank.find(b => b.id === qid);

  /* ---------- Drag End (dividers + swaps kept, widths preserved) ---------- */
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;

    const fromId = String(active.id);
    const toId = String(over.id);

    const isDivider = toId.startsWith('divider-') || toId.startsWith('dropzone-');
    const k = isDivider ? parseInt(toId.replace('divider-', '').replace('dropzone-', ''), 10) : null;

    // PREVIEW → DIVIDER
    if (isDivider && k !== null && previewIds.includes(fromId)) {
      const oldIndex = previewIds.indexOf(fromId);
      setPreview(p => {
        const without = [...p];
        const [dragged] = without.splice(oldIndex, 1);
        if (!dragged) return p;
        return insertNewRowAt(without, k, { ...dragged, width: colsToWidth(12) });
      });
      return;
    }
    // BANK → DIVIDER
    if (isDivider && k !== null && bankIdSet.has(fromId)) {
      const q = getQuestion(fromId);
      if (!q) return;
      setPreview(p =>
        insertNewRowAt(p, k, { id: makeInstId(), qid: q.id, width: colsToWidth(12) })
      );
      return;
    }

    // PREVIEW → PREVIEW (card on card: swap/reorder within flow, keep width)
    if (previewIds.includes(fromId) && (previewIds.includes(toId) || toId === PREVIEW_ID)) {
      const oldIndex = previewIds.indexOf(fromId);
      const targetIsCard = previewIds.includes(toId);
      const baseIndexOriginal = targetIsCard ? previewIds.indexOf(toId) : preview.length - 1;
      const insertAfter = targetIsCard ? shouldInsertAfter(toId, pointerY) : true;

      setPreview(p => {
        const without = [...p];
        const [dragged] = without.splice(oldIndex, 1);
        if (!dragged) return p;

        // dropping on canvas → new last row (12)
        if (!targetIsCard) {
          return insertNewRowAt(without, computeRows(without).length, { ...dragged, width: colsToWidth(12) });
        }

        let insertIndex = baseIndexOriginal;
        if (baseIndexOriginal > oldIndex) insertIndex -= 1; // removal shift
        if (insertAfter) insertIndex += 1;

        return insertAt(without, insertIndex, dragged);
      });
      return;
    }

    // BANK → CONTAINER (try last row remainder; else new last row)
    if (bankIdSet.has(fromId) && toId === PREVIEW_ID) {
      const q = getQuestion(fromId);
      if (!q) return;
      setPreview(p => {
        if (!p.length) return [{ id: makeInstId(), qid: q.id, width: colsToWidth(12) }];
        const rows = computeRows(p);
        const last = rows[rows.length - 1];
        return getRowRemainder(p, last) > 0
          ? dropIntoRow(p, rows.length - 1, { id: makeInstId(), qid: q.id, width: colsToWidth(12) })
          : insertNewRowAt(p, rows.length, { id: makeInstId(), qid: q.id, width: colsToWidth(12) });
      });
      return;
    }

    // BANK → CARD (auto-fit remainder of that row)
    if (bankIdSet.has(fromId) && previewIds.includes(toId)) {
      const q = getQuestion(fromId);
      if (!q) return;
      const baseIndex = previewIds.indexOf(toId);
      setPreview(p => {
        const rows = computeRows(p);
        const rowIdx = findRowIndexForItem(p, baseIndex);
        if (rowIdx < 0) {
          return insertNewRowAt(p, rows.length, { id: makeInstId(), qid: q.id, width: colsToWidth(12) });
        }
        const rem = getRowRemainder(p, rows[rowIdx]);
        if (rem > 0) {
          const newItem = { id: makeInstId(), qid: q.id, width: colsToWidth(rem as 4 | 6 | 8) };
          const next = [...p];
          next.splice(rows[rowIdx].end + 1, 0, newItem);
          return next;
        }
        return insertNewRowAt(p, rowIdx + 1, { id: makeInstId(), qid: q.id, width: colsToWidth(12) });
      });
      return;
    }

    // PREVIEW → BANK (remove)
    if (previewIds.includes(fromId) && toId === BANK_ID) {
      setPreview(p => p.filter(i => i.id !== fromId));
      return;
    }
  }

  /* ---------- Actions ---------- */

  function removeItem(instId: string) {
    setPreview(p => p.filter(item => item.id !== instId));
  }
  async function handleSave() {
    if (!title.trim()) { alert('Please enter a form title.'); return; }
    if (!preview.length) { alert('Please add at least one question.'); return; }
    try {
      const payload = { title: title.trim(), items: packPreviewToItems(preview) };
      const url = slug ? `/api/forms/${encodeURIComponent(slug)}` : '/api/forms';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Save failed (${res.status})`);
      alert('Form saved successfully ✅');
      const nextSlug = data?.slug ?? slug;
      if (nextSlug) router.push(`/forms/${nextSlug}`); else router.refresh();
    } catch (err: any) {
      alert(err?.message || 'Failed to save the form.');
    }
  }

  /* ---------- Build a FormRenderer-compatible form for Preview ---------- */

  const previewForm = useMemo(() => {
    // Convert builder state to renderer items with joined question
    const items = packPreviewToItems(preview)
      .map(it => {
        const qdef = bank.find(b => b.id === it.qid);
        if (!qdef) return null;
        return {
          ...it,
          question: qdef,
          id: undefined as string | undefined,
          order: undefined as number | undefined,
        };
      })
      .filter(Boolean) as Array<{
        id?: string;
        qid: string;
        row: number;
        col: 1 | 2 | 3;
        span: 12 | 8 | 6 | 4;
        question: Question;
        order?: number | null;
      }>;

    // Satisfy FormDef & items for FormRenderer
    const formObj: FormDef & { items: typeof items } = {
      id: 'preview',
      slug: 'preview',
      title: title || 'Untitled form',
      description: '',
      items,
    };
    return formObj;
  }, [preview, bank, title]);

  /* ---------- Render ---------- */

  const rows = computeRows(preview); // for rendering dividers

  return (
    <div className="container py-3">
      {/* Row divider styles */}
      <style jsx global>{`
        .ff-row-divider {
          height: 14px;
          margin: 8px 0;
          border-top: 2px dotted transparent;
          background: transparent;
          transition: all .18s ease-in-out;
        }
        .ff-row-divider.ff-over {
          border-top-color: #0d6efd;
          background: rgba(13, 110, 253, 0.08);
          opacity: 1;
          transform: scaleY(1.2);
        }
      `}</style>

      {/* Header + Mode toggle */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2 mb-3">
        <div className="d-flex align-items-center gap-2">
          <h1 className="h4 mb-0">{slug ? 'Edit Form' : 'Create Form'}</h1>
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
          <button className="btn btn-success btn-sm" onClick={handleSave}>Save</button>
        </div>
      </div>

      {mode === 'build' ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
          onDragEnd={onDragEnd}
        >
          <div className="row g-3">
            {/* Bank */}
            <div className="col-12 col-md-5 col-lg-4">
              <div className="card h-100">
                <div className="card-header bg-white">
                  <div className="input-group">
                    <span className="input-group-text">Search</span>
                    <input
                      className="form-control"
                      placeholder="Questions…"
                      value={q}
                      onChange={e => setQ(e.target.value)}
                    />
                  </div>
                </div>
                <div className="card-body">
                  <Droppable id={BANK_ID}>
                    {loading && <div className="text-muted small">Loading…</div>}
                    {!loading && filtered.length === 0 && <div className="text-muted small">No questions.</div>}
                    <ul className="list-group">
                      {filtered.map(item => (
                        <li key={item.id} className="list-group-item p-2">
                          <DraggableBank id={item.id}>
                            <div className="d-flex align-items-center justify-content-between">
                              <div>
                                <div className="fw-semibold">{item.label}</div>
                                <small className="text-muted">{item.type}{/* could add required flag */}</small>
                              </div>
                            </div>
                          </DraggableBank>
                        </li>
                      ))}
                    </ul>
                  </Droppable>
                </div>
              </div>
            </div>

            {/* Canvas */}
            <div className="col-12 col-md-7 col-lg-8">
              <div className="card h-100">
                <div className="card-header bg-white d-flex justify-content-between align-items-center">
                  <span className="fw-semibold">A4 Preview (grid)</span>
                  <small className="text-muted">Drop here • Reorder • Change widths</small>
                </div>
                <div className="card-body">
                  <Droppable id={PREVIEW_ID}>
                    <SortableContext items={previewIds} strategy={rectSortingStrategy}>
                      {/* Divider before first row */}
                      <RowDivider id={dividerId(0)} />

                      {/* Render rows with divider after each */}
                      {rows.map((r, rIndex) => (
                        <div key={`row-${rIndex}`} className="mb-2">
                          <div className="row g-3">
                            {preview.slice(r.start, r.end + 1).map(pi => {
                              const qn = getQuestion(pi.qid); if (!qn) return null;
                              const col = widthToCols(pi.width);
                              return (
                                <div key={pi.id} className={`col-12 col-md-${col}`} data-preview-id={pi.id}>
                                  <SortablePreview id={pi.id}>
                                    <PreviewCard
                                      q={qn}
                                      width={pi.width}
                                      onSetWidth={(w) => {
                                        setPreview(p => p.map(x => x.id === pi.id ? { ...x, width: w } : x));
                                      }}
                                      onDelete={() => setPreview(p => p.filter(x => x.id !== pi.id))}
                                    />
                                  </SortablePreview>
                                </div>
                              );
                            })}
                          </div>

                          {/* Divider after this row */}
                          <RowDivider id={dividerId(rIndex + 1)} />
                        </div>
                      ))}

                      {preview.length === 0 && (
                        <div className="text-muted text-center py-3">Drop questions here</div>
                      )}
                    </SortableContext>
                  </Droppable>
                </div>
              </div>
            </div>
          </div>

          <DragOverlay>
            {activeId ? <div className="p-2 bg-white border rounded small">{renderGhostLabel(activeId, bank, preview)}</div> : null}
          </DragOverlay>
        </DndContext>
      ) : (
        // --------- Preview Mode (read-only via FormRenderer) ----------
        <div className="card shadow-sm">
          <div className="card-body">
            {preview.length === 0 ? (
              <div className="text-muted">Nothing to preview.</div>
            ) : (
              <FormRenderer form={previewForm} mode="preview" />
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
  return <div ref={setNodeRef} data-droppable-id={id} id={id}>{children}</div>;
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

/* ---------- Row Divider (slim droppable bar) ---------- */

function RowDivider({ id }: { id: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      id={id}
      className={`ff-row-divider ${isOver ? 'ff-over' : ''}`}
      aria-label="Drop here to create a new row"
    />
  );
}

/* ---------- Overlay label ---------- */

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
