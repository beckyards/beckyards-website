'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SERVICES } from '../../lib/services';
import { PROGRAMS } from '../../lib/programs';
import './chrome.css';

// Header stays a client component with code-level service/program lists because
// the admin Visual editor (app/preview) imports it into a client tree, where an
// async server component cannot be used.
const NAV = [
  {
    id: 'services',
    label: 'Services',
    href: '/services',
    allLabel: 'All services',
    items: SERVICES.map((s) => ({ href: `/services/${s.slug}`, label: s.title })),
  },
  {
    id: 'programs',
    label: 'Programs',
    href: '/programs',
    allLabel: 'All programs',
    wide: true,
    items: PROGRAMS.map((p) => ({ href: `/programs/${p.slug}`, label: p.name, note: p.title })),
  },
  { id: 'about', label: 'About', href: '/about' },
  { id: 'portfolio', label: 'Portfolio', href: '/portfolio' },
  {
    id: 'contact',
    label: 'Contact',
    href: '/contact',
    match: ['/contact', '/aeration-signup', '/leaf-cleanup-signup'],
    right: true,
    wide: true,
    items: [
      { href: '/contact', label: 'Get a Quote', note: 'Free quotes through our contact form' },
      { href: '/leaf-cleanup-signup', label: 'Leaf Cleanup Signup', note: 'Fall cleanup, now booking' },
      { href: '/aeration-signup', label: 'Aeration Signup', note: 'Fall 2027, limited availability' },
    ],
  },
];

// Every page starts with a full-bleed hero (.page-hero, or the home page's own),
// so the header is transparent over it until scrolled. Checked against the DOM on mount.
const HERO_SELECTOR = '.page-hero, .home-hero, [data-hero]';
// The bottom call-to-action never shows where the page already is a form.
const NO_CTA_PREFIXES = ['/contact', '/aeration-signup', '/leaf-cleanup-signup', '/admin', '/preview'];

const FOCUSABLE = 'a[href], button:not([disabled])';

function matches(pathname, base) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

function Caret() {
  return (
    <svg className="nav-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function Logo() {
  return <img className="site-logo-img" src="/logo.webp" alt="BeckYards Landscaping & Design" width="300" height="300" />;
}

export default function Header() {
  const pathname = usePathname() || '/';
  const [hasHero, setHasHero] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const [fieldFocused, setFieldFocused] = useState(false);
  const [footerInView, setFooterInView] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [focused, setFocused] = useState(null);
  const [dismissed, setDismissed] = useState(null);
  const toggleRef = useRef(null);
  const menuRef = useRef(null);
  const closeRef = useRef(null);

  // The pathname guess above matches server HTML; confirm against the real page
  // once mounted so a page without a hero never keeps a transparent header.
  useEffect(() => {
    setHasHero(pathname === '/' || !!document.querySelector(HERO_SELECTOR));
  }, [pathname]);

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      setScrolled(y > 10);
      const hero = document.querySelector(HERO_SELECTOR);
      setPastHero(hero ? hero.getBoundingClientRect().bottom < 60 : y > 360);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [pathname]);

  // Hide the bottom bar while a form field is focused so it never sits over the
  // keyboard or the field being typed in.
  useEffect(() => {
    const isField = (el) => el instanceof HTMLElement && el.matches('input, textarea, select');
    const onIn = (e) => setFieldFocused(isField(e.target));
    const onOut = () => setFieldFocused(false);
    document.addEventListener('focusin', onIn);
    document.addEventListener('focusout', onOut);
    return () => {
      document.removeEventListener('focusin', onIn);
      document.removeEventListener('focusout', onOut);
    };
  }, []);

  // The footer and the on-page quote form (home) carry their own quote button, so
  // the bar steps aside while either is on screen.
  useEffect(() => {
    const targets = [document.querySelector('.site-footer'), document.getElementById('contact')].filter(Boolean);
    if (!targets.length || typeof IntersectionObserver === 'undefined') {
      setFooterInView(false);
      return undefined;
    }
    const visible = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
      setFooterInView(visible.size > 0);
    });
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  const closeMenu = useCallback((restoreFocus = false) => {
    setMenuOpen(false);
    if (restoreFocus) toggleRef.current?.focus();
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setHovered(null);
    setFocused(null);
    setDismissed(null);
  }, [pathname]);

  // Mobile sheet: scroll lock, focus into the sheet, Escape, Tab trap, and close
  // if the viewport grows to the desktop layout where the sheet is hidden.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    closeRef.current?.focus();

    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMenu(true);
        return;
      }
      if (e.key !== 'Tab' || !menuRef.current) return;
      const nodes = menuRef.current.querySelectorAll(FOCUSABLE);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    const mq = window.matchMedia('(min-width: 900px)');
    const onMq = () => mq.matches && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    mq.addEventListener('change', onMq);
    return () => {
      root.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
      mq.removeEventListener('change', onMq);
    };
  }, [menuOpen, closeMenu]);

  function onItemKeyDown(e, id) {
    if (e.key === 'Escape') {
      if (hovered !== id && focused !== id) return;
      setDismissed(id);
      const trigger = e.currentTarget.querySelector('.nav-link');
      if (trigger && document.activeElement !== trigger && e.currentTarget.contains(document.activeElement)) {
        trigger.focus();
      }
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const nodes = [...e.currentTarget.querySelectorAll('.nav-link, .nav-dropdown-menu a')];
    const i = nodes.indexOf(document.activeElement);
    if (i === -1) return;
    e.preventDefault();
    setDismissed(null);
    const next = e.key === 'ArrowDown' ? (i + 1) % nodes.length : (i - 1 + nodes.length) % nodes.length;
    nodes[next].focus();
  }

  const overHero = hasHero;
  // Everywhere except the home page itself (and the admin/editor screens).
  const showHomeLink = pathname !== '/' && !matches(pathname, '/admin') && !matches(pathname, '/preview');
  const ctaAllowed = !NO_CTA_PREFIXES.some((p) => matches(pathname, p));
  const showCta = pastHero && !menuOpen && !fieldFocused && !footerInView;

  return (
    <>
      <header className={`site-header${overHero ? ' is-over-hero' : ''}${overHero && scrolled ? ' is-solid' : ''}`}>
        <div className="wrap site-header-inner">
          <div className="site-brand">
            <Link className="site-logo" href="/">
              <Logo />
            </Link>
            {/* A plain, labelled way back to the home page from every other page. */}
            {showHomeLink && (
              <Link className="nav-link home-link" href="/">Home</Link>
            )}
          </div>

          <nav className="site-nav" aria-label="Main">
            <ul className="site-nav-list">
              {NAV.map((item) => {
                const bases = item.match || [item.href];
                const exact = bases.includes(pathname);
                const inSection = bases.some((b) => matches(pathname, b));
                const linkProps = {
                  'aria-current': exact ? 'page' : undefined,
                  className: `nav-link${inSection ? ' is-active' : ''}`,
                };

                if (!item.items) {
                  return (
                    <li className="nav-item" key={item.id}>
                      <Link href={item.href} {...linkProps}>{item.label}</Link>
                    </li>
                  );
                }

                const open = (hovered === item.id || focused === item.id) && dismissed !== item.id;
                const menuId = `nav-menu-${item.id}`;
                return (
                  <li
                    key={item.id}
                    className={`nav-item nav-dropdown${dismissed === item.id ? ' is-dismissed' : ''}`}
                    onMouseEnter={() => { setHovered(item.id); setDismissed((d) => (d === item.id ? null : d)); }}
                    onMouseLeave={() => { setHovered(null); setDismissed((d) => (d === item.id ? null : d)); }}
                    onFocus={() => {
                      if (focused !== item.id) {
                        setFocused(item.id);
                        setDismissed((d) => (d === item.id ? null : d));
                      }
                    }}
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) setFocused(null);
                    }}
                    onKeyDown={(e) => onItemKeyDown(e, item.id)}
                  >
                    <Link href={item.href} {...linkProps} aria-expanded={open} aria-controls={menuId}>
                      {item.label}
                      <Caret />
                    </Link>
                    <div
                      id={menuId}
                      className={`nav-dropdown-menu${item.right ? ' nav-dropdown-menu--right' : ''}${item.wide ? ' nav-dropdown-menu--wide' : ''}`}
                    >
                      {item.items.map((sub) => (
                        <Link
                          href={sub.href}
                          key={sub.href}
                          prefetch={false}
                          aria-current={pathname === sub.href ? 'page' : undefined}
                        >
                          <span>{sub.label}</span>
                          {sub.note && <small>{sub.note}</small>}
                        </Link>
                      ))}
                      {item.allLabel && (
                        <Link href={item.href} prefetch={false} className="nav-dropdown-all">
                          {item.allLabel}
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M5 12h14M13 6l6 6-6 6" />
                          </svg>
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="site-header-actions">
            <Link className="btn btn-solid btn-sm" href="/contact">Free Quote</Link>
            <button
              ref={toggleRef}
              type="button"
              className="nav-toggle"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              <span className="nav-toggle-bar" />
              <span className="nav-toggle-bar" />
              <span className="nav-toggle-bar" />
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="mobile-menu" id="mobile-menu" role="dialog" aria-modal="true" aria-label="Site menu" ref={menuRef}>
            <div className="mobile-menu-head">
              <Link className="site-logo" href="/" onClick={() => closeMenu()}>
                <Logo />
              </Link>
              <button
                ref={closeRef}
                type="button"
                className="nav-toggle"
                onClick={() => closeMenu(true)}
                aria-label="Close menu"
                aria-expanded="true"
              >
                <span className="nav-toggle-bar" />
                <span className="nav-toggle-bar" />
                <span className="nav-toggle-bar" />
              </button>
            </div>

            <nav className="mobile-menu-body" aria-label="Mobile">
              {NAV.filter((n) => n.items && n.id !== 'contact').map((item) => (
                <div className="mobile-menu-group" key={item.id}>
                  <Link
                    href={item.href}
                    className="mobile-menu-link"
                    aria-current={pathname === item.href ? 'page' : undefined}
                    onClick={() => closeMenu()}
                  >
                    {item.label}
                  </Link>
                  <div className="mobile-menu-sub">
                    {item.items.map((sub) => (
                      <Link
                        href={sub.href}
                        key={sub.href}
                        prefetch={false}
                        aria-current={pathname === sub.href ? 'page' : undefined}
                        onClick={() => closeMenu()}
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
              <div className="mobile-menu-group">
                {NAV.filter((n) => !n.items).map((item) => (
                  <Link
                    href={item.href}
                    key={item.id}
                    className="mobile-menu-link"
                    aria-current={pathname === item.href ? 'page' : undefined}
                    onClick={() => closeMenu()}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              <div className="mobile-menu-group">
                <Link
                  href="/contact"
                  className="mobile-menu-link"
                  aria-current={pathname === '/contact' ? 'page' : undefined}
                  onClick={() => closeMenu()}
                >
                  Contact
                </Link>
                <div className="mobile-menu-sub">
                  <Link href="/contact" prefetch={false} onClick={() => closeMenu()}>Get a Quote</Link>
                  <Link href="/leaf-cleanup-signup" prefetch={false} onClick={() => closeMenu()}>Leaf Cleanup Signup</Link>
                  <Link href="/aeration-signup" prefetch={false} onClick={() => closeMenu()}>Aeration Signup</Link>
                </div>
              </div>
            </nav>

            <div className="mobile-menu-foot">
              <Link className="btn btn-solid btn-lg btn-block btn-arrow" href="/contact" onClick={() => closeMenu()}>
                Free Quote
              </Link>
            </div>
          </div>
        )}
      </header>

      {ctaAllowed && (
        <div className={`mobile-cta mobile-cta--bar${showCta ? ' is-visible' : ''}`}>
          <Link className="btn btn-solid btn-arrow" href="/contact" tabIndex={showCta ? undefined : -1}>
            Free Quote
          </Link>
        </div>
      )}
    </>
  );
}
