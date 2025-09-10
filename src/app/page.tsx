export default function Home() {
  return (
    <main className="container py-5">
      <h1 className="display-5 fw-semibold mb-4 text-center" style={{ color: 'var(--bs-primary)' }}>
        Form Factory
      </h1>

      <div className="card p-5 shadow text-center">
        <p className="lead mb-4 text-secondary">
          Build, customize, and manage dynamic forms effortlessly with a modern, polished UI.
        </p>
        <div className="d-flex justify-content-center gap-3">
          <a className="btn btn-primary btn-lg px-5" href="/api/users">
            Get Started
          </a>
          <button className="btn btn-secondary btn-lg px-5">
            Learn More
          </button>
        </div>
      </div>
    </main>
  );
}
