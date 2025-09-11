'use client';

import { useState } from 'react';
import { FormDef, Question } from '@/lib/types';

type Props = {
  form: FormDef;
  onSubmit?: (payload: Record<string, unknown>) => Promise<void> | void;
};

const DEFAULT_FILE_ACCEPT = '.jpg,.jpeg,.png,.pdf,.doc,.docx';
const DEFAULT_FILE_MAX_MB = 10;
const ALLOWED_EXTS = new Set(['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx']);

export default function FormRenderer({ form, onSubmit }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {};
    const newErrors: Record<string, string> = {};

    form.questions.forEach((q) => {
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

        // Validate each file: extension + size
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

        // Phase 1: store metadata only (real upload in Phase 2)
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
    // console.log(q);
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
              <option key={o.id} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        );
      case 'radio':
        return (
          <div>
            {q.options?.map((o) => (
              <div className="form-check" key={o.id}>
                <input
                  className={`form-check-input ${err ? 'is-invalid' : ''}`}
                  type="radio"
                  name={name}
                  id={`${name}_${o.id}`}
                  value={o.value}
                />
                <label
                  className="form-check-label"
                  htmlFor={`${name}_${o.id}`}
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
              <div className="form-check" key={o.id}>
                <input
                  className={`form-check-input ${err ? 'is-invalid' : ''}`}
                  type="checkbox"
                  name={name}
                  id={`${name}_${o.id}`}
                  value={o.value}
                />
                <label
                  className="form-check-label"
                  htmlFor={`${name}_${o.id}`}
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

      {form.questions.map((q) => (
        <div className="mb-3" key={q.id}>
          <label htmlFor={q.id} className="form-label">
            {q.label} {q.required ? <span className="text-danger">*</span> : null}
          </label>
          {renderField(q)}
          {q.helpText && <div className="form-text">{q.helpText}</div>}
          {errors[q.id] && (
            <div className="invalid-feedback d-block">{errors[q.id]}</div>
          )}
        </div>
      ))}

      <button className="btn btn-primary" type="submit" disabled={submitting}>
        {submitting ? 'Submitting…' : 'Submit'}
      </button>
    </form>
  );
}
