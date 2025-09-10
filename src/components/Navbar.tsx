'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

function ActiveLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
  return (
    <Link
      className={`nav-link px-3 py-2 position-relative ${active ? 'active text-dark' : 'text-body'}`}
      href={href}
    >
      {children}
      {/* underline ribbon for active */}
      {active && <span className="ff-nav-underline" />}
    </Link>
  )
}

export default function Navbar() {
  return (
    <nav className="navbar navbar-expand-lg bg-white border-bottom shadow-sm sticky-top">
      <div className="container">
        <Link className="navbar-brand fw-bold" href="/">Form Factory</Link>

        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav">
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="mainNav">
          <ul className="navbar-nav ms-auto mb-2 mb-lg-0 ff-nav">
            <li className="nav-item"><ActiveLink href="/admin/questions">Question Bank</ActiveLink></li>
            <li className="nav-item ff-sep"><ActiveLink href="/admin/forms">Forms</ActiveLink></li>
            <li className="nav-item ff-sep"><ActiveLink href="/admin/responses">Responses</ActiveLink></li>
          </ul>
        </div>
      </div>
    </nav>
  )
}
