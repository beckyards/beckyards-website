'use client';

import Editable from '../Editable';
import Header from '../../components/Header';
import { Bar, Removable, AddButton, set, setItem, addItem, removeItem, arr } from '../helpers';
import '../../forms.css';

export default function TermsView({ c, set: setC }) {
  const edit = (key, extra) => ({ value: c[key], onCommit: (v) => setC(set(c, key, v)), ...extra });
  const sections = arr(c, 'sections');

  return (
    <div className="pv-root">
      <Bar label="Terms page" />
      <Header />
      <main id="main">
        <section className="page-hero forms-hero">
          <div className="wrap page-hero-inner">
            <p className="eyebrow">
              <Editable {...edit('eyebrow')} />
            </p>
            <h1 className="h1">
              <Editable {...edit('heading', { placeholder: 'Headline' })} />
            </h1>
            <p className="lead">
              <Editable {...edit('intro', { multiline: true })} />
            </p>
            <p className="terms-updated">
              <Editable {...edit('lastUpdated')} />
            </p>
          </div>
        </section>

        <section className="section section--paper terms">
          <div className="wrap terms-layout">
            <aside className="terms-aside">
              <nav className="terms-toc is-open">
                <p className="terms-toc-label" style={{ display: 'block' }}>
                  <Editable {...edit('tocLabel')} />
                </p>
                <ol className="terms-toc-list">
                  {sections.map((s, i) => (
                    <li key={i}>
                      <a href="#">
                        <span className="terms-toc-num">{String(i + 1).padStart(2, '0')}</span>
                        {s?.heading}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>

            <div className="terms-body">
              {sections.map((s, i) => (
                <section className="terms-section" key={i}>
                  <span className="terms-section-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  <Removable onRemove={() => setC(removeItem(c, 'sections', i))}>
                    <h2 className="h3">
                      <Editable value={s?.heading} onCommit={(v) => setC(setItem(c, 'sections', i, 'heading', v))} />
                    </h2>
                    <Editable
                      as="p"
                      className="pv-pre"
                      value={s?.body}
                      multiline
                      onCommit={(v) => setC(setItem(c, 'sections', i, 'body', v))}
                    />
                  </Removable>
                </section>
              ))}
              <div style={{ margin: '24px 0' }}>
                <AddButton onClick={() => setC(addItem(c, 'sections', { heading: 'New section', body: 'Section text. A blank line starts a new paragraph.' }))}>
                  Add section
                </AddButton>
              </div>

              <div className="terms-contact">
                <h2 className="h3">
                  <Editable {...edit('contactHeading')} />
                </h2>
                <p>
                  <Editable {...edit('contactBody', { multiline: true })} />
                </p>
                <span className="btn btn-solid btn-arrow">
                  <Editable {...edit('contactCtaLabel')} />
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
