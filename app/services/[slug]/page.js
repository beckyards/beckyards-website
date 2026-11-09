import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import SmartImage from '../../components/SmartImage';
import { SERVICES, SERVICES_PAGE, getService, serviceImage, serviceGallery } from '../../../lib/services';
import { getContent } from '../../../lib/siteContent';
import { getImageSizes } from '../../../lib/imageSize';
import { focalStyle, ogImageFor } from '../shared';
import '../services.css';

export const revalidate = 60;

const D = SERVICES_PAGE.detail;

export function generateStaticParams() {
  return SERVICES.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const services = await getContent('services', SERVICES);
  const service = getService(slug, services);
  if (!service) return {};
  const url = `/services/${service.slug}`;
  return {
    title: service.title,
    description: service.subtitle,
    alternates: { canonical: url },
    openGraph: {
      title: service.title,
      description: service.subtitle,
      url,
      images: ogImageFor(serviceImage(service)),
    },
  };
}

// First sentence becomes the large lead; the rest stays a calm paragraph.
// A body the admin split into paragraphs (blank lines) is respected as written.
function splitBody(body) {
  const blocks = String(body || '').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length > 1) return { lead: blocks[0], rest: blocks.slice(1) };
  const text = blocks[0] || '';
  const match = text.match(/^(.+?[.!?])\s+(.+)$/s);
  return match ? { lead: match[1], rest: [match[2]] } : { lead: text, rest: [] };
}

export default async function ServicePage({ params }) {
  const { slug } = await params;
  const services = await getContent('services', SERVICES);
  const service = getService(slug, services);
  if (!service) notFound();

  const isAeration = service.slug === 'aeration-overseeding';
  const image = serviceImage(service);
  const highlights = service.highlights || [];
  const { lead, rest } = splitBody(service.body);
  const others = services.filter((s) => s.slug !== service.slug);

  const gallery = serviceGallery(service).slice(0, 6);
  const sizes = await getImageSizes(gallery.map((g) => g.src));
  const portraitCount = gallery.filter((g) => {
    const s = sizes.get(g.src);
    return s.height > s.width;
  }).length;
  const portrait = gallery.length > 0 && portraitCount > gallery.length / 2;

  const primary = isAeration
    ? { href: '/aeration-signup', label: D.signupCta }
    : { href: '/contact', label: D.quoteCta };

  return (
    <>
      <Header />

      <main id="main">
        <section className="page-hero">
          <div className="page-hero-media">
            <SmartImage src={image} alt="" fill priority sizes="100vw" quality={75} />
          </div>
          <div className="wrap page-hero-inner">
            <nav className="breadcrumb rise" style={{ '--i': 0 }} aria-label="Breadcrumb">
              <ol>
                <li><Link href="/">{D.breadcrumbHome}</Link></li>
                <li><Link href="/services">{D.breadcrumbServices}</Link></li>
                <li aria-current="page">{service.title}</li>
              </ol>
            </nav>
            {service.tag && (
              <span className="badge badge--light svc-hero-badge rise" style={{ '--i': 1 }}>{service.tag}</span>
            )}
            <h1 className="rise" style={{ '--i': 2 }}>{service.title}</h1>
            <p className="lead rise" style={{ '--i': 3 }}>{service.subtitle}</p>
            <div className="cluster page-hero-actions rise" style={{ '--i': 4 }}>
              <Link className="btn btn-solid btn-lg btn-arrow" href={primary.href}>{primary.label}</Link>
              {isAeration && (
                <Link className="btn btn-outline-light btn-lg" href="/contact">{D.askCta}</Link>
              )}
              {service.slug === 'seasonal-cleanups' && (
                <Link className="btn btn-outline-light btn-lg" href="/leaf-cleanup-signup">Leaf cleanup signup</Link>
              )}
            </div>
          </div>
        </section>

        <section className="section section--paper" aria-labelledby="svc-about">
          <div className="wrap split split--7-5 split--top">
            <div>
              <h2 className="sr-only" id="svc-about">{service.title}</h2>
              <p className="svc-lead">{lead}</p>
              {rest.length > 0 && (
                <div className="prose svc-prose">
                  {rest.map((para) => (
                    <p key={para}>{para}</p>
                  ))}
                </div>
              )}
            </div>

            <aside className="svc-aside" aria-label={isAeration ? D.pricingTitle : D.includedTitle}>
              <div className="card card--accent">
                <h2 className="card-title">{isAeration ? D.pricingTitle : D.includedTitle}</h2>
                {highlights.length > 0 && (
                  <ul className="check-list">
                    {highlights.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                )}
                <div className="svc-aside-actions">
                  <Link className="btn btn-solid btn-block btn-arrow" href={primary.href}>{primary.label}</Link>
                  {isAeration && (
                    <Link className="btn btn-outline btn-block" href="/contact">{D.askCta}</Link>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </section>

        {gallery.length > 0 && (
          <section className="section section--white" aria-labelledby="svc-gallery">
            <div className="wrap">
              <div className="section-head">
                <p className="eyebrow eyebrow--rule">{D.galleryEyebrow}</p>
                <h2 id="svc-gallery">{D.galleryHeading}</h2>
              </div>
              <div className="svc-gallery">
                {gallery.map((item) => (
                  <figure className="svc-gallery-item" key={item.src}>
                    <div className={`media-frame ${portrait ? 'ratio-4-5' : 'ratio-4-3'}`}>
                      <SmartImage
                        src={item.src}
                        alt={item.alt || `${service.title} work by BeckYards`}
                        fill
                        sizes="(min-width: 1280px) 400px, (min-width: 640px) 33vw, 100vw"
                        quality={75}
                        style={focalStyle(item)}
                      />
                      {item.label && <span className="badge badge--light media-label">{item.label}</span>}
                    </div>
                  </figure>
                ))}
              </div>
            </div>
          </section>
        )}

        {others.length > 0 && (
          <section className="section section--sage" aria-labelledby="svc-more">
            <div className="wrap">
              <div className="section-head">
                <p className="eyebrow eyebrow--rule">{D.moreEyebrow}</p>
                <h2 id="svc-more">{D.moreHeading}</h2>
              </div>
              <ul className="svc-more">
                {others.map((other) => (
                  <li key={other.slug}>
                    <Link className="svc-more-card" href={`/services/${other.slug}`}>
                      <span className="svc-more-thumb">
                        <SmartImage
                          src={serviceImage(other)}
                          alt=""
                          fill
                          sizes="(min-width: 1100px) 230px, (min-width: 640px) 33vw, 96px"
                          quality={60}
                        />
                      </span>
                      <span className="svc-more-text">
                        <span className="svc-more-title">{other.title}</span>
                        {other.tag && <span className="svc-more-tag">{other.tag}</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <section className="cta-band" aria-labelledby="svc-cta">
          <div className="cta-band-media">
            <SmartImage src={gallery[1]?.src || image} alt="" fill sizes="100vw" quality={60} />
          </div>
          <div className="wrap cta-band-inner">
            <div className="cta-band-text">
              <h2 id="svc-cta">{D.ctaHeading}</h2>
              <p>{isAeration ? D.ctaTextAeration : D.ctaText}</p>
            </div>
            <div className="cluster">
              <Link className="btn btn-light btn-lg btn-arrow" href={primary.href}>{primary.label}</Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
