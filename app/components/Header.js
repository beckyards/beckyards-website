'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { SERVICES } from '../../lib/services';
import { PROGRAMS } from '../../lib/programs';

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeMobile = () => setMobileOpen(false);
  const pathname = usePathname();
  const isHome = pathname === '/';

  // The header's translucent fade only looks right over the homepage hero
  // photo — anywhere else (or once scrolled past it) it lets page text show
  // through and overlap the nav, so it goes solid as soon as you scroll.
  useEffect(() => {
    if (!isHome) return;
    function onScroll() {
      setScrolled(window.scrollY > 10);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHome]);

  const isSolid = !isHome || scrolled;

  return (
    <header className={isSolid ? 'is-solid' : undefined}>
      <div className="nav">
        <a className="logo" href="/#top">
          <img className="logo-img" src="/logo.webp" alt="BeckYards Landscaping & Design" />
        </a>
        <nav className="nav-links">
          {!isHome && <a href="/">Home</a>}
          <div className="nav-dropdown">
            <a href="/services" className="nav-dropdown-trigger">Services</a>
            <div className="nav-dropdown-menu nav-dropdown-menu-compact">
              {SERVICES.map((service) => (
                <a href={`/services/${service.slug}`} key={service.slug}>
                  <b>{service.title}</b>
                </a>
              ))}
            </div>
          </div>
          <div className="nav-dropdown">
            <a href="/programs" className="nav-dropdown-trigger">Programs</a>
            <div className="nav-dropdown-menu nav-dropdown-menu-compact">
              {PROGRAMS.map((program) => (
                <a href={`/programs/${program.slug}`} key={program.slug}>
                  <b>{program.name}</b>
                </a>
              ))}
            </div>
          </div>
          <a href="/about">About</a>
          <a href="/portfolio">Portfolio</a>
          <div className="nav-dropdown nav-dropdown-right">
            <a href="/contact" className="nav-dropdown-trigger">Contact</a>
            <div className="nav-dropdown-menu nav-dropdown-menu-compact">
              <a href="/contact"><b>Get a Quote</b></a>
              <a href="/aeration-signup"><b>Aeration Signup</b></a>
            </div>
          </div>
        </nav>
        <a className="btn btn-solid btn-sm nav-cta" href="/contact">Free Quote</a>
        <button
          type="button"
          className="nav-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {mobileOpen && (
        <div className="mobile-menu">
          <div className="mobile-menu-group">
            <a href="/" className="mobile-menu-heading" onClick={closeMobile}>Home</a>
          </div>
          <div className="mobile-menu-group">
            <a href="/services" className="mobile-menu-heading" onClick={closeMobile}>Services</a>
            {SERVICES.map((service) => (
              <a href={`/services/${service.slug}`} key={service.slug} className="mobile-submenu-link" onClick={closeMobile}>
                {service.title}
              </a>
            ))}
          </div>
          <div className="mobile-menu-group">
            <a href="/programs" className="mobile-menu-heading" onClick={closeMobile}>Programs</a>
            {PROGRAMS.map((program) => (
              <a href={`/programs/${program.slug}`} key={program.slug} className="mobile-submenu-link" onClick={closeMobile}>
                {program.name}
              </a>
            ))}
          </div>
          <div className="mobile-menu-group">
            <a href="/about" className="mobile-menu-heading" onClick={closeMobile}>About</a>
          </div>
          <div className="mobile-menu-group">
            <a href="/portfolio" className="mobile-menu-heading" onClick={closeMobile}>Portfolio</a>
          </div>
          <div className="mobile-menu-group">
            <a href="/contact" className="mobile-menu-heading" onClick={closeMobile}>Contact</a>
            <a href="/contact" className="mobile-submenu-link" onClick={closeMobile}>Get a Quote</a>
            <a href="/aeration-signup" className="mobile-submenu-link" onClick={closeMobile}>Aeration Signup</a>
          </div>
          <a className="btn btn-solid btn-sm" href="/contact" onClick={closeMobile}>Free Quote</a>
        </div>
      )}
    </header>
  );
}
