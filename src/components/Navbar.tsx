'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useState } from 'react';

function InlineLogo({ className = 'me-2' }) {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" className={className}>
      <rect width="32" height="32" rx="6" fill="var(--bs-primary, #2E7D7F)"/>
      <path d="M8 10h16v3H8v-3zm0 6h12v3H8v-3zm0 6h8v3H8v-3z" fill="#fff"/>
    </svg>
  );
}

function ActiveLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
  return (
    <Link
      className={`nav-link px-3 py-2 position-relative ${active ? 'active text-dark' : 'text-body'}`}
      href={href}
    >
      {children}
      {active && <span className="ff-nav-underline" />}
    </Link>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  // === Full previous navbar on /admin routes ===
  if (isAdmin) {
    return (
      <nav className="navbar navbar-light navbar-expand-lg bg-white border-bottom shadow-sm sticky-top">
        <div className="container">
          <Link className="navbar-brand fw-bold d-flex align-items-center" href="/">
            <InlineLogo />
            Form Factory
          </Link>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#mainNav"
            aria-controls="mainNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
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
    );
  }

  // === Minimal public navbar everywhere else (incl. /) ===
  return (
    <nav className="navbar navbar-light bg-white border-bottom shadow-sm">
      <div className="container d-flex justify-content-between align-items-center">
        <Link href="/" className="navbar-brand d-flex align-items-center">
          <InlineLogo />
          <span className="fw-bold">Form Factory</span>
        </Link>
        <div className="d-flex align-items-center">
          <ActiveLink href="/about">About</ActiveLink>
          <ActiveLink href="/pricing">Pricing</ActiveLink>
          <ActiveLink href="/contact">Contact</ActiveLink>
          <Link href="/login" className="btn btn-link text-decoration-none ms-2 me-2">Login</Link>
          <Link href="/signup" className="btn btn-primary">Sign up</Link>
        </div>
      </div>
    </nav>
  );
}
