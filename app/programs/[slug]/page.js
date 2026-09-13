import { notFound } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Contact from '../../components/Contact';
import { PROGRAMS, getProgram } from '../../../lib/programs';
import { CONTACT_PAGE_DEFAULT } from '../../../lib/pageContent';
import { getContent } from '../../../lib/siteContent';

export const revalidate = 60;

export function generateStaticParams() {
  return PROGRAMS.map((program) => ({ slug: program.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const programs = await getContent('programs', PROGRAMS);
  const program = getProgram(slug, programs);
  if (!program) return {};
  return {
    title: `${program.title} — BeckYards`,
    description: program.body,
  };
}

export default async function ProgramPage({ params }) {
  const { slug } = await params;
  const programs = await getContent('programs', PROGRAMS);
  const program = getProgram(slug, programs);
  if (!program) notFound();
  const c = await getContent('contact', CONTACT_PAGE_DEFAULT);

  return (
    <>
      <Header />

      <main>
        <div className="wrap">
          <section className="section service-detail" id="program-detail">
            <div className="section-head">
              <div>
                <div className="eyebrow">{program.eyebrow}</div>
                <h2>{program.title}</h2>
              </div>
            </div>
            <p>{program.body}</p>
            {program.highlights?.length > 0 && (
              <ul>
                {program.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            )}
            <a className="btn btn-solid" href="/contact">Get in Touch</a>
          </section>
        </div>

        <Contact c={c} />
      </main>

      <Footer />
    </>
  );
}
