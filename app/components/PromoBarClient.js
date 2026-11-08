'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './chrome.css';

export default function PromoBarClient({ message, linkLabel }) {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/preview')) return null;
  // Clearing the message in admin hides the bar entirely.
  if (!message || !String(message).trim()) return null;

  return (
    <Link className="promo-bar" href="/contact">
      <span className="promo-bar-inner">
        <span className="promo-bar-text">{message}</span>
        {linkLabel && (
          <span className="promo-bar-link">
            <span className="promo-bar-link-label">{linkLabel}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        )}
      </span>
    </Link>
  );
}
