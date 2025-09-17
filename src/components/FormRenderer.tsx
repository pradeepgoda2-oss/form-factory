'use client';

import { useMemo, useState } from 'react';
import { FormDef, Question } from '@/lib/types';

/* ============================
   Types
   ============================ */

type FormItem = {
  id?: string;
  qid: string;
  row: number;
  col: 1 | 2 | 3;
  span: 12 | 8 | 6 | 4;
  question: Question;    // joined question (required)
  order?: number | null;
};

type Props = {
  form: FormDef & { items: FormItem[] };
  /** fill = interactive; preview = disabled controls; review = Q&A view */
  mode?: 'fill' | 'preview' | 'review';
  /** For review: answers to display. Also used as initial values for fill/preview. */
  answers?: Record<string, unknown>;
  /** Called only in mode="fill" when validation passes */
  onSubmit?: (payload: Record<string, unknown>) => Promise<void> | void;
  /** Show help text under fields (default: true) */
  showHelp?: boolean;
};

/* ============================
   Constants
   ============================ */

const DEFAULT_FILE_ACCEPT = '.jpg,.jpeg,.png,.pdf,.doc,.docx';
const DEFAULT_FILE_MAX_MB = 10;
const ALLOWED_EXTS = new Set(['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx']);

/* ============================
   Component
   ============================ */

export default function FormRenderer({
  form,
  mode = 'fill',
  answers,
  onSubmit,
  showHelp = true,
}: Props) {
  const readOnly = mode === 'preview';
  const review = mode === 'review';

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Build layout rows from items (group by row, then sort by col, order)
  const rows = useMemo(() => {
    const byRow = new Map<number, FormItem[]>();
    form.items?.forEach(it => {
      const arr = byRow.get(it.row) ?? [];
      arr.push(it);
      byRow.set(it.row, arr);
    });
    return [...byRow.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, arr]) =>
        arr.sort((a, b) => a.col - b.col || (a.order ?? 0) - (b.order ?? 0))
      );
  }, [form.items]);

  // Unique questions used (validation + payload keys remain by question.id)
  const usedQuestions: Question[] = useMemo(() => {
    const seen = new Set<string>();
    const out: Question[] = [];
    rows.flat().forEach(it => {
      const q = it.question;
      if (q && !seen.has(q.id)) {
        seen.add(q.id);
        out.push(q);
      }
    });
    return out;
  }, [rows]);

  /* ---------- Submit (fill mode only) ---------- */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (readOnly || review) return; // block in preview/review

    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {};
    const newErrors: Record<string, string> = {};

    usedQuestions.forEach((q) => {
      const name = q.id;

      if (q.type === 'checkbox') {
        const values = fd.getAll(name).map(String);
        if (q.required && values.length === 0) newErrors[name] = 'Required';
        payload[name] = values;
        return;
      }

      if (q.type === 'file') {
        const files = fd.getAll(name) as File[];
        if (q.required && files.length === 0) {
          newErrors[name] = 'Required';
        } else if (files.length > 0) {
          const maxBytes = DEFAULT_FILE_MAX_MB * 1024 * 1024;
          for (const f of files) {
            const ext = (f.name.split('.').pop() || '').toLowerCase();
            if (!ALLOWED_EXTS.has(ext)) {
              newErrors[name] = `Only ${DEFAULT_FILE_ACCEPT} allowed`;
              break;
            }
            if (f.size > maxBytes) {
              newErrors[name] = `Each file must be ≤ ${DEFAULT_FILE_MAX_MB} MB`;
              break;
            }
          }
        }

        // Phase 1: metadata only; real upload pipeline later
        payload[name] = files.map((f) => ({
          name: f.name,
          size: f.size,
          type: f.type,
        }));
        return;
      }

      // Default single-value fields
      const val = fd.get(name)?.toString() ?? '';
      if (q.required && !val) newErrors[name] = 'Required';
      payload[name] = val;
    });

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        await fetch('/api/responses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ formId: form.id, answers: payload }),
        });
        alert('Submitted!');
      }
      (e.target as HTMLFormElement).reset();
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- Helpers ---------- */

  // map stored values to option labels for radio/select/checkbox
  function valuesToLabels(q: Question, v: unknown): string {
    const opts = q.options ?? [];
    if (q.type === 'checkbox') {
      const arr = Array.isArray(v) ? v : [];
      const labels = arr
        .map(val => opts.find(o => o.value === String(val))?.label)
        .filter(Boolean) as string[];
      return labels.length ? labels.join(', ') : '—';
    }
    if (q.type === 'radio' || q.type === 'select') {
      const s = v == null ? '' : String(v);
      const label = opts.find(o => o.value === s)?.label;
      return label || (s || '—');
    }
    if (q.type === 'file') {
      const files = Array.isArray(v) ? v as any[] : [];
      if (!files.length) return '—';
      return files.map((f: any) => f?.name ?? '[file]').join(', ');
    }
    // text/number/date/textarea
    const s = v == null ? '' : String(v);
    return s || '—';
  }

  const roAttrs = readOnly ? { disabled: true, 'aria-disabled': true } : {};

  // Initial values for fill/preview (unchecked if none)
  function hasInitial(name: string, value?: string) {
    if (!answers) return false;
    const v = answers[name];
    if (Array.isArray(v)) return value ? v.includes(value) : v.length > 0;
    return value ? String(v) === value : !!v;
  }

  /* ---------- Field renderers ---------- */

  function renderField(q: Question) {
    const name = q.id;
    const err = errors[name];
    const baseCls = q.type === 'select' ? 'form-select' : 'form-control';

    if (review) {
      const display = valuesToLabels(q, answers?.[name]);
      return (
        <div className="ff-review-answer">
          <span className="text-body">{display}</span>
        </div>
      );
    }

    switch (q.type) {
      case 'text':
      case 'number':
      case 'date':
        return (
          <input
            type={q.type}
            name={name}
            id={name}
            className={`${baseCls} ${err ? 'is-invalid' : ''}`}
            defaultValue={typeof answers?.[name] === 'string' || typeof answers?.[name] === 'number' ? String(answers?.[name]) : ''}
            {...roAttrs}
          />
        );

      case 'textarea':
        return (
          <textarea
            rows={4}
            name={name}
            id={name}
            className={`${baseCls} ${err ? 'is-invalid' : ''}`}
            defaultValue={typeof answers?.[name] === 'string' ? String(answers?.[name]) : ''}
            {...roAttrs}
          />
        );

      case 'select':
        return (
          <select
            className={`${baseCls} ${err ? 'is-invalid' : ''}`}
            name={name}
            id={name}
            defaultValue={typeof answers?.[name] === 'string' ? String(answers?.[name]) : ''}
            {...roAttrs}
          >
            <option value="">Select…</option>
            {q.options?.map((o) => (
              <option key={`${o.id ?? o.value}`} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div>
            {q.options?.map((o) => (
              <div className="form-check" key={`${o.id ?? o.value}`}>
                <input
                  className={`form-check-input ${err ? 'is-invalid' : ''}`}
                  type="radio"
                  name={name}
                  id={`${name}_${o.id ?? o.value}`}
                  value={o.value}
                  defaultChecked={hasInitial(name, o.value)}
                  {...roAttrs}
                />
                <label className="form-check-label" htmlFor={`${name}_${o.id ?? o.value}`}>
                  {o.label}
                </label>
              </div>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <div>
            {q.options?.map((o) => (
              <div className="form-check" key={`${o.id ?? o.value}`}>
                <input
                  className={`form-check-input ${err ? 'is-invalid' : ''}`}
                  type="checkbox"
                  name={name}
                  id={`${name}_${o.id ?? o.value}`}
                  value={o.value}
                  defaultChecked={hasInitial(name, o.value)}
                  {...roAttrs}
                />
                <label className="form-check-label" htmlFor={`${name}_${o.id ?? o.value}`}>
                  {o.label}
                </label>
              </div>
            ))}
          </div>
        );

      case 'file': {
        const errCls = err ? 'is-invalid' : '';
        return (
          <input
            type="file"
            name={name}
            id={name}
            className={`form-control ${errCls}`}
            accept={DEFAULT_FILE_ACCEPT}
            multiple={!!q.fileMultiple}
            {...roAttrs}
          />
        );
      }

      default:
        return (
          <input
            type="text"
            name={name}
            id={name}
            className={`${baseCls} ${err ? 'is-invalid' : ''}`}
            {...roAttrs}
          />
        );
    }
  }

  /* ---------- Render ---------- */

  return (
    <form className="card p-4 shadow border-0" onSubmit={handleSubmit}>
      <h2 className="h4 mb-1">{form.title}</h2>
      {form.description && (
        <p className="text-secondary mb-4">{form.description}</p>
      )}

      {/* Render rows and spans strictly from form.items */}
      {rows.map((rowItems, rIdx) => (
        <div className="row g-3" key={`row_${rIdx}`}>
          {rowItems.map((it, cIdx) => {
            const q = it.question;
            const span = it.span;
            const colCls = `col-12 col-md-${span}`;
            const err = errors[q.id];

            const Help = q.helpText ? (
              <div className="form-text">{q.helpText}</div>
            ) : null;

            return (
              <div className={colCls} key={`${it.qid}_${rIdx}_${cIdx}`}>
                <div className="mb-3">
                  <label htmlFor={q.id} className="form-label">
                    {q.label}{' '}
                    {q.required ? <span className="text-danger">*</span> : null}
                  </label>

                  {renderField(q)}

                  {showHelp && !review && Help}
                  {!review && err && (
                    <div className="invalid-feedback d-block">{err}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* Footer actions */}
      {mode === 'fill' ? (
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
      ) : mode === 'preview' ? (
        <button className="btn btn-secondary" type="button" disabled>
          Preview
        </button>
      ) : null}
    </form>
  );
}
