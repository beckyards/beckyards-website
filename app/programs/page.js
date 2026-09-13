import Header from '../components/Header';
import Footer from '../components/Footer';
import Contact from '../components/Contact';
import { PROGRAMS } from '../../lib/programs';
import { CONTACT_PAGE_DEFAULT } from '../../lib/pageContent';
import { getContent } from '../../lib/siteContent';

export const revalidate = 60;

export const metadata = {
  title: 'Signature Programs — BeckYards',
  description: 'Green+ and Spring+ — structured, trackable landscaping programs for commercial properties.',
};

export default async function ProgramsPage() {
  const programs = await getContent('programs', PROGRAMS);
  const c = await getContent('contact', CONTACT_PAGE_DEFAULT);

  return (
    <>
      <Header />

      <main>
        <div className="wrap">
          <section className="section" id="programs">
            <div className="section-head">
              <div>
                <div className="eyebrow">Programs</div>
                <h2>Signature Programs</h2>
              </div>
              <p>Structured, trackable programs built for commercial properties.</p>
            </div>
            <div className="offer-card-list">
              {programs.map((program) => (
                <div className="offer-card" key={program.slug}>
                  <div className="eyebrow">{program.eyebrow}</div>
                  <h3>{program.name}</h3>
                  <p className="subhead">{program.title}</p>
                  <p>{program.body}</p>
                  {program.highlights?.length > 0 && (
                    <ul>
                      {program.highlights.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  )}
                  <a className="btn btn-outline" href={`/programs/${program.slug}`}>{program.ctaLabel || 'Learn more'}</a>
                </div>
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
