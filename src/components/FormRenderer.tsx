'use client';

import { useMemo, useState } from 'react';
import { FormDef, Question } from '@/lib/types';

type Props = {
  form: FormDef & {
    items: Array<{
      id?: string;                 // optional placement id
      qid: string;                 // Question id
      row: number;
      col: 1 | 2 | 3;
      span: 12 | 8 | 6 | 4;        // bootstrap 12-grid sizing
      question: Question;          // joined question (required)
      order?: number | null;
    }>;
  };
  onSubmit?: (payload: Record<string, unknown>) => Promise<void> | void;
};

const DEFAULT_FILE_ACCEPT = '.jpg,.jpeg,.png,.pdf,.doc,.docx';
const DEFAULT_FILE_MAX_MB = 10;
const ALLOWED_EXTS = new Set(['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx']);

export default function FormRenderer({ form, onSubmit }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  console.log('form', form);
  // Build layout rows from items (group by row, then sort by col,order)
  const rows = useMemo(() => {
    const byRow = new Map<number, Props['form']['items']>();
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
          return;
        }

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

  const renderField = (q: Question) => {
    console.log('question', q);
    const name = q.id;
    const err = errors[name];
    const common = {
      name,
      id: name,
      className: `form-control ${err ? 'is-invalid' : ''}`,
    };

    switch (q.type) {
      case 'text':
      case 'number':
      case 'date':
        return <input type={q.type} {...common} />;
      case 'textarea':
        return <textarea rows={4} {...common} />;
      case 'select':
        return (
          <select
            className={`form-select ${err ? 'is-invalid' : ''}`}
            name={name}
            id={name}
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
                />
                <label
                  className="form-check-label"
                  htmlFor={`${name}_${o.id ?? o.value}`}
                >
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
                />
                <label
                  className="form-check-label"
                  htmlFor={`${name}_${o.id ?? o.value}`}
                >
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
          />
        );
      }
      default:
        return <input type="text" {...common} />;
    }
  };

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
            return (
              <div className={colCls} key={`${it.qid}_${rIdx}_${cIdx}`}>
                <div className="mb-3">
                  <label htmlFor={q.id} className="form-label">
                    {q.label}{' '}
                    {q.required ? <span className="text-danger">*</span> : null}
                  </label>
                  {renderField(q)}
                  {q.helpText && <div className="form-text">{q.helpText}</div>}
                  {errors[q.id] && (
                    <div className="invalid-feedback d-block">
                      {errors[q.id]}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      <button className="btn btn-primary" type="submit" disabled={submitting}>
        {submitting ? 'Submitting…' : 'Submit'}
      </button>
    </form>
  );
}
