
export default function PricingPage() {
return (<>
<div className="container py-4">
<div className="text-center mb-4">
<h1 className="display-5 fw-semibold">Pricing</h1>
<p className="lead text-muted">We’re preparing friendly pricing templates. For now, enjoy the</p>
<div className="d-inline-flex align-items-center gap-2">
<span className="badge text-bg-success">Free Beta</span>
<span className="text-muted">— unlimited testing while we stabilize MVP.</span>
</div>
</div>


<div className="row g-4 justify-content-center mt-2">
<div className="col-md-5">
<div className="card shadow-sm h-100">
<div className="card-body">
<h2 className="h5">Beta perks</h2>
<ul className="mb-0 ps-3">
<li>No credit card required</li>
<li>Unlimited forms in beta</li>
<li>Core builder + preview + print</li>
</ul>
</div>
</div>
</div>
<div className="col-md-5">
<div className="card shadow-sm h-100">
<div className="card-body">
<h2 className="h5">Coming soon</h2>
<ul className="mb-0 ps-3">
<li>Transparent pricing tiers</li>
<li>Team/role options</li>
<li>Fair usage limits</li>
</ul>
</div>
</div>
</div>
</div>


<div className="text-center mt-4">
<a href="/admin/forms" className="btn btn-primary btn-lg">Start building—free</a>
</div>
</div>
</>
);
}