import Link from 'next/link';
import { cache } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import Contact from './components/Contact';
import SmartImage from './components/SmartImage';
import BeforeAfterSlider from './components/BeforeAfterSlider';
import HomeIcon from './components/HomeIcons';
import { SERVICES, getService, serviceImage } from '../lib/services';
import { PROGRAMS, programImage } from '../lib/programs';
import { IMAGES } from '../lib/siteImages';
import { HOME_DEFAULT, CONTACT_PAGE_DEFAULT, PORTFOLIO_DEFAULT } from '../lib/pageContent';
import { getContent } from '../lib/siteContent';
import { getImageSize, getImageSizes } from '../lib/imageSize';
import { isMediaUrl } from '../lib/media';
import './home.css';

export const revalidate = 60;

const getHome = cache(() => getContent('home', HOME_DEFAULT));

const SITE_DESCRIPTION =
  'Landscaping that puts you first. Lawn mowing, mulching, bed redesign, planting, seasonal cleanups, and aeration & overseeding from BeckYards Landscaping & Design. Free quotes, fully insured.';

// A photo field may be { image, alt } (the editor shape) or a bare URL string.
function photoSrc(field, fallback) {
  const v = typeof field === 'string' ? field : field?.image;
  return (typeof v === 'string' && v.trim()) || fallback;
}
function photoAlt(field, fallback = '') {
  return (typeof field === 'object' && typeof field?.alt === 'string' && field.alt.trim()) || fallback;
}

// Social crawlers choke on 6-10 MB originals, so point them at the optimizer's
// 1200px rendition (1200 is one of the configured deviceSizes).
async function shareImage(src) {
  if (!isMediaUrl(src)) return { url: src };
  const { width, height } = await getImageSize(src);
  return {
    url: `/_next/image?url=${encodeURIComponent(src)}&w=1200&q=75`,
    width: 1200,
    height: Math.round((1200 * height) / width),
    alt: 'A freshly striped lawn and landscaped front yard by BeckYards',
  };
}

export async function generateMetadata() {
  const c = await getHome();
  const image = await shareImage(photoSrc(c.heroPhoto, IMAGES.hero));
  const title = `BeckYards Landscaping & Design — ${c.heroHeading}`;
  return {
    title: { absolute: title },
    description: SITE_DESCRIPTION,
    alternates: { canonical: '/' },
    openGraph: {
      title,
      description: SITE_DESCRIPTION,
      url: '/',
      siteName: 'BeckYards Landscaping & Design',
      type: 'website',
      locale: 'en_US',
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: SITE_DESCRIPTION,
      images: [image.url],
    },
  };
}

// Descriptions for the curated IMAGES.featured photos, in the same order. Only
// used when the portfolio has too few photos; saved portfolio photos use their own alt.
const FEATURED_ALTS = [
  'A winding mulch bed with layered plantings leading to a front porch',
  'A lawn mowed in crisp, even stripes',
  'A fresh black mulch bed with a clean, curved edge',
  'A flowering tree in a freshly edged mulch ring',
  'A striped lawn lined with tall evergreens',
  'A brick home with freshly mulched shrub beds',
  'Hostas and ferns in a clean mulch bed along a stone foundation',
  'A neat home with a striped front lawn and mature tree',
];

// Six to eight photos laid out as an asymmetric grid: the first landscape photo
// takes the big 2x2 tile, the first portrait photo the tall tile, the rest fill in.
async function buildMosaic(portfolio) {
  const saved = (Array.isArray(portfolio) ? portfolio : []).filter((p) => p?.src);
  const items =
    saved.length >= 6
      ? saved.slice(0, 8).map((p) => ({
          src: p.src,
          alt: (p.alt || '').trim(),
          focalX: p.focalX,
          focalY: p.focalY,
        }))
      : IMAGES.featured.slice(0, 8).map((src, i) => ({ src, alt: FEATURED_ALTS[i] || '' }));

  const sizes = await getImageSizes(items.map((i) => i.src));
  const tagged = items.map((i) => {
    const { width, height } = sizes.get(i.src);
    return { ...i, landscape: width >= height };
  });

  const slots = new Array(tagged.length).fill(null);
  const rest = [...tagged];
  const take = (pred) => {
    const idx = rest.findIndex(pred);
    return idx >= 0 ? rest.splice(idx, 1)[0] : null;
  };
  slots[0] = take((p) => p.landscape);
  if (slots.length > 2) slots[2] = take((p) => !p.landscape);
  for (let i = 0; i < slots.length; i += 1) if (!slots[i]) slots[i] = rest.shift();
  return slots.filter(Boolean);
}

const TILE_NAMES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

const SERVICE_SIZES = '(min-width: 1280px) 400px, (min-width: 900px) 33vw, (min-width: 640px) 50vw, 100vw';

export default async function Home() {
  const [services, programs, c, contactContent, portfolio] = await Promise.all([
    getContent('services', SERVICES),
    getContent('programs', PROGRAMS),
    getHome(),
    getContent('contact', CONTACT_PAGE_DEFAULT),
    getContent('portfolio', PORTFOLIO_DEFAULT),
  ]);

  const aeration = getService('aeration-overseeding', services);
  const mosaic = await buildMosaic(portfolio);

  const heroSrc = photoSrc(c.heroPhoto, IMAGES.hero);
  const beforeSrc = photoSrc(c.beforePhoto, IMAGES.beforeAfter.before);
  const afterSrc = photoSrc(c.afterPhoto, IMAGES.beforeAfter.after);
  const compare = await getImageSize(afterSrc);

  const heroServices = String(c.heroEyebrow || '')
    .split('•')
    .map((s) => s.trim())
    .filter(Boolean);
  const trust = Array.isArray(c.heroTrust) ? c.heroTrust.filter(Boolean) : [];
  const whyPoints = Array.isArray(c.whyPoints) ? c.whyPoints : [];

  return (
    <>
      <Header />

      <main id="main">
        {/* 1. Hero */}
        <section className="page-hero page-hero--tall home-hero" aria-labelledby="home-hero-title">
          <div className="page-hero-media">
            <SmartImage src={heroSrc} alt="" fill priority sizes="100vw" quality={75} />
          </div>
          <div className="wrap page-hero-inner">
            {heroServices.length > 0 && (
              <ul className="home-hero__services rise" style={{ '--i': 0 }} aria-label="What we do">
                {heroServices.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            )}
            <h1 id="home-hero-title" className="display home-hero__title rise" style={{ '--i': 1 }}>
              {c.heroHeading}
            </h1>
            {c.heroSubheading && (
              <p className="lead home-hero__lead rise" style={{ '--i': 2 }}>
                {c.heroSubheading}
              </p>
            )}
            <div className="cluster page-hero-actions rise" style={{ '--i': 3 }}>
              <Link className="btn btn-solid btn-lg btn-arrow" href="/contact">
                {c.heroCtaLabel}
              </Link>
              {c.heroSecondaryCtaLabel && (
                <Link className="btn btn-outline-light btn-lg" href="/portfolio">
                  {c.heroSecondaryCtaLabel}
                </Link>
              )}
            </div>
            {trust.length > 0 && (
              <ul className="home-hero__trust rise" style={{ '--i': 4 }}>
                {trust.map((t) => (
                  <li key={t}>
                    <HomeIcon name="check" />
                    {t}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* 2. Services */}
        <section className="section section--paper" id="services" aria-labelledby="home-services-title">
          <div className="wrap">
            <div className="section-head section-head--split">
              <p className="eyebrow eyebrow--rule">{c.servicesEyebrow}</p>
              <h2 id="home-services-title">{c.servicesHeading}</h2>
              <p className="lead">{c.servicesIntro}</p>
              {c.servicesLinkLabel && (
                <div className="section-head-action">
                  <Link className="link-arrow" href="/services">
                    {c.servicesLinkLabel}
                  </Link>
                </div>
              )}
            </div>

            <ul className="home-services__grid">
              {services.map((service) => (
                <li key={service.slug}>
                  <Link className="photo-card home-svc reveal" href={`/services/${service.slug}`}>
                    <div className="photo-card-media">
                      <SmartImage
                        src={serviceImage(service)}
                        alt=""
                        fill
                        sizes={SERVICE_SIZES}
                        quality={75}
                      />
                    </div>
                    <span className="home-svc__arrow" aria-hidden="true">
                      <HomeIcon name="arrow" />
                    </span>
                    <div className="photo-card-body">
                      <h3 className="photo-card-title">{service.title}</h3>
                      <p className="photo-card-text">{service.tag || service.subtitle}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 2b. Leaf cleanup (seasonal, now booking) */}
        {String(c.leafHeading || '').trim() && (
          <section className="section section--white home-leaf" id="leaf-cleanup" aria-labelledby="home-leaf-title">
            <div className="wrap">
              <div className="split split--7-5 home-leaf__split">
                <div className="stack stack--lg">
                  <div className="stack stack--sm">
                    {c.leafEyebrow && <p className="eyebrow eyebrow--rule">{c.leafEyebrow}</p>}
                    <h2 id="home-leaf-title">{c.leafHeading}</h2>
                    {c.leafNote && <span className="badge badge--solid home-leaf__note">{c.leafNote}</span>}
                  </div>
                  {c.leafBody && <p className="lead home-leaf__body">{c.leafBody}</p>}
                  <div className="cluster cluster--lg">
                    <Link className="btn btn-solid btn-lg btn-arrow" href="/leaf-cleanup-signup">
                      {c.leafCtaLabel || 'Sign Up'}
                    </Link>
                    {c.leafDetailsLabel && (
                      <Link className="link-arrow" href="/services/seasonal-cleanups">
                        {c.leafDetailsLabel}
                      </Link>
                    )}
                  </div>
                </div>
                <div className="media-frame ratio-4-3 media-frame--shadow home-leaf__media">
                  <SmartImage
                    src={photoSrc(c.leafPhoto, IMAGES.services['seasonal-cleanups'])}
                    alt={photoAlt(c.leafPhoto)}
                    fill
                    sizes="(min-width: 1280px) 460px, (min-width: 900px) 40vw, 100vw"
                    quality={75}
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 3. Aeration (seasonal) */}
        {aeration && (
          <section className="section section--dark home-aeration" id="aeration" aria-labelledby="home-aeration-title">
            <div className="wrap">
              <div className="split split--5-7">
                <div className="media-frame ratio-4-3 media-frame--shadow home-aeration__media">
                  <SmartImage
                    src={photoSrc(c.aerationPhoto, serviceImage(aeration))}
                    alt={photoAlt(c.aerationPhoto)}
                    fill
                    sizes="(min-width: 1280px) 500px, (min-width: 900px) 42vw, 100vw"
                    quality={75}
                  />
                </div>
                <div className="stack stack--lg">
                  <div className="stack stack--sm">
                    <p className="eyebrow eyebrow--rule">{c.aerationEyebrow}</p>
                    <h2 id="home-aeration-title">{c.aerationHeading}</h2>
                    {c.aerationNote && <span className="badge badge--solid home-aeration__note">{c.aerationNote}</span>}
                  </div>
                  <p className="home-aeration__body">{aeration.body}</p>
                  {aeration.highlights?.length > 0 && (
                    <ul className="check-list">
                      {aeration.highlights.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  )}
                  <div className="cluster cluster--lg">
                    <Link className="btn btn-solid btn-lg btn-arrow" href="/aeration-signup">
                      {c.aerationCtaLabel}
                    </Link>
                    {c.aerationDetailsLabel && (
                      <Link className="link-arrow" href="/services/aeration-overseeding">
                        {c.aerationDetailsLabel}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 4. Before / after */}
        <section className="section section--sage" id="difference" aria-labelledby="home-ba-title">
          <div className="wrap">
            <div className="split split--7-5 home-ba-split">
              <div className="stack stack--lg home-ba-copy">
                <div className="stack stack--sm">
                  <p className="eyebrow eyebrow--rule">{c.beforeAfterEyebrow}</p>
                  <h2 id="home-ba-title">{c.beforeAfterHeading}</h2>
                </div>
                <p className="lead">{c.beforeAfterBody}</p>
                {c.beforeAfterLinkLabel && (
                  <div>
                    <Link className="btn btn-outline btn-arrow" href="/portfolio">
                      {c.beforeAfterLinkLabel}
                    </Link>
                  </div>
                )}
              </div>
              <BeforeAfterSlider
                width={compare.width}
                height={compare.height}
                beforeLabel={c.beforeLabel}
                afterLabel={c.afterLabel}
                hint={c.beforeAfterHint}
                beforeImage={
                  <SmartImage
                    src={beforeSrc}
                    alt={photoAlt(c.beforePhoto, 'Before')}
                    fill
                    sizes="(min-width: 1280px) 480px, (min-width: 900px) 40vw, 100vw"
                    quality={75}
                    draggable={false}
                  />
                }
                afterImage={
                  <SmartImage
                    src={afterSrc}
                    alt={photoAlt(c.afterPhoto, 'After')}
                    fill
                    sizes="(min-width: 1280px) 480px, (min-width: 900px) 40vw, 100vw"
                    quality={75}
                    draggable={false}
                  />
                }
              />
            </div>
          </div>
        </section>

        {/* 5. Featured work */}
        <section className="section section--paper" id="work" aria-labelledby="home-work-title">
          <div className="wrap">
            <div className="section-head section-head--split">
              <p className="eyebrow eyebrow--rule">{c.featuredEyebrow}</p>
              <h2 id="home-work-title">{c.featuredHeading}</h2>
              <p className="lead">{c.featuredIntro}</p>
            </div>

            <div className="home-mosaic" data-count={mosaic.length}>
              {mosaic.map((photo, i) => {
                const large = i === 0;
                return (
                  <Link
                    key={photo.src}
                    className={`home-mosaic__tile home-mosaic__tile--${TILE_NAMES[i]}`}
                    href="/portfolio"
                  >
                    <SmartImage
                      src={photo.src}
                      alt={photo.alt || 'Recent BeckYards landscaping project'}
                      fill
                      sizes={
                        large
                          ? '(min-width: 1280px) 600px, (min-width: 900px) 50vw, 100vw'
                          : '(min-width: 1280px) 300px, (min-width: 900px) 25vw, 50vw'
                      }
                      quality={large ? 75 : 60}
                      style={{ objectPosition: `${photo.focalX ?? 50}% ${photo.focalY ?? 50}%` }}
                    />
                    <span className="home-mosaic__open" aria-hidden="true">
                      <HomeIcon name="arrow-up-right" />
                    </span>
                  </Link>
                );
              })}
            </div>

            <div className="home-mosaic__foot">
              <Link className="btn btn-solid btn-lg btn-arrow" href="/portfolio">
                {c.featuredCtaLabel}
              </Link>
            </div>
          </div>
        </section>

        {/* 6. Why BeckYards */}
        <section className="section section--white home-why" id="why-us" aria-labelledby="home-why-title">
          <div className="wrap">
            <div className="grid-12 grid--gap-lg">
              <div className="col-5 stack stack--lg home-why__intro">
                <div className="stack stack--sm">
                  <p className="eyebrow eyebrow--rule">{c.whyEyebrow}</p>
                  <h2 id="home-why-title">{c.whyHeading}</h2>
                </div>
                <p className="lead">{c.whyBody}</p>
                {c.whyLinkLabel && (
                  <div>
                    <Link className="link-arrow" href="/about">
                      {c.whyLinkLabel}
                    </Link>
                  </div>
                )}
              </div>

              <ul className="col-7 home-why__list">
                {whyPoints.map((point, i) => (
                  <li className="home-why__item reveal" key={`${point.title}-${i}`}>
                    <span className="icon-box">
                      <HomeIcon name={point.icon} />
                    </span>
                    <div>
                      <h3 className="home-why__title">{point.title}</h3>
                      <p className="home-why__body">{point.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 7. Programs */}
        <section className="section section--sage" id="programs" aria-labelledby="home-programs-title">
          <div className="wrap">
            <div className="section-head section-head--split">
              <p className="eyebrow eyebrow--rule">{c.programsEyebrow}</p>
              <h2 id="home-programs-title">{c.programsHeading}</h2>
              <p className="lead">{c.programsIntro}</p>
              {c.programsLinkLabel && (
                <div className="section-head-action">
                  <Link className="link-arrow" href="/programs">
                    {c.programsLinkLabel}
                  </Link>
                </div>
              )}
            </div>

            <ul className="home-programs__grid">
              {programs.map((program) => (
                <li key={program.slug}>
                  <Link className="card card--link home-program reveal" href={`/programs/${program.slug}`}>
                    <div className="media-frame ratio-4-3 media-frame--zoom home-program__media">
                      <SmartImage
                        src={programImage(program)}
                        alt=""
                        fill
                        sizes="(min-width: 1280px) 390px, (min-width: 900px) 33vw, (min-width: 640px) 50vw, 100vw"
                        quality={75}
                      />
                    </div>
                    <div className="home-program__body">
                      {program.eyebrow && <p className="eyebrow">{program.eyebrow}</p>}
                      <h3 className="home-program__name">{program.name}</h3>
                      <p className="home-program__pitch">{program.pitch || program.title}</p>
                      <span className="link-arrow home-program__more">{program.ctaLabel || 'Learn more'}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 8. Final call to action, then the quote form */}
        <section className="cta-band" aria-labelledby="home-cta-title">
          <div className="cta-band-media">
            <SmartImage
              src={photoSrc(c.ctaPhoto, IMAGES.heroAlternates[3] || IMAGES.hero)}
              alt=""
              fill
              sizes="100vw"
              quality={60}
            />
          </div>
          <div className="wrap cta-band-inner">
            <div className="cta-band-text">
              {c.ctaEyebrow && <p className="eyebrow eyebrow--rule">{c.ctaEyebrow}</p>}
              <h2 id="home-cta-title">{c.ctaHeading}</h2>
              <p>{c.ctaBody}</p>
            </div>
            <div className="cluster">
              <a className="btn btn-light btn-lg btn-arrow" href="#contact">
                {c.ctaButtonLabel}
              </a>
            </div>
          </div>
        </section>

        <Contact c={contactContent} compact />
      </main>

      <Footer />
    </>
  );
}
