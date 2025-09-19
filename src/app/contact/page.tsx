'use client';

import { useState } from 'react';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to send');
      setNote('Thanks! We got your message and will get back to you.');
      setName(''); setEmail(''); setPhone(''); setMessage('');
    } catch (err: any) {
      setNote(err.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (<>
    <div className="d-flex flex-column min-vh-100">
    <main className="flex-grow-1">
      <div className="container py-4" style={{ maxWidth: 820 }}>
      <h1 className="display-5 fw-semibold mb-2">Contact</h1>
      <p className="lead text-muted">Please drop your details and message — we’ll reach out.</p>

      {note && (
        <div className={`alert ${note.startsWith('Thanks!') ? 'alert-success' : 'alert-warning'} mt-3`} role="alert">
          {note}
        </div>
      )}

      <form className="mt-3" onSubmit={onSubmit} noValidate>
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Name</label>
            <input className="form-control" required minLength={2}
                   value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="col-md-6">
            <label className="form-label">Email</label>
            <input type="email" className="form-control" required
                   value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="col-12">
            <label className="form-label">Phone</label>
            <input className="form-control" placeholder="Optional"
                   value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="col-12">
            <label className="form-label">How can we help?</label>
            <textarea className="form-control" rows={5} required minLength={10}
                      value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
        </div>

        <button className="btn btn-primary mt-4 float-end" type="submit" disabled={busy}>
          {busy ? 'Sending…' : 'Send message'}
        </button>
      </form>
    </div>
    </main>
    
  </div>
    </>
  );
}
