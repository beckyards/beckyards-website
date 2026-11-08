'use client';

import { useEffect, useState } from 'react';

// Sticky "on this page" list for the terms. Highlights the section being read
// and, below 900px, collapses behind a toggle (the CSS ignores `open` above that).
export default function TermsToc({ label, items }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const targets = items.map((i) => document.getElementById(i.id)).filter(Boolean);
    if (!targets.length || !('IntersectionObserver' in window)) return;

    // A section counts as "current" while it crosses a band near the top of the viewport.
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((e) => e.isIntersecting);
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav className={`terms-toc${open ? ' is-open' : ''}`} aria-label={label}>
      <button
        type="button"
        className="terms-toc-toggle"
        aria-expanded={open}
        aria-controls="terms-toc-list"
        onClick={() => setOpen(!open)}
      >
        {label}
        <svg className="icon terms-toc-chevron" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <p className="terms-toc-label">{label}</p>
      <ol className="terms-toc-list" id="terms-toc-list">
        {items.map((item, i) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={active === item.id ? 'is-active' : undefined}
              aria-current={active === item.id ? 'location' : undefined}
              onClick={() => setOpen(false)}
            >
              <span className="terms-toc-num">{String(i + 1).padStart(2, '0')}</span>
              {item.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
