'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Editable from '../Editable';
import Header from '../../components/Header';
import { SERVICES, getService } from '../../../lib/services';
import { PROGRAMS } from '../../../lib/programs';
import {
  HOME_DEFAULT,
  ABOUT_DEFAULT,
  CONTACT_PAGE_DEFAULT,
  PROMO_BAR_DEFAULT,
  FOOTER_DEFAULT,
  TERMS_DEFAULT,
} from '../../../lib/pageContent';
import '../preview.css';

const DEFAULTS = {
  home: HOME_DEFAULT,
  about: ABOUT_DEFAULT,
  contact: CONTACT_PAGE_DEFAULT,
  promoBar: PROMO_BAR_DEFAULT,
  footer: FOOTER_DEFAULT,
  terms: TERMS_DEFAULT,
};

// Talks to the admin's Visual tab (app/admin/(dash)/_components/VisualEditor.js)
// over postMessage. Same origin always (this only ever loads in an iframe the
// admin panel itself puts on the page), but we still check event.origin.
function usePreviewSync(pageKey) {
  const [content, setContent] = useState(DEFAULTS[pageKey] || {});

  useEffect(() => {
    function onMessage(e) {
      if (e.origin !== window.location.origin) return;
      const msg = e.data;
      if (msg?.source !== 'oskelo-admin') return;
      if (msg.type === 'content') setContent(msg.value);
    }
    window.addEventListener('message', onMessage);
    window.parent.postMessage({ source: 'oskelo-preview', type: 'ready', key: pageKey }, window.location.origin);
    return () => window.removeEventListener('message', onMessage);
  }, [pageKey]);

  const update = useCallback(
    (next) => {
      setContent(next);
      window.parent.postMessage({ source: 'oskelo-preview', type: 'change', value: next }, window.location.origin);
    },
    []
  );

  return [content, update];
}

function set(content, key, value) {
  return { ...content, [key]: value };
}
function setAt(content, arrayKey, index, field, value) {
  const arr = content[arrayKey].slice();
  arr[index] = { ...arr[index], [field]: value };
  return { ...content, [arrayKey]: arr };
}

function Bar({ label }) {
  return (
    <div className="pv-bar">
      <b>Live preview</b>
      <span>{label} — click any highlighted text to edit it</span>
    </div>
  );
}

function HomeView({ c, set: setC }) {
  const aeration = getService('aeration-overseeding');
  return (
    <>
      <Bar label="Homepage" />
      <Header />
      <main>
        <section className="hero">
          <div className="hero-bg">
            <span className="bokeh b1" /><span className="bokeh b2" /><span className="bokeh b3" /><span className="bokeh b4" />
          </div>
          <div className="hero-scrim" />
          <div className="hero-content">
            <Editable as="div" className="eyebrow" value={c.heroEyebrow} onCommit={(v) => setC(set(c, 'heroEyebrow', v))} />
            <h1>
              <Editable value={c.heroHeading} onCommit={(v) => setC(set(c, 'heroHeading', v))} placeholder="Headline" />
            </h1>
            <div className="hero-ctas">
              <span className="btn btn-solid"><Editable value={c.heroCtaLabel} onCommit={(v) => setC(set(c, 'heroCtaLabel', v))} /></span>
            </div>
          </div>
        </section>

        {aeration && (
          <div className="section-alt">
            <div className="wrap">
              <section className="section service-detail" id="aeration">
                <div className="section-head">
                  <div>
                    <Editable as="div" className="eyebrow" value={c.aerationEyebrow} onCommit={(v) => setC(set(c, 'aerationEyebrow', v))} />
                    <h2><Editable value={c.aerationHeading} onCommit={(v) => setC(set(c, 'aerationHeading', v))} /></h2>
                  </div>
                  <Editable as="p" value={c.aerationNote} multiline onCommit={(v) => setC(set(c, 'aerationNote', v))} />
                </div>
                <p className="prose">{aeration.body}</p>
                {aeration.highlights?.length > 0 && (
                  <ul>
                    {aeration.highlights.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                )}
                <span className="btn btn-solid"><Editable value={c.aerationCtaLabel} onCommit={(v) => setC(set(c, 'aerationCtaLabel', v))} /></span>
              </section>
            </div>
          </div>
        )}

        <div className="wrap">
          <section className="section offers" id="services">
            <div className="section-head">
              <div>
                <Editable as="div" className="eyebrow" value={c.servicesEyebrow} onCommit={(v) => setC(set(c, 'servicesEyebrow', v))} />
                <h2><Editable value={c.servicesHeading} onCommit={(v) => setC(set(c, 'servicesHeading', v))} /></h2>
              </div>
              <Editable as="p" value={c.servicesIntro} multiline onCommit={(v) => setC(set(c, 'servicesIntro', v))} />
            </div>
            <ul className="offer-list">
              {SERVICES.map((service, i) => (
                <li key={service.slug}>
                  <span>
                    <span className="offer-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                    <span className="offer-text">
                      <span className="offer-name">{service.title}</span>
                      <span className="offer-blurb">{service.subtitle}</span>
                    </span>
                    <span className="offer-arrow" aria-hidden="true">→</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="section-alt">
          <div className="wrap">
            <section className="section" id="why-us">
              <div className="section-head">
                <div>
                  <Editable as="div" className="eyebrow" value={c.whyEyebrow} onCommit={(v) => setC(set(c, 'whyEyebrow', v))} />
                  <h2><Editable value={c.whyHeading} onCommit={(v) => setC(set(c, 'whyHeading', v))} /></h2>
                </div>
              </div>
              <Editable as="p" className="prose" value={c.whyBody} multiline onCommit={(v) => setC(set(c, 'whyBody', v))} />
            </section>
          </div>
        </div>

        <div className="wrap">
          <section className="section" id="programs">
            <div className="section-head">
              <div>
                <Editable as="div" className="eyebrow" value={c.programsEyebrow} onCommit={(v) => setC(set(c, 'programsEyebrow', v))} />
                <h2><Editable value={c.programsHeading} onCommit={(v) => setC(set(c, 'programsHeading', v))} /></h2>
              </div>
              <Editable as="p" value={c.programsIntro} multiline onCommit={(v) => setC(set(c, 'programsIntro', v))} />
            </div>
            <div className="link-cards">
              {PROGRAMS.map((program) => (
                <span className="link-card" key={program.slug}>
                  <h3>{program.name}</h3>
                  <p className="subhead">{program.title}</p>
                  <span className="link-card-cta">Learn more →</span>
                </span>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

function AboutView({ c, set: setC }) {
  return (
    <>
      <Bar label="About page" />
      <Header />
      <main>
        <div className="wrap">
          <section className="section" id="about">
            <div className="section-head">
              <div>
                <Editable as="div" className="eyebrow" value={c.eyebrow} onCommit={(v) => setC(set(c, 'eyebrow', v))} />
                <h2><Editable value={c.heading} onCommit={(v) => setC(set(c, 'heading', v))} /></h2>
              </div>
              <Editable as="p" value={c.intro} multiline onCommit={(v) => setC(set(c, 'intro', v))} />
            </div>
            <Editable as="p" className="prose" value={c.body} multiline onCommit={(v) => setC(set(c, 'body', v))} />
          </section>
        </div>
      </main>
    </>
  );
}

function ContactView({ c, set: setC }) {
  return (
    <>
      <Bar label="Contact page" />
      <Header />
      <main>
        <section className="section contact" id="contact">
          <div className="wrap contact-inner">
            <div>
              <Editable as="div" className="eyebrow" value={c.eyebrow} onCommit={(v) => setC(set(c, 'eyebrow', v))} />
              <h2><Editable value={c.heading} onCommit={(v) => setC(set(c, 'heading', v))} /></h2>
              <Editable as="p" value={c.intro} multiline onCommit={(v) => setC(set(c, 'intro', v))} />
              <div className="contact-email">
                <Editable as="span" className="sub" value={c.body} multiline onCommit={(v) => setC(set(c, 'body', v))} />
              </div>
            </div>
            <p style={{ color: 'var(--grey-dim)', fontSize: 13 }}>The real quote-request form renders here on the live site.</p>
          </div>
        </section>
      </main>
    </>
  );
}

function TermsView({ c, set: setC }) {
  const sections = c.sections || [];
  function updateSection(i, field, v) { setC(setAt(c, 'sections', i, field, v)); }
  function addSection() { setC({ ...c, sections: [...sections, { heading: 'New section', body: 'Section text.' }] }); }
  function removeSection(i) { setC({ ...c, sections: sections.filter((_, j) => j !== i) }); }

  return (
    <>
      <Bar label="Terms page" />
      <Header />
      <main>
        <div className="wrap">
          <section className="section legal">
            <div className="section-head">
              <div>
                <Editable as="div" className="eyebrow" value={c.eyebrow} onCommit={(v) => setC(set(c, 'eyebrow', v))} />
                <h2><Editable value={c.heading} onCommit={(v) => setC(set(c, 'heading', v))} /></h2>
                <div className="legal-updated"><Editable value={c.lastUpdated} onCommit={(v) => setC(set(c, 'lastUpdated', v))} /></div>
              </div>
              <Editable as="p" value={c.intro} multiline onCommit={(v) => setC(set(c, 'intro', v))} />
            </div>

            {sections.map((s, i) => (
              <div key={i} className="pv-card-wrap">
                <button type="button" className="pv-remove-btn" onClick={() => removeSection(i)} title="Remove">✕</button>
                <h3><Editable value={s.heading} onCommit={(v) => updateSection(i, 'heading', v)} /></h3>
                <Editable as="p" value={s.body} multiline onCommit={(v) => updateSection(i, 'body', v)} />
              </div>
            ))}
            <button type="button" className="pv-add-btn" style={{ marginTop: 16 }} onClick={addSection}>+ Add section</button>

            <h3>Contact</h3>
            <p>Questions about these terms can be sent through our contact form.</p>
          </section>
        </div>
      </main>
    </>
  );
}

function PromoBarView({ c, set: setC }) {
  return (
    <>
      <Bar label="Top promo bar" />
      <main>
        <div className="promo-bar">
          <div className="promo-bar-track">
            <span className="promo-bar-group">
              <Editable value={c.message} onCommit={(v) => setC(set(c, 'message', v))} />
            </span>
          </div>
        </div>
        <p style={{ padding: 24, color: '#5c6250', font: '14px Inter, sans-serif' }}>
          This banner scrolls across the very top of every page (except the admin area).
        </p>
      </main>
    </>
  );
}

function FooterView({ c, set: setC }) {
  return (
    <>
      <Bar label="Footer" />
      <main style={{ minHeight: '60vh' }} />
      <footer>
        <div className="wrap footer-inner">
          <Editable value={c.copyright} onCommit={(v) => setC(set(c, 'copyright', v))} />
          <div className="footer-links">
            <Editable value={c.location} onCommit={(v) => setC(set(c, 'location', v))} />
            <Editable value={c.termsLabel} onCommit={(v) => setC(set(c, 'termsLabel', v))} />
          </div>
        </div>
      </footer>
    </>
  );
}

const VIEWS = {
  home: HomeView,
  about: AboutView,
  contact: ContactView,
  terms: TermsView,
  promoBar: PromoBarView,
  footer: FooterView,
};

export default function PreviewPage() {
  const params = useParams();
  const key = params?.key;
  const [content, setContent] = usePreviewSync(key);
  const View = useMemo(() => VIEWS[key], [key]);

  if (!View) return <p style={{ padding: 24 }}>No visual preview for "{key}" yet — use the Form or Raw JSON tab.</p>;

  return <View c={content} set={setContent} />;
}
