'use client';
import Footer from '@/components/Footer';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="container py-4">
      <h1 className="display-5 fw-semibold mb-3 text-center">Form Factory</h1>

      {/* Hero / CTA — gap trimmed ~15px from original */}
      <div className="text-center" style={{ marginBottom: '42px' }}>
        <p className="lead mb-3 text-secondary">
          Build, customize, and manage dynamic forms effortlessly with a modern, polished UI.
        </p>
        <div className="d-flex justify-content-center gap-3">
          <Link href="/admin/forms/new" className="btn btn-primary btn-lg px-5">
            Get Started <i className="bi bi-arrow-right-short ms-1" />
          </Link>
          <Link href="/pricing" className="btn btn-outline-secondary btn-lg px-5">
            Learn More
          </Link>
        </div>
      </div>

      {/* Feature Cards */}
      <section className="row g-3">
        <div className="col-md-4">
          <div className="card h-100 shadow-sm border-0 bg-ff-tint text-center p-3">
            <i className="bi bi-ui-checks fs-2 text-primary mb-2" />
            <h6 className="fw-semibold mb-1">Form Builder</h6>
            <p className="text-secondary mb-0">
              Drag, arrange, and preview questions with a clean, modern UI.
            </p>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card h-100 shadow-sm border-0 bg-ff-tint text-center p-3">
            <i className="bi bi-sliders2 fs-2 text-primary mb-2" />
            <h6 className="fw-semibold mb-1">Customizable</h6>
            <p className="text-secondary mb-0">
              Control widths with pills, reorder easily, and fine-tune layout.
            </p>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card h-100 shadow-sm border-0 bg-ff-tint text-center p-3">
            <i className="bi bi-bar-chart fs-2 text-primary mb-2" />
            <h6 className="fw-semibold mb-1">Responses</h6>
            <p className="text-secondary mb-0">
              Collect, review, and print responses with polished previews.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
