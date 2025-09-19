
export const metadata = { title: 'About | Form Factory' };


export default function AboutPage() {
    return (<>
        <div className="container py-4">
            <div className="row align-items-center g-4">
                <div className="col-lg-8">
                    <h1 className="display-5 fw-semibold mb-3">About Form Factory</h1>
                    <p className="lead text-muted">
                        Form Factory is a fast, no‑bloat form builder focused on clarity and speed. We keep
                        dependencies minimal and performance high so you can ship forms without friction.
                    </p>
                    <ul className="mt-4 mb-4">
                        <li>Drag-drop builder with flexible, customizable widths</li>
                        <li>Clean A4-inspired preview and print modes</li>
                        <li>Lightweight and fast—no bloat, no distractions</li>
                        <li>Built for clarity and ease—ship polished forms in minutes</li>
                    </ul>

                    <a href="/admin" className="btn btn-primary">Open the Admin</a>
                </div>
                <div className="col-lg-4">
                    <div className="p-4 border rounded-3 bg-light">
                        <h2 className="h5">Why Form Factory</h2>
                        <p className="mb-2">Fast, simple, and affordable—build and share clean, professional forms without the bloat.</p>
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
    </>
    );
}