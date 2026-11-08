import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SmartImage from '../components/SmartImage';
import PortfolioGallery from './PortfolioGallery';
import { getContent } from '../../lib/siteContent';
import { PORTFOLIO_DEFAULT } from '../../lib/pageContent';
import { getImageSizes } from '../../lib/imageSize';
import { mediaUrl } from '../../lib/media';
import { socialMeta } from '../../lib/seo';
import './portfolio.css';

export const revalidate = 60;

// The portfolio content key is a bare photo list, so this page's headings live
// here rather than in the admin editor.
const HERO_IMAGE = mediaUrl('photo-25.jpeg');
const CTA_IMAGE = mediaUrl('photo-34.jpeg');

const DESCRIPTION =
  'Recent lawn care and landscaping work from BeckYards Landscaping & Design: striped lawns, fresh beds, and cleanups.';

export const metadata = {
  title: 'Portfolio',
  description: DESCRIPTION,
  alternates: { canonical: '/portfolio' },
  ...socialMeta({ title: 'Portfolio', description: DESCRIPTION, path: '/portfolio', image: HERO_IMAGE }),
};

export default async function PortfolioPage() {
  const saved = await getContent('portfolio', PORTFOLIO_DEFAULT);
  const entries = Array.isArray(saved)
    ? saved.filter((p) => p && typeof p.src === 'string' && p.src.trim() !== '')
    : [];

  const sizes = await getImageSizes(entries.map((p) => p.src.trim()));
  const photos = entries.map((p, i) => {
    const src = p.src.trim();
    const owned = typeof p.alt === 'string' ? p.alt.trim() : '';
    const { width, height } = sizes.get(src);
    return {
      src,
      width,
      height,
      alt: owned || 'Recent BeckYards landscaping work',
      caption: owned,
    };
  });

  return (
    <>
      <Header />

      <main id="main">
        <section className="page-hero pf-hero">
          <div className="page-hero-media">
            <SmartImage src={HERO_IMAGE} alt="" fill priority sizes="100vw" quality={75} />
          </div>
          <div className="wrap page-hero-inner">
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <ol>
                <li>
                  <Link href="/">Home</Link>
                </li>
                <li aria-current="page">Portfolio</li>
              </ol>
            </nav>
            <p className="eyebrow eyebrow--rule">Portfolio</p>
            <h1 className="display">Recent Work</h1>
            <p className="lead">
              Lawns, beds, and cleanups from recent BeckYards jobs. Tap any photo to see it full screen.
            </p>
          </div>
        </section>

        <section className="section section--paper section--sm" aria-label="Photo gallery">
          <div className="wrap">
            {photos.length > 0 ? (
              <>
                <div className="pf-intro">
                  <p className="pf-count">
                    {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
                  </p>
                  <p className="pf-hint">Open any photo, then use the arrow keys or swipe to browse.</p>
                </div>
                <PortfolioGallery photos={photos} />
              </>
            ) : (
              <div className="pf-empty">
                <p className="eyebrow eyebrow--rule">Photos coming soon</p>
                <h2>New Work Is On the Way</h2>
                <p>
                  We are adding photos from our latest projects. In the meantime, tell us about your
                  property and we will put together a free quote.
                </p>
                <Link className="btn btn-solid btn-lg btn-arrow" href="/contact">
                  Get a Free Quote
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="cta-band">
          <div className="cta-band-media">
            <SmartImage src={CTA_IMAGE} alt="" fill sizes="100vw" quality={60} />
          </div>
          <div className="wrap cta-band-inner">
            <div className="cta-band-text">
              <h2>Want Your Yard To Look Like This?</h2>
              <p>Tell us about your property and we will get back to you with a free quote.</p>
            </div>
            <div className="cluster">
              <Link className="btn btn-light btn-lg btn-arrow" href="/contact">
                Get a Free Quote
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
