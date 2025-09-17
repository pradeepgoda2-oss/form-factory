'use client';

import type { Question } from './types';

export type WidthCode = 0 | 1 | 2 | 3; // 3->12, 2->8, 0->6, 1->4

export default function PreviewCard({
  q, width, onSetWidth, onDelete,
}: {
  q: Question;
  width: WidthCode;
  onSetWidth: (w: WidthCode) => void;
  onDelete: () => void;
}) {
  return (
    <div className="preview-card card-hover">
      {/* Delete button (top-left) */}
      <button
        type="button"
        className="btn btn-sm btn-outline-danger del-btn"
        aria-label="Remove question"
        onClick={onDelete}
        title="Remove"
      >
        <i className="bi bi-trash" aria-hidden="true" />
      </button>

      {/* Main content + right pills column */}
      <div className="grid">
        <div className="preview-main">
          <ControlPreview q={q} />
        </div>

        {/* Width pills (right column, never overlapping) */}
        <div className="ff-pills" aria-label="Choose width">
          <button type="button" className={`ff-pill ${width === 3 ? 'active' : ''}`} onClick={() => onSetWidth(3)} title="Full (12)">12</button>
          <button type="button" className={`ff-pill ${width === 2 ? 'active' : ''}`} onClick={() => onSetWidth(2)} title="8 columns">8</button>
          <button type="button" className={`ff-pill ${width === 0 ? 'active' : ''}`} onClick={() => onSetWidth(0)} title="6 columns">6</button>
          <button type="button" className={`ff-pill ${width === 1 ? 'active' : ''}`} onClick={() => onSetWidth(1)} title="4 columns">4</button>
        </div>
      </div>

      <style jsx>{`
        .preview-card {
          position: relative;
          background: #f8f9fa;
          border-radius: 8px;
          /* extra top padding so the top-left delete never touches labels */
          padding: 28px 16px 16px 16px; /* t r b l */
          min-height: 140px;
        }

        /* two-column layout: main content + thin pills column */
        .grid {
          display: grid;
          grid-template-columns: 1fr 44px; /* right column for pills */
          column-gap: 12px;
          align-items: start;
        }

        .preview-main {
          min-width: 0; /* prevent overflow in grid */
        }

        /* Pills live in their own column (no absolute positioning) */
        .ff-pills {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .ff-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 20px;
          font-size: 10px;
          border-radius: 6px;
          border: 1px solid #dee2e6;
          background: #fff;
          line-height: 1;
          padding: 0;
        }
        .ff-pill.active {
          background: #0d6efd;
          color: #fff;
          border-color: #0d6efd;
        }

        /* Delete top-left; show on hover/focus */
        .del-btn {
          position: absolute;
          bottom: 8px;
          left: 8px;
          visibility: hidden;
          opacity: 0;
          pointer-events: none;
          transition: opacity .12s ease-in-out, transform .12s ease-in-out;
          transform: translateY(-2px);
          z-index: 2;
          padding: 2px 6px;
        }
        .preview-card:hover .del-btn,
        .del-btn:focus {
          visibility: visible;
          opacity: 1;
          pointer-events: auto;
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}

function ControlPreview({ q }: { q: Question }) {
  const id = `ctrl_${q.id}`;
  const opts = q.options && q.options.length > 0
    ? q.options
    : [{ label: 'Option A', value: 'A' }, { label: 'Option B', value: 'B' }];

  const Help = q.helpText ? (
    <i className="bi bi-question-circle ms-1 text-muted" title={q.helpText ?? ''} aria-label="Help" role="img" />
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
