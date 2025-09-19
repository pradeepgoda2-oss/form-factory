import Link from "next/link";

export default function Footer() {
    return <footer className="border-top mt-4 pt-3 text-center text-muted small">
        <div className="mb-2">
            <Link href="/about" className="text-reset text-decoration-none me-3">About</Link>
            <Link href="/pricing" className="text-reset text-decoration-none me-3">Pricing</Link>
            <Link href="/contact" className="text-reset text-decoration-none">Contact</Link>
        </div>
        © {new Date().getFullYear()} Form Factory · Deep’s Software Solutions Ltd.
    </footer>
}