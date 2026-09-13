import Header from './components/Header';
import Footer from './components/Footer';
import Contact from './components/Contact';
import { SERVICES } from '../lib/services';
import { PROGRAMS } from '../lib/programs';
import { HOME_DEFAULT, CONTACT_PAGE_DEFAULT } from '../lib/pageContent';
import { getContent } from '../lib/siteContent';

export const revalidate = 60;

export default async function Home() {
  const services = await getContent('services', SERVICES);
  const programs = await getContent('programs', PROGRAMS);
  const c = await getContent('home', HOME_DEFAULT);
  const contactContent = await getContent('contact', CONTACT_PAGE_DEFAULT);

  return (
    <>
      <Header />

      <main id="top">
        <section className="hero">
          <div className="hero-bg">
            <span className="bokeh b1"></span>
            <span className="bokeh b2"></span>
            <span className="bokeh b3"></span>
            <span className="bokeh b4"></span>
          </div>
          <div className="hero-scrim"></div>
          <div className="hero-content">
            <div className="eyebrow">{c.heroEyebrow}</div>
            <h1>{c.heroHeading}</h1>
            <div className="hero-ctas">
              <a className="btn btn-solid" href="/contact">{c.heroCtaLabel}</a>
            </div>
          </div>
        </section>

        <div className="wrap">
          <section className="section offers" id="services">
            <div className="section-head">
              <div>
                <div className="eyebrow">{c.servicesEyebrow}</div>
                <h2>{c.servicesHeading}</h2>
              </div>
              <p>{c.servicesIntro}</p>
            </div>
            <ul className="offer-list">
              {services.map((service, i) => (
                <li key={service.slug}>
                  <a href={`/services/${service.slug}`}>
                    <span className="offer-num" aria-hidden="true">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="offer-text">
                      <span className="offer-name">{service.title}</span>
                      <span className="offer-blurb">{service.subtitle}</span>
                    </span>
                    <span className="offer-arrow" aria-hidden="true">→</span>
                  </a>
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
                  <div className="eyebrow">{c.whyEyebrow}</div>
                  <h2>{c.whyHeading}</h2>
                </div>
              </div>
              <p className="prose">{c.whyBody}</p>
            </section>
          </div>
        </div>

        <div className="wrap">
          <section className="section" id="programs">
            <div className="section-head">
              <div>
                <div className="eyebrow">{c.programsEyebrow}</div>
                <h2>{c.programsHeading}</h2>
              </div>
              <p>{c.programsIntro}</p>
            </div>
            <div className="link-cards cols-2">
              {programs.map((program) => (
                <a className="link-card" href={`/programs/${program.slug}`} key={program.slug}>
                  <h3>{program.title}</h3>
                  <p>{program.body}</p>
                  <span className="link-card-cta">Learn more →</span>
                </a>
              ))}
            </div>
          </section>
        </div>

        <Contact c={contactContent} />
      </main>

      <Footer />
    </>
  );
}
