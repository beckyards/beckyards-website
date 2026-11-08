import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SmartImage from '../components/SmartImage';
import { SERVICES, SERVICES_PAGE, serviceImage } from '../../lib/services';
import { getContent } from '../../lib/siteContent';
import { ServiceIcon, ogImageFor } from './shared';
import './services.css';

export const revalidate = 60;

const P = SERVICES_PAGE.index;

export const metadata = {
  title: P.metaTitle,
  description: P.metaDescription,
  alternates: { canonical: '/services' },
  openGraph: {
    title: P.metaTitle,
    description: P.metaDescription,
    url: '/services',
    images: ogImageFor(P.heroImage),
  },
};

export default async function ServicesPage() {
  const services = await getContent('services', SERVICES);

  return (
    <>
      <Header />

      <main id="main">
        <section className="page-hero">
          <div className="page-hero-media">
            <SmartImage src={P.heroImage} alt="" fill priority sizes="100vw" quality={75} />
          </div>
          <div className="wrap page-hero-inner">
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <ol>
                <li><Link href="/">Home</Link></li>
                <li aria-current="page">Services</li>
              </ol>
            </nav>
            <p className="eyebrow eyebrow--rule rise" style={{ '--i': 0 }}>{P.eyebrow}</p>
            <h1 className="display rise" style={{ '--i': 1, maxWidth: '16ch' }}>{P.heading}</h1>
            <p className="lead rise" style={{ '--i': 2 }}>{P.intro}</p>
            <div className="cluster page-hero-actions rise" style={{ '--i': 3 }}>
              <Link className="btn btn-solid btn-lg btn-arrow" href="/contact">{P.primaryCta}</Link>
              <a className="btn btn-outline-light btn-lg" href="#services">{P.secondaryCta}</a>
            </div>
          </div>
        </section>

        <section className="section section--paper section--flush-bottom" id="services">
          <div className="wrap">
            <div className="section-head section-head--split section-head--rule" style={{ marginBottom: 0 }}>
              <p className="eyebrow">{P.listEyebrow}</p>
              <h2>{P.listHeading}</h2>
              <p className="lead">{P.listIntro}</p>
            </div>
          </div>
        </section>

        {services.map((service, i) => {
          const href = `/services/${service.slug}`;
          const highlights = (service.highlights || []).slice(0, 3);
          return (
            <section
              className={`svc-row ${i % 2 === 0 ? 'section--paper' : 'section--white'}`}
              key={service.slug}
              aria-labelledby={`svc-${service.slug}`}
            >
              <div className={`wrap split${i % 2 === 1 ? ' split--reverse' : ''}`}>
                <Link className="svc-row-media" href={href} tabIndex={-1} aria-hidden="true">
                  <div className="media-frame media-frame--zoom">
                    <SmartImage
                      src={serviceImage(service)}
                      alt=""
                      fill
                      sizes="(min-width: 1280px) 600px, (min-width: 900px) 46vw, 100vw"
                      quality={75}
                    />
                  </div>
                </Link>
                <div className="svc-row-body">
                  <span className="svc-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  {service.tag && <p className="eyebrow">{service.tag}</p>}
                  <h2 className="h2 svc-row-title" id={`svc-${service.slug}`}>
                    <Link href={href}>{service.title}</Link>
                  </h2>
                  <p className="lead">{service.subtitle}</p>
                  {highlights.length > 0 && (
                    <ul className="check-list">
                      {highlights.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  )}
                  <div className="cluster">
                    <Link className="btn btn-outline btn-arrow" href={href}>
                      {P.learnMore}<span className="sr-only">: {service.title}</span>
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          );
        })}

        <section className="section section--sage" aria-labelledby="svc-facts">
          <div className="wrap">
            <div className="section-head">
              <p className="eyebrow eyebrow--rule">{P.factsEyebrow}</p>
              <h2 id="svc-facts">{P.factsHeading}</h2>
            </div>
            <div className="grid-4 grid--gap-lg">
              {P.facts.map((fact) => (
                <div className="svc-fact" key={fact.title}>
                  <span className="icon-box"><ServiceIcon name={fact.icon} /></span>
                  <h3>{fact.title}</h3>
                  <p>{fact.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="cta-band" aria-labelledby="svc-cta">
          <div className="cta-band-media">
            <SmartImage src={P.ctaImage} alt="" fill sizes="100vw" quality={60} />
          </div>
          <div className="wrap cta-band-inner">
            <div className="cta-band-text">
              <h2 id="svc-cta">{P.ctaHeading}</h2>
              <p>{P.ctaText}</p>
            </div>
            <div className="cluster">
              <Link className="btn btn-light btn-lg btn-arrow" href="/contact">{P.ctaButton}</Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
