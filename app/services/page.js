import Header from '../components/Header';
import Footer from '../components/Footer';
import Contact from '../components/Contact';
import { SERVICES } from '../../lib/services';
import { CONTACT_PAGE_DEFAULT } from '../../lib/pageContent';
import { getContent } from '../../lib/siteContent';

export const revalidate = 60;

export const metadata = {
  title: 'Services — BeckYards',
  description: 'Lawn mowing, mulching, bed redesign, planting, seasonal cleanups, and aeration & overseeding from BeckYards Landscaping & Design.',
};

export default async function ServicesPage() {
  const services = await getContent('services', SERVICES);
  const c = await getContent('contact', CONTACT_PAGE_DEFAULT);

  return (
    <>
      <Header />

      <main>
        <div className="wrap">
          <section className="section" id="services">
            <div className="section-head">
              <div>
                <div className="eyebrow">Services</div>
                <h2>What We Do</h2>
              </div>
              <p>From weekly mowing to full bed redesigns — tap through for details.</p>
            </div>
            <div className="link-cards">
              {services.map((service) => (
                <a className="link-card" href={`/services/${service.slug}`} key={service.slug}>
                  <h3>{service.title}</h3>
                  <p>{service.subtitle}</p>
                  <span className="link-card-cta">Learn more →</span>
                </a>
              ))}
            </div>
          </section>
        </div>

        <Contact c={c} />
      </main>

      <Footer />
    </>
  );
}
