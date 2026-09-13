import { notFound } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Contact from '../../components/Contact';
import { SERVICES, getService } from '../../../lib/services';
import { CONTACT_PAGE_DEFAULT } from '../../../lib/pageContent';
import { getContent } from '../../../lib/siteContent';

export const revalidate = 60;

export function generateStaticParams() {
  return SERVICES.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const services = await getContent('services', SERVICES);
  const service = getService(slug, services);
  if (!service) return {};
  return {
    title: `${service.title} — BeckYards`,
    description: service.subtitle,
  };
}

export default async function ServicePage({ params }) {
  const { slug } = await params;
  const services = await getContent('services', SERVICES);
  const service = getService(slug, services);
  if (!service) notFound();
  const c = await getContent('contact', CONTACT_PAGE_DEFAULT);

  return (
    <>
      <Header />

      <main>
        <div className="wrap">
          <section className="section service-detail" id="service-detail">
            <div className="section-head">
              <div>
                <div className="eyebrow">{service.tag}</div>
                <h2>{service.title}</h2>
              </div>
              <p>{service.subtitle}</p>
            </div>
            <p>{service.body}</p>
            {service.highlights?.length > 0 && (
              <ul>
                {service.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            )}
            {service.slug === 'aeration-overseeding' ? (
              <a className="btn btn-solid" href="/aeration-signup">Sign Up</a>
            ) : (
              <a className="btn btn-solid" href="/contact">Get a Free Quote</a>
            )}
          </section>
        </div>

        <Contact c={c} />
      </main>

      <Footer />
    </>
  );
}
