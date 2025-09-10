'use client';

import { useState } from 'react';
import { FormDef, Question } from '@/lib/types';

type Props = {
  form: FormDef;
  onSubmit?: (payload: Record<string, unknown>) => Promise<void> | void;
};

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
      } else {
        const val = fd.get(name)?.toString() ?? '';
        if (q.required && !val) newErrors[name] = 'Required';
        payload[name] = val;
      }
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
    const name = q.id;
    const err = errors[name];
    const common = { name, id: name, className: `form-control ${err ? 'is-invalid' : ''}` };

    switch (q.type) {
      case 'text':
      case 'number':
      case 'date':
        return <input type={q.type} {...common} />;
      case 'textarea':
        return <textarea rows={4} {...common} />;
      case 'select':
        return (
          <select className={`form-select ${err ? 'is-invalid' : ''}`} name={name} id={name}>
            <option value="">Select…</option>
            {q.options?.map((o) => (
              <option key={o.id} value={o.value}>{o.label}</option>
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
                <label className="form-check-label" htmlFor={`${name}_${o.id}`}>{o.label}</label>
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
                <label className="form-check-label" htmlFor={`${name}_${o.id}`}>{o.label}</label>
              </div>
            ))}
          </div>
        );
      default:
        return <input type="text" {...common} />;
    }
  };

  return (
    <form className="card p-4 shadow border-0" onSubmit={handleSubmit}>
      <h2 className="h4 mb-1">{form.title}</h2>
      {form.description && <p className="text-secondary mb-4">{form.description}</p>}

      {form.questions.map((q) => (
        <div className="mb-3" key={q.id}>
          <label htmlFor={q.id} className="form-label">
            {q.label} {q.required ? <span className="text-danger">*</span> : null}
          </label>
          {renderField(q)}
          {q.helpText && <div className="form-text">{q.helpText}</div>}
          {errors[q.id] && <div className="invalid-feedback d-block">{errors[q.id]}</div>}
        </div>
      ))}

      <button className="btn btn-primary" type="submit" disabled={submitting}>
        {submitting ? 'Submitting…' : 'Submit'}
      </button>
    </form>
  );
}
