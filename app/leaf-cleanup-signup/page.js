import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LeafCleanupSignupForm from '../components/LeafCleanupSignupForm';
import SmartImage from '../components/SmartImage';
import { IMAGES } from '../../lib/siteImages';
import { socialMeta } from '../../lib/seo';
import { LEAF_CLEANUP_SEASON } from '../../lib/seasons';

export const revalidate = 60;

const TITLE = 'Leaf Cleanup Signup';
const DESCRIPTION =
  'Sign up for fall leaf cleanup with BeckYards Landscaping & Design. We clear leaves from your lawn and beds and leave your yard neat and ready for winter.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/leaf-cleanup-signup' },
  ...socialMeta({
    title: TITLE,
    description: DESCRIPTION,
    path: '/leaf-cleanup-signup',
    image: IMAGES.services['seasonal-cleanups'],
  }),
};

export default function LeafCleanupSignupPage() {
  return (
    <>
      <Header />
      <main id="main">
        <section className="page-hero forms-hero">
          <div className="page-hero-media">
            <SmartImage
              src={IMAGES.services['seasonal-cleanups']}
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
                <li><Link href="/services/seasonal-cleanups">Seasonal Cleanups</Link></li>
                <li aria-current="page">Leaf Cleanup Signup</li>
              </ol>
            </nav>
            <p className="eyebrow">Now Booking · {LEAF_CLEANUP_SEASON}</p>
            <h1 className="h1">Leaf Cleanup Signup</h1>
            <p className="lead">
              Leaves down? Give us your name and phone number and we’ll follow up with a quote and get you on the schedule.
            </p>
          </div>
        </section>

        <LeafCleanupSignupForm season={LEAF_CLEANUP_SEASON} />
      </main>
      <Footer />
    </>
  );
}
