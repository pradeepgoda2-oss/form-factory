'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type FormRow = {
  id: string;
  slug: string;
  title: string;
  sortOrder: number;
  createdAt: string;
};

export default function AdminFormsPage() {
  const [rows, setRows] = useState<FormRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/forms', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load forms');
      const data = await res.json();
      setRows(data);
    } catch (e: any) {
      setErr(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onDelete = async (slug: string) => {
    if (!confirm('Delete this form? This cannot be undone.')) return;
    setDeleting(slug);
    try {
      const res = await fetch(`/api/forms/${slug}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to delete');
      }
      setRows(prev => prev.filter(r => r.slug !== slug));
    } catch (e: any) {
      alert(e.message || 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h4 mb-0">Forms </h1>
        <Link href="/admin/forms/new" className="btn btn-primary">+ Add New Form</Link>
      </div>

      {err && <div className="alert alert-danger">{err}</div>}

      <div className="card shadow border-0">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th style={{ width: 120 }}>Sort Order</th>
                <th>Form Name</th>
                <th style={{ width: 200 }}>Created</th>
                <th style={{ width: 160 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-4">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-4 text-muted">No forms yet</td></tr>
              ) : (
                rows.map(r => (
                  <tr key={r.id}>
                    <td>{r.sortOrder}</td>
                    <td>
                      <Link href={`/forms/${r.slug}`} className="text-decoration-none">
                        {r.title}
                      </Link>
                    </td>
                    <td>{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="d-flex gap-2">
                      <Link href={`/admin/forms/${r.slug}`} className="btn btn-sm btn-outline-primary">
                        Edit
                      </Link>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => onDelete(r.slug)}
                        disabled={deleting === r.slug}
                      >
                        {deleting === r.slug ? 'Deleting…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
