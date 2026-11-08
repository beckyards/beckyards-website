import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AerationSignupForm from '../components/AerationSignupForm';
import SmartImage from '../components/SmartImage';
import { getContent } from '../../lib/siteContent';
import { SERVICES, getService } from '../../lib/services';
import { IMAGES } from '../../lib/siteImages';
import { socialMeta } from '../../lib/seo';

export const revalidate = 60;

const DESCRIPTION =
  'Sign up for lawn aeration and overseeding with BeckYards Landscaping & Design. A seasonal service with limited availability.';

export const metadata = {
  title: 'Aeration & Overseeding Signup',
  description: DESCRIPTION,
  alternates: { canonical: '/aeration-signup' },
  ...socialMeta({
    title: 'Aeration & Overseeding Signup',
    description: DESCRIPTION,
    path: '/aeration-signup',
    image: IMAGES.services['aeration-overseeding'],
  }),
};

export default async function AerationSignupPage() {
  const services = await getContent('services', SERVICES);
  const service = getService('aeration-overseeding', services) || getService('aeration-overseeding');

  return (
    <>
      <Header />
      <main id="main">
        <section className="page-hero forms-hero">
          <div className="page-hero-media">
            <SmartImage
              src={IMAGES.services['aeration-overseeding']}
              alt=""
              fill
              priority
              sizes="100vw"
              quality={75}
            />
          </div>
          <div className="wrap page-hero-inner">
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <ol>
                <li><Link href="/">Home</Link></li>
                <li><Link href="/services/aeration-overseeding">Aeration &amp; Overseeding</Link></li>
                <li aria-current="page">Signup</li>
              </ol>
            </nav>
            <p className="eyebrow">Seasonal Service</p>
            <h1 className="h1">Aeration &amp; Overseeding Signup</h1>
            <p className="lead">
              Give us your name and phone number and we’ll follow up with pricing and get you on the schedule.
            </p>
          </div>
        </section>

        <AerationSignupForm service={service} />
      </main>
      <Footer />
    </>
  );
}
