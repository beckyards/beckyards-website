import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Contact from '../components/Contact';
import SmartImage from '../components/SmartImage';
import { getContent } from '../../lib/siteContent';
import { CONTACT_PAGE_DEFAULT } from '../../lib/pageContent';
import { socialMeta } from '../../lib/seo';

export const revalidate = 60;

const DESCRIPTION =
  'Request a free landscaping quote from BeckYards Landscaping & Design. Tell us about your property and the work you have in mind.';

export const metadata = {
  title: 'Contact',
  description: DESCRIPTION,
  alternates: { canonical: '/contact' },
  ...socialMeta({
    title: 'Contact',
    description: DESCRIPTION,
    path: '/contact',
    image: CONTACT_PAGE_DEFAULT.image,
  }),
};

export default async function ContactPage() {
  const c = await getContent('contact', CONTACT_PAGE_DEFAULT);

  return (
    <>
      <Header />
      <main id="main">
        <section className="page-hero forms-hero">
          {c.image && (
            <div className="page-hero-media">
              <SmartImage src={c.image} alt="" fill priority sizes="100vw" quality={75} />
            </div>
          )}
          <div className="wrap page-hero-inner">
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <ol>
                <li><Link href="/">Home</Link></li>
                <li aria-current="page">Contact</li>
              </ol>
            </nav>
            <h1 className="h1">{c.heroHeading}</h1>
            <p className="lead">{c.heroLead}</p>
          </div>
        </section>

        <Contact c={c} compact />
      </main>
      <Footer />
    </>
  );
}
