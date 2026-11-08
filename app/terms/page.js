import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import TermsToc from './TermsToc';
import { getContent } from '../../lib/siteContent';
import { TERMS_DEFAULT } from '../../lib/pageContent';
import { socialMeta } from '../../lib/seo';
import { IMAGES } from '../../lib/siteImages';
import '../forms.css';

export const revalidate = 60;

const DESCRIPTION = 'Terms and policies for BeckYards Landscaping & Design services.';

export const metadata = {
  title: 'Terms & Policies',
  description: DESCRIPTION,
  alternates: { canonical: '/terms' },
  ...socialMeta({ title: 'Terms & Policies', description: DESCRIPTION, path: '/terms', image: IMAGES.hero }),
};

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Section bodies can hold several paragraphs separated by a blank line.
function paragraphs(body) {
  return String(body || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export default async function Terms() {
  const c = await getContent('terms', TERMS_DEFAULT);

  const used = new Set();
  const sections = (Array.isArray(c.sections) ? c.sections : []).map((s, i) => {
    const base = slugify(s.heading) || `section-${i + 1}`;
    let id = base;
    for (let n = 2; used.has(id); n += 1) id = `${base}-${n}`;
    used.add(id);
    return { id, heading: s.heading, paras: paragraphs(s.body) };
  });

  return (
    <>
      <Header />

      <main id="main">
        <section className="page-hero forms-hero">
          <div className="wrap page-hero-inner">
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <ol>
                <li><Link href="/">Home</Link></li>
                <li aria-current="page">{c.heading}</li>
              </ol>
            </nav>
            <p className="eyebrow">{c.eyebrow}</p>
            <h1 className="h1">{c.heading}</h1>
            <p className="lead">{c.intro}</p>
            {c.lastUpdated && <p className="terms-updated">{c.lastUpdated}</p>}
          </div>
        </section>

        <section className="section section--paper terms">
          <div className="wrap terms-layout">
            <aside className="terms-aside">
              <TermsToc label={c.tocLabel} items={sections.map((s) => ({ id: s.id, title: s.heading }))} />
            </aside>

            <div className="terms-body">
              {sections.map((s, i) => (
                <section className="terms-section" id={s.id} key={s.id} aria-labelledby={`${s.id}-title`}>
                  <span className="terms-section-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  <h2 className="h3" id={`${s.id}-title`}>{s.heading}</h2>
                  {s.paras.map((p, j) => (
                    <p key={j}>{p}</p>
                  ))}
                </section>
              ))}

              <div className="terms-contact">
                <h2 className="h3">{c.contactHeading}</h2>
                <p>{c.contactBody}</p>
                <Link className="btn btn-solid btn-arrow" href="/contact">{c.contactCtaLabel}</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
