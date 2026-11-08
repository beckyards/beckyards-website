'use client';

import Editable from '../Editable';
import { SERVICES } from '../../../lib/services';
import { PROGRAMS } from '../../../lib/programs';
import { Bar, set } from '../helpers';
import '../../components/chrome.css';

const COMPANY = ['About', 'Portfolio', 'Contact', 'Aeration Signup'];

export default function FooterView({ c, set: setC }) {
  const edit = (key, extra) => ({ value: c[key], onCommit: (v) => setC(set(c, key, v)), ...extra });
  return (
    <div className="pv-root">
      <Bar label="Footer" />
      <main id="main" style={{ minHeight: '40vh' }} />
      <footer className="site-footer">
        <div className="wrap">
          <div className="footer-grid">
            <div className="footer-brand">
              <span className="site-logo">
                <img className="site-logo-img" src="/logo.webp" alt="BeckYards Landscaping & Design" width="300" height="300" />
              </span>
              <p className="footer-blurb">
                <Editable {...edit('blurb', { multiline: true })} />
              </p>
              <div className="footer-cta">
                <p className="footer-cta-text">
                  <Editable {...edit('ctaText', { multiline: true })} />
                </p>
                <span className="btn btn-solid btn-arrow">
                  <Editable {...edit('ctaLabel')} />
                </span>
              </div>
            </div>

            <nav className="footer-col">
              <h2 className="footer-heading">
                <Editable {...edit('servicesHeading')} />
              </h2>
              <ul className="footer-links">
                {SERVICES.map((s) => (
                  <li key={s.slug}>
                    <a href="#">{s.title}</a>
                  </li>
                ))}
              </ul>
            </nav>

            <nav className="footer-col">
              <h2 className="footer-heading">
                <Editable {...edit('programsHeading')} />
              </h2>
              <ul className="footer-links">
                {PROGRAMS.map((p) => (
                  <li key={p.slug}>
                    <a href="#">{p.name}</a>
                  </li>
                ))}
              </ul>
            </nav>

            <nav className="footer-col">
              <h2 className="footer-heading">
                <Editable {...edit('companyHeading')} />
              </h2>
              <ul className="footer-links">
                {COMPANY.map((label) => (
                  <li key={label}>
                    <a href="#">{label}</a>
                  </li>
                ))}
                <li>
                  <a href="#">
                    <Editable {...edit('termsLabel')} />
                  </a>
                </li>
              </ul>
            </nav>
          </div>

          <div className="footer-bottom">
            <span>
              <Editable {...edit('copyright')} />
            </span>
            <div className="footer-legal">
              <span className="footer-insured">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 3l7 3v5.5c0 4.4-2.9 7.7-7 9.5-4.1-1.8-7-5.1-7-9.5V6l7-3z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
                <Editable {...edit('location')} />
              </span>
              <a href="#">{c.termsLabel}</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
