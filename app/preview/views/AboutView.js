'use client';

import Editable from '../Editable';
import Header from '../../components/Header';
import SmartImage from '../../components/SmartImage';
import { SERVICES } from '../../../lib/services';
import { Bar, Removable, AddButton, set, setItem, addItem, removeItem, arr, photoSrc } from '../helpers';
import '../../about/about.css';

export default function AboutView({ c, set: setC }) {
  const edit = (key, extra) => ({ value: c[key], onCommit: (v) => setC(set(c, key, v)), ...extra });
  const storySrc = photoSrc(c.storyPhoto, '');
  const ctaSrc = photoSrc(c.ctaPhoto, '');
  const values = arr(c, 'values');
  const gallery = arr(c, 'gallery').filter((g) => g && typeof g.src === 'string' && g.src.trim() !== '');

  return (
    <div className="pv-root">
      <Bar label="About page" />
      <Header />
      <main id="main">
        <section className="page-hero ab-hero">
          {c.image && (
            <div className="page-hero-media">
              <SmartImage src={c.image} alt="" fill sizes="100vw" quality={60} />
            </div>
          )}
          <div className="wrap page-hero-inner">
            <p className="eyebrow eyebrow--rule">
              <Editable {...edit('eyebrow')} />
            </p>
            <h1 className="display">
              <Editable {...edit('heading', { placeholder: 'Headline' })} />
            </h1>
            <p className="lead">
              <Editable {...edit('intro', { multiline: true })} />
            </p>
            <div className="cluster page-hero-actions">
              <span className="btn btn-solid btn-lg btn-arrow">
                <Editable {...edit('ctaLabel')} />
              </span>
            </div>
          </div>
        </section>

        <section className="section section--paper">
          <div className="wrap">
            <div className="split ab-story">
              {storySrc && (
                <div className="ab-story-media">
                  <div className="media-frame ratio-3-4 media-frame--shadow">
                    <SmartImage src={storySrc} alt="" fill sizes="(min-width: 900px) 40vw, 100vw" quality={60} />
                  </div>
                </div>
              )}
              <div className="ab-story-copy">
                <div className="section-head">
                  <p className="eyebrow eyebrow--rule">
                    <Editable {...edit('storyEyebrow')} />
                  </p>
                  <h2>
                    <Editable {...edit('storyHeading')} />
                  </h2>
                </div>
                <div className="prose">
                  <Editable as="p" className="pv-pre" {...edit('body', { multiline: true })} />
                  <p className="pv-note">A blank line starts a new paragraph.</p>
                </div>
                <div className="ab-services">
                  <p className="ab-services-label">
                    <Editable {...edit('servicesLabel')} />
                  </p>
                  <ul className="ab-chips">
                    {SERVICES.map((s) => (
                      <li key={s.slug}>
                        <span className="ab-chip">{s.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section section--sage ab-faith">
          <div className="wrap">
            <div className="ab-faith-grid">
              <div className="section-head ab-faith-head">
                <p className="eyebrow eyebrow--rule">
                  <Editable {...edit('faithEyebrow')} />
                </p>
                <h2>
                  <Editable {...edit('faithHeading', { placeholder: 'Heading' })} />
                </h2>
              </div>
              <div className="ab-faith-copy">
                <div className="prose">
                  <Editable as="p" className="pv-pre" {...edit('faithBody', { multiline: true })} />
                  <p className="pv-note">A blank line starts a new paragraph. Clear the heading and text to hide this section.</p>
                </div>
                <figure className="ab-faith-verse">
                  <blockquote>
                    <p>
                      <Editable {...edit('faithVerse', { multiline: true, placeholder: 'Optional Bible verse' })} />
                    </p>
                  </blockquote>
                  <figcaption>
                    <Editable {...edit('faithVerseRef', { placeholder: 'Reference' })} />
                  </figcaption>
                </figure>
              </div>
            </div>
          </div>
        </section>

        <section className="section section--dark">
          <div className="wrap">
            <div className="section-head">
              <p className="eyebrow eyebrow--rule">
                <Editable {...edit('valuesEyebrow')} />
              </p>
              <h2>
                <Editable {...edit('valuesHeading')} />
              </h2>
            </div>
            <ul className="ab-values">
              {values.map((v, i) => (
                <li className="ab-value" key={i}>
                  <Removable onRemove={() => setC(removeItem(c, 'values', i))}>
                    <div className="ab-value-top">
                      <span className="ab-value-num" aria-hidden="true">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <h3>
                      <Editable value={v?.title} onCommit={(t) => setC(setItem(c, 'values', i, 'title', t))} />
                    </h3>
                    <p>
                      <Editable value={v?.body} multiline onCommit={(t) => setC(setItem(c, 'values', i, 'body', t))} />
                    </p>
                  </Removable>
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 24 }}>
              <AddButton onClick={() => setC(addItem(c, 'values', { title: 'New value', body: 'Describe it here.' }))}>
                Add value
              </AddButton>
            </div>
          </div>
        </section>

        <section className="section section--white">
          <div className="wrap">
            <div className="section-head section-head--split">
              <p className="eyebrow eyebrow--rule">
                <Editable {...edit('galleryEyebrow')} />
              </p>
              <h2>
                <Editable {...edit('galleryHeading')} />
              </h2>
              <div className="section-head-action">
                <span className="link-arrow">
                  <Editable {...edit('galleryLinkLabel')} />
                </span>
              </div>
            </div>
            <ul className="ab-strip">
              {gallery.slice(0, 4).map((g, i) => (
                <li className="ab-strip-item" key={`${g.src}-${i}`}>
                  <div className="media-frame">
                    <SmartImage src={g.src} alt="" fill sizes="(min-width: 900px) 25vw, 50vw" quality={60} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="cta-band">
          {ctaSrc && (
            <div className="cta-band-media">
              <SmartImage src={ctaSrc} alt="" fill sizes="100vw" quality={60} />
            </div>
          )}
          <div className="wrap cta-band-inner">
            <div className="cta-band-text">
              <h2>
                <Editable {...edit('ctaHeading')} />
              </h2>
              <p>
                <Editable {...edit('ctaBody', { multiline: true })} />
              </p>
            </div>
            <div className="cluster">
              <span className="btn btn-light btn-lg btn-arrow">
                <Editable {...edit('ctaLabel')} />
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
