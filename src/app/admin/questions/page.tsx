'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type QuestionType = 'text' | 'textarea' | 'radio' | 'checkbox' | 'select' | 'number' | 'date';
type Option = { id: string; label: string; value: string };
type Question = {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  helpText?: string | null;
  options: Option[];
  createdAt: string;
};

const TYPES: QuestionType[] = ['text','textarea','radio','checkbox','select','number','date'];

export default function QuestionBankPage() {
  // list
  const [items, setItems] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');

  // modal state (create/edit)
  const [editId, setEditId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [type, setType] = useState<QuestionType>('text');
  const [required, setRequired] = useState(false);
  const [helpText, setHelpText] = useState('');
  const [optionsInput, setOptionsInput] = useState('');
  const [saving, setSaving] = useState(false);

  // modal open/close helpers
  const openBtnRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const needsOptions = useMemo(() => ['radio','checkbox','select'].includes(type), [type]);
  const filtered = useMemo(
    () => items.filter(i => i.label.toLowerCase().includes(q.toLowerCase())),
    [items, q]
  );

  async function load() {
    setLoading(true); setErr(null);
    try {
      const res = await fetch('/api/questions');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setItems(data);
    } catch {
      setErr('Failed to load questions');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const resetModal = () => {
    setEditId(null);
    setLabel('');
    setType('text');
    setRequired(false);
    setHelpText('');
    setOptionsInput('');
    setSaving(false);
    setErr(null);
  };
  const openCreateModal = () => { resetModal(); openBtnRef.current?.click(); };
  const openEditModal = (row: Question) => {
    setEditId(row.id);
    setLabel(row.label);
    setType(row.type);
    setRequired(row.required);
    setHelpText(row.helpText || '');
    setOptionsInput(row.options?.map(o => o.label).join(', ') || '');
    openBtnRef.current?.click();
  };

  const onDelete = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    setErr(null);
    try {
      const res = await fetch(`/api/questions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      await load();
    } catch (e: any) {
      setErr(e.message || 'Failed to delete');
    }
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setErr(null);
    try {
      const body: any = { label, type, required, helpText };
      if (needsOptions) body.options = optionsInput.split(',').map(s => s.trim()).filter(Boolean);

      const res = await fetch(editId ? `/api/questions/${editId}` : '/api/questions', {
        method: editId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        throw new Error(msg?.error || 'Failed to save');
      }
      await load();
      closeBtnRef.current?.click();
      resetModal();
    } catch (e: any) {
      setErr(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => { if (!needsOptions) setOptionsInput(''); }, [needsOptions]);

  const listEmpty = !loading && !filtered.length && !err;

  return (
    <main className="container py-4">
      {/* Page title + ribbon + action */}
      {/* Title row (no button here) */}
<div className="d-flex align-items-start align-items-md-center flex-column flex-md-row mb-2">
  <div>
    <h1 className="ff-page-title">Question Bank</h1>
  </div>
</div>

{/* Toolbar: search + add button aligned */}
<div className="d-flex flex-column flex-md-row align-items-center gap-2 mb-3">
<input
  className="form-control form-control-sm bg-white flex-grow-1"
  placeholder="Search questions..."
  value={q}
  onChange={(e) => setQ(e.target.value)}
  style={{ height: 40 }}
/>
  <button
    className="btn btn-sm btn-primary d-inline-flex align-items-center text-nowrap px-3"
    onClick={openCreateModal}
    style={{ height: 40 }}
  >
    <span className="me-2">＋</span>
    Add New Question
  </button>
</div>
      {/* Desktop: true grid look (bordered, striped, hover) */}
      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {loading ? (
            <div className="p-4 text-secondary">Loading…</div>
          ) : err ? (
            <div className="p-4 alert alert-danger mb-0">{err}</div>
          ) : listEmpty ? (
            <div className="p-4 text-secondary">No questions yet.</div>
          ) : (
            <>
              <div className="d-none d-md-block">
                <div className="table-responsive">
                  <table className="table table-bordered table-striped table-hover mb-0 align-middle gridy">
                    <thead className="table-light">
                      <tr>
                        <th style={{width: '34%'}}>Label</th>
                        <th style={{width: '12%'}}>Type</th>
                        <th style={{width: '12%'}}>Required</th>
                        <th>Options</th>
                        <th style={{width: 160}}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(row => (
                        <tr key={row.id}>
                          <td className="fw-medium">{row.label}</td>
                          <td><span className="badge badge-soft">{row.type}</span></td>
                          <td>{row.required ? 'Yes' : 'No'}</td>
                          <td className="small col-options" title={row.options?.map(o=>o.label).join(', ') || ''}>
                            {row.options?.length ? row.options.map(o => o.label).join(', ') : <span className="text-secondary">—</span>}
                          </td>
                          <td className="text-end">
                            <div className="btn-group">
                              <button className="btn btn-sm btn-outline-secondary" onClick={() => openEditModal(row)}>Edit</button>
                              <button className="btn btn-sm btn-outline-danger" onClick={() => onDelete(row.id)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile: stacked cards for readability */}
              <div className="d-md-none p-3">
                {filtered.map(row => (
                  <div className="card border-0 shadow-sm mb-3" key={row.id}>
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="fw-semibold">{row.label}</div>
                        <span className="badge text-bg-light text-uppercase">{row.type}</span>
                      </div>
                      <div className="small text-secondary mt-1">Required: {row.required ? 'Yes' : 'No'}</div>
                      {row.options?.length ? (
                        <div className="small mt-2"><strong>Options:</strong> {row.options.map(o => o.label).join(', ')}</div>
                      ) : null}
                      <div className="mt-3 d-flex justify-content-end gap-2">
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => openEditModal(row)}>Edit</button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => onDelete(row.id)}>Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal (Create / Edit) */}
      <div className="modal fade" id="questionModal" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-lg modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title h5 mb-0">{editId ? 'Edit Question' : 'Add a new question'}</h2>
              <button
                ref={closeBtnRef}
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              />
            </div>

            <form onSubmit={onSave}>
              <div className="modal-body">
                {err && <div className="alert alert-danger">{err}</div>}

                <div className="mb-3">
                  <label className="form-label">Label</label>
                  <input
                    className="form-control"
                    value={label}
                    onChange={e => setLabel(e.target.value)}
                    required
                    placeholder="e.g. First Name"
                  />
                </div>

                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label">Type</label>
                    <select className="form-select" value={type} onChange={e => setType(e.target.value as QuestionType)}>
                      {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="col-12 col-md-6 d-flex align-items-end">
                    <div className="form-check">
                      <input id="q_required" className="form-check-input" type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} />
                      <label htmlFor="q_required" className="form-check-label ms-1">Required</label>
                    </div>
                  </div>
                </div>

                <div className="mb-3 mt-3">
                  <label className="form-label">Help text (optional)</label>
                  <input className="form-control" value={helpText} onChange={e => setHelpText(e.target.value)} placeholder="Shown below the field" />
                </div>

                {needsOptions && (
                  <div className="mb-3">
                    <label className="form-label">Options (comma-separated)</label>
                    <input className="form-control" placeholder="e.g. Yes, No, Maybe" value={optionsInput} onChange={e => setOptionsInput(e.target.value)} />
                    <div className="form-text">Used for <code>radio</code>, <code>checkbox</code>, and <code>select</code> types.</div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : (editId ? 'Save changes' : 'Create question')}
                </button>
              </div>
            </form>

          </div>
        </div>
      </div>
    </main>
  );
}
