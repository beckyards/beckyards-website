import Link from 'next/link';
import Header from './components/Header';
import Footer from './components/Footer';

export const metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main">
        <section className="page-hero">
          <div className="wrap page-hero-inner">
            <p className="eyebrow eyebrow--rule">404</p>
            <h1 className="display">This page took a day off</h1>
            <p className="lead">We could not find what you were looking for. Head back home, or tell us about your yard and we will take it from there.</p>
            <div className="cluster page-hero-actions">
              <Link className="btn btn-solid btn-lg btn-arrow" href="/">Back to home</Link>
              <Link className="btn btn-outline-light btn-lg" href="/contact">Get a free quote</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
