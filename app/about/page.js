import Header from '../components/Header';
import Footer from '../components/Footer';
import { getContent } from '../../lib/siteContent';
import { ABOUT_DEFAULT } from '../../lib/pageContent';

export const revalidate = 60;

export const metadata = {
  title: 'About — BeckYards',
  description: 'About BeckYards Landscaping & Design.',
};

export default async function AboutPage() {
  const c = await getContent('about', ABOUT_DEFAULT);

  return (
    <>
      <Header />

      <main>
        <div className="wrap">
          <section className="section" id="about">
            <div className="section-head">
              <div>
                <div className="eyebrow">{c.eyebrow}</div>
                <h2>{c.heading}</h2>
              </div>
              <p>{c.intro}</p>
            </div>
            <p className="prose">{c.body}</p>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
