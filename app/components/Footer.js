import Link from 'next/link';
import { getContent } from '../../lib/siteContent';
import { FOOTER_DEFAULT } from '../../lib/pageContent';
import { SERVICES } from '../../lib/services';
import { PROGRAMS } from '../../lib/programs';
import './chrome.css';

function cleanList(value, fallback) {
  const list = Array.isArray(value) ? value.filter((x) => x && x.slug) : [];
  return list.length ? list : fallback;
}

export default async function Footer() {
  const c = await getContent('footer', FOOTER_DEFAULT);
  const services = cleanList(await getContent('services', SERVICES), SERVICES);
  const programs = cleanList(await getContent('programs', PROGRAMS), PROGRAMS);

  const company = [
    { href: '/about', label: 'About' },
    { href: '/portfolio', label: 'Portfolio' },
    { href: '/contact', label: 'Contact' },
    { href: '/leaf-cleanup-signup', label: 'Leaf Cleanup Signup' },
    { href: '/aeration-signup', label: 'Aeration Signup' },
    { href: '/terms', label: c.termsLabel },
  ];

  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link className="site-logo" href="/" aria-label="BeckYards Landscaping & Design, home">
              <img className="site-logo-img" src="/logo.webp" alt="" width="300" height="300" />
            </Link>
            <p className="footer-blurb">{c.blurb}</p>
            <div className="footer-cta">
              {c.ctaText && <p className="footer-cta-text">{c.ctaText}</p>}
              <Link className="btn btn-solid btn-arrow" href="/contact">{c.ctaLabel}</Link>
            </div>
          </div>

          <nav className="footer-col" aria-labelledby="footer-services">
            <h2 className="footer-heading" id="footer-services">{c.servicesHeading}</h2>
            <ul className="footer-links">
              {services.map((s) => (
                <li key={s.slug}><Link href={`/services/${s.slug}`}>{s.title}</Link></li>
              ))}
            </ul>
          </nav>

          <nav className="footer-col" aria-labelledby="footer-programs">
            <h2 className="footer-heading" id="footer-programs">{c.programsHeading}</h2>
            <ul className="footer-links">
              {programs.map((p) => (
                <li key={p.slug}><Link href={`/programs/${p.slug}`}>{p.name}</Link></li>
              ))}
            </ul>
          </nav>

          <nav className="footer-col" aria-labelledby="footer-company">
            <h2 className="footer-heading" id="footer-company">{c.companyHeading}</h2>
            <ul className="footer-links">
              {company.map((l) => (
                <li key={l.href}><Link href={l.href}>{l.label}</Link></li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="footer-bottom">
          <span>{c.copyright}</span>
          <div className="footer-legal">
            <span className="footer-insured">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3l7 3v5.5c0 4.4-2.9 7.7-7 9.5-4.1-1.8-7-5.1-7-9.5V6l7-3z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              {c.location}
            </span>
            <Link href="/terms">{c.termsLabel}</Link>
            <a href="/admin" className="footer-admin">Admin</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
