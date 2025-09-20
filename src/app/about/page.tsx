// src/app/about/page.tsx
import Link from 'next/link';

export const metadata = { title: 'About | Form Factory' };

export default function AboutPage() {
  return (
    <div className="container py-4">
      <div className="row align-items-center g-4">
        <div className="col-lg-8">
          <h1 className="display-5 fw-semibold mb-3">About Form Factory</h1>
          <p className="lead text-muted">
            Form Factory is a fast, no-bloat form builder focused on clarity and speed. We keep
            dependencies minimal and performance high so you can ship forms without friction.
          </p>

          <ul className="mt-4 mb-4">
            <li><strong>Question bank</strong> — pick from saved questions and reuse them in any form</li>
            <li><strong>Customizable layout</strong> — drag-drop with flexible, adjustable widths</li>
            <li><strong>Printable previews</strong> — clean A4-inspired preview and print-ready pages</li>
            <li>Lightweight and fast—no bloat, no distractions</li>
          </ul>

          <Link href="/admin" className="btn btn-primary">Open the Admin</Link>
        </div>

        <div className="col-lg-4">
          <div className="p-4 border rounded-3 bg-light">
            <h2 className="h5">Why Form Factory</h2>
            <ul className="mb-3 ps-3">
              <li><strong>Speed first</strong> — a lean bundle and simple UI keep everything snappy.</li>
              <li><strong>Clarity over clutter</strong> — the builder is obvious, the preview is clean.</li>
              <li><strong>Reusable by design</strong> — build once with a question bank, reuse everywhere.</li>
              <li><strong>Print-perfect</strong> — A4-inspired preview makes handing off responses easy.</li>
            </ul>

            <h3 className="h6 mt-3">What’s next</h3>
            <ul className="mb-0 ps-3">
              <li>Response review & printing</li>
              <li>Multi-step forms</li>
              <li>Save & continue later</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
