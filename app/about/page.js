import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SmartImage from '../components/SmartImage';
import { getContent } from '../../lib/siteContent';
import { ABOUT_DEFAULT } from '../../lib/pageContent';
import { SERVICES } from '../../lib/services';
import { socialMeta } from '../../lib/seo';
import { IMAGES } from '../../lib/siteImages';
import './about.css';

export const revalidate = 60;

const DESCRIPTION =
  'BeckYards Landscaping & Design is a small, owner-run company built on putting customers first and leaving a lasting impact on every project.';

export const metadata = {
  title: 'About',
  description: DESCRIPTION,
  alternates: { canonical: '/about' },
  ...socialMeta({ title: 'About', description: DESCRIPTION, path: '/about', image: IMAGES.about }),
};

// One line icon per value, cycled if the owner adds more than four.
const VALUE_ICONS = [
  // heart
  <path key="i0" d="M12 20.5C7 17 4 13.8 4 10.2A4.2 4.2 0 018.2 6c1.6 0 3 .8 3.8 2.1A4.4 4.4 0 0115.8 6 4.2 4.2 0 0120 10.2c0 3.6-3 6.8-8 10.3z" />,
  // sprout
  <g key="i1">
    <path d="M12 21v-8" />
    <path d="M12 13C12 9 9.5 7 5 7c0 4 2.5 6 7 6z" />
    <path d="M12 11c0-3.5 2.2-6 7-6 0 3.8-2.4 6-7 6z" />
  </g>,
  // speech bubble
  <g key="i2">
    <path d="M5 5h14a1 1 0 011 1v9a1 1 0 01-1 1h-9l-4 3.5V16H5a1 1 0 01-1-1V6a1 1 0 011-1z" />
    <path d="M8 9.5h8M8 12.5h5" />
  </g>,
  // shield with check
  <g key="i3">
    <path d="M12 3l7 3v5.5c0 4.4-2.9 8.2-7 9.5-4.1-1.3-7-5.1-7-9.5V6l7-3z" />
    <path d="M9 12l2.2 2.2L15.5 10" />
  </g>,
];

// A photo field is { image, alt } (the editor shape) or a bare URL string.
function photoSrc(field) {
  const v = typeof field === 'string' ? field : field?.image;
  return typeof v === 'string' ? v.trim() : '';
}

function focalPosition(item) {
  const fx = Number(item?.focalX);
  const fy = Number(item?.focalY);
  if (!Number.isFinite(fx) || !Number.isFinite(fy)) return undefined;
  return `${Math.min(100, Math.max(0, fx))}% ${Math.min(100, Math.max(0, fy))}%`;
}

export default async function AboutPage() {
  const c = await getContent('about', ABOUT_DEFAULT);
  const allServices = await getContent('services', SERVICES);
  const services = (Array.isArray(allServices) ? allServices : SERVICES).filter((s) => s && s.slug && s.title);

  const paragraphs = String(c.body || '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const values = Array.isArray(c.values) ? c.values.filter((v) => v && (v.title || v.body)) : [];
  const storySrc = photoSrc(c.storyPhoto);
  const ctaSrc = photoSrc(c.ctaPhoto);
  const gallery = Array.isArray(c.gallery)
    ? c.gallery.filter((g) => g && typeof g.src === 'string' && g.src.trim() !== '')
    : [];

  return (
    <>
      <Header />

      <main id="main">
        <section className="page-hero ab-hero">
          <div className="page-hero-media">
            <SmartImage src={c.image} alt="" fill priority sizes="100vw" quality={75} />
          </div>
          <div className="wrap page-hero-inner">
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <ol>
                <li>
                  <Link href="/">Home</Link>
                </li>
                <li aria-current="page">About</li>
              </ol>
            </nav>
            <p className="eyebrow eyebrow--rule">{c.eyebrow}</p>
            <h1 className="display">{c.heading}</h1>
            <p className="lead">{c.intro}</p>
            <div className="cluster page-hero-actions">
              <Link className="btn btn-solid btn-lg btn-arrow" href="/contact">
                {c.ctaLabel}
              </Link>
              <Link className="btn btn-outline-light btn-lg" href="/portfolio">
                See Our Work
              </Link>
            </div>
          </div>
        </section>

        <section className="section section--paper">
          <div className="wrap">
            <div className="split ab-story">
              {storySrc && (
                <div className="ab-story-media">
                  <div className="media-frame ratio-3-4 media-frame--shadow">
                    <SmartImage
                      src={storySrc}
                      alt={(typeof c.storyPhoto === 'object' && c.storyPhoto?.alt) || ''}
                      fill
                      sizes="(min-width: 900px) 40vw, 100vw"
                      quality={75}
                    />
                  </div>
                </div>
              )}
              <div className="ab-story-copy">
                <div className="section-head">
                  <p className="eyebrow eyebrow--rule">{c.storyEyebrow}</p>
                  <h2>{c.storyHeading}</h2>
                </div>
                <div className="prose">
                  {paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
                <div className="ab-services">
                  <p className="ab-services-label">{c.servicesLabel}</p>
                  <ul className="ab-chips">
                    {services.map((s) => (
                      <li key={s.slug}>
                        <Link className="ab-chip" href={`/services/${s.slug}`}>
                          {s.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {values.length > 0 && (
          <section className="section section--dark">
            <div className="wrap">
              <div className="section-head">
                <p className="eyebrow eyebrow--rule">{c.valuesEyebrow}</p>
                <h2>{c.valuesHeading}</h2>
              </div>
              <ul className="ab-values">
                {values.map((v, i) => (
                  <li className="ab-value reveal" key={i}>
                    <div className="ab-value-top">
                      <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        {VALUE_ICONS[i % VALUE_ICONS.length]}
                      </svg>
                      <span className="ab-value-num" aria-hidden="true">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <h3>{v.title}</h3>
                    <p>{v.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {gallery.length > 0 && (
          <section className="section section--white">
            <div className="wrap">
              <div className="section-head section-head--split">
                <p className="eyebrow eyebrow--rule">{c.galleryEyebrow}</p>
                <h2>{c.galleryHeading}</h2>
                <div className="section-head-action">
                  <Link className="link-arrow" href="/portfolio">
                    {c.galleryLinkLabel}
                  </Link>
                </div>
              </div>
              <ul className="ab-strip">
                {gallery.slice(0, 4).map((g, i) => (
                  <li className="ab-strip-item reveal" key={`${g.src}-${i}`}>
                    <div className="media-frame media-frame--zoom">
                      <SmartImage
                        src={g.src}
                        alt={g.alt || ''}
                        fill
                        sizes="(min-width: 1280px) 300px, (min-width: 900px) 25vw, 50vw"
                        quality={75}
                        style={{ objectPosition: focalPosition(g) }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <section className="cta-band">
          {ctaSrc && (
            <div className="cta-band-media">
              <SmartImage src={ctaSrc} alt="" fill sizes="100vw" quality={60} />
            </div>
          )}
          <div className="wrap cta-band-inner">
            <div className="cta-band-text">
              <h2>{c.ctaHeading}</h2>
              <p>{c.ctaBody}</p>
            </div>
            <div className="cluster">
              <Link className="btn btn-light btn-lg btn-arrow" href="/contact">
                {c.ctaLabel}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
