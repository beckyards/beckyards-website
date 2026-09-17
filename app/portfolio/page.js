import Header from '../components/Header';
import Footer from '../components/Footer';
import { getContent } from '../../lib/siteContent';
import { PORTFOLIO_DEFAULT } from '../../lib/pageContent';

export const revalidate = 60;

export const metadata = {
  title: 'Portfolio — BeckYards',
  description: 'Recent lawn care and landscaping work from BeckYards Landscaping & Design.',
};

export default async function PortfolioPage() {
  const allPhotos = await getContent('portfolio', PORTFOLIO_DEFAULT);
  const photos = (allPhotos || []).filter((p) => p?.src);

  return (
    <>
      <Header />

      <main>
        <div className="wrap">
          <section className="section" id="portfolio">
            <div className="section-head">
              <div>
                <div className="eyebrow">Portfolio</div>
                <h2>Recent Work</h2>
              </div>
              <p>A look at some of our recent lawn care and landscaping projects.</p>
            </div>
            {photos.length > 0 ? (
              <div className="photo-grid">
                {photos.map((photo, i) => (
                  <div className="photo-grid-item" key={photo.src || i}>
                    <img src={photo.src} alt={photo.alt || ''} loading="lazy" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="photo-grid-empty">Photos coming soon — check back after our next project.</p>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
