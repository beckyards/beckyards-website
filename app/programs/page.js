import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SmartImage from '../components/SmartImage';
import ProgramIcon, { ProgramName } from './ProgramIcon';
import { socialMeta } from '../../lib/seo';
import { PROGRAMS, PROGRAMS_PAGE as T, programImage } from '../../lib/programs';
import { IMAGES } from '../../lib/siteImages';
import { getContent } from '../../lib/siteContent';
import './programs.css';

export const revalidate = 60;

export const metadata = {
  title: 'Signature Programs',
  description:
    'Green+ and Spring+ for commercial properties, and Community+ for neighbors who need lawn care that works with their budget.',
  alternates: { canonical: '/programs' },
  ...socialMeta({
    title: 'Signature Programs',
    description: 'Green+, Spring+ and Community+: landscaping programs built around the customer.',
    path: '/programs',
    image: IMAGES.programs.hero,
  }),
};

const isNeighborhood = (p) => p.slug === 'community-plus' || p.eyebrow === 'Neighborhood';

export default async function ProgramsPage() {
  const programs = await getContent('programs', PROGRAMS);
  const enterprise = programs.filter((p) => !isNeighborhood(p));
  const neighborhood = programs.filter(isNeighborhood);

  return (
    <>
      <Header />

      <main id="main">
        <section className="page-hero">
          <div className="page-hero-media">
            <SmartImage src={IMAGES.programs.hero} alt="" fill priority sizes="100vw" quality={85} />
          </div>
          <div className="wrap page-hero-inner">
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <ol>
                <li><Link href="/">Home</Link></li>
                <li aria-current="page">Programs</li>
              </ol>
            </nav>
            <p className="eyebrow eyebrow--rule rise" style={{ '--i': 0 }}>{T.heroEyebrow}</p>
            <h1 className="display rise" style={{ '--i': 1 }}>{T.heroHeading}</h1>
            <p className="lead rise" style={{ '--i': 2 }}>{T.heroLead}</p>
          </div>
        </section>

        {enterprise.length > 0 && (
          <section className="section section--paper" aria-labelledby="prog-enterprise">
            <div className="wrap">
              <div className="section-head section-head--split section-head--rule">
                <p className="eyebrow">{T.enterpriseEyebrow}</p>
                <h2 id="prog-enterprise">{T.enterpriseHeading}</h2>
                <p className="lead">{T.enterpriseLead}</p>
              </div>

              <div className="prog-list">
                {enterprise.map((program, i) => (
                  <article className={`prog-feature${i % 2 ? ' prog-feature--flip' : ''}`} key={program.slug}>
                    <Link className="prog-feature__media" href={`/programs/${program.slug}`} tabIndex={-1} aria-hidden="true">
                      <SmartImage
                        src={programImage(program)}
                        alt=""
                        fill
                        sizes="(min-width: 900px) 40vw, 100vw"
                        quality={75}
                      />
                      <span className="badge badge--light prog-feature__tag">{program.eyebrow}</span>
                    </Link>
                    <div className="prog-feature__body">
                      <span className="icon-box"><ProgramIcon slug={program.slug} /></span>
                      <h3 className="prog-name"><ProgramName name={program.name} /></h3>
                      <p className="prog-title">{program.title}</p>
                      {program.pitch && <p className="prog-pitch">{program.pitch}</p>}
                      {program.highlights?.length > 0 && (
                        <ul className="check-list">
                          {program.highlights.map((h) => <li key={h}>{h}</li>)}
                        </ul>
                      )}
                      <div className="cluster prog-feature__cta">
                        <Link className="btn btn-solid btn-arrow" href={`/programs/${program.slug}`}>
                          {program.ctaLabel || 'Learn more'}
                          <span className="sr-only"> about {program.name}</span>
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {neighborhood.map((program) => (
          <section className="section section--sage" aria-labelledby="prog-neighborhood" key={program.slug}>
            <div className="wrap">
              <div className="split split--7-5">
                <Link className="prog-neighbor__media" href={`/programs/${program.slug}`} tabIndex={-1} aria-hidden="true">
                  <SmartImage
                    src={programImage(program)}
                    alt=""
                    fill
                    sizes="(min-width: 1280px) 700px, (min-width: 900px) 55vw, 100vw"
                    quality={75}
                  />
                </Link>
                <div className="prog-neighbor__body stack stack--sm">
                  <p className="eyebrow eyebrow--rule">{T.neighborhoodEyebrow}</p>
                  <h2 id="prog-neighborhood" className="h2">{T.neighborhoodHeading}</h2>
                  <div className="prog-neighbor__program">
                    <h3 className="prog-name"><ProgramName name={program.name} /></h3>
                    <p className="prog-title">{program.title}</p>
                  </div>
                  <p className="prog-body">{program.body}</p>
                  {program.highlights?.length > 0 && (
                    <ul className="check-list">
                      {program.highlights.map((h) => <li key={h}>{h}</li>)}
                    </ul>
                  )}
                  <div className="cluster prog-neighbor__cta">
                    <Link className="btn btn-solid btn-arrow" href="/contact">{program.ctaLabel || 'Tell us your situation'}</Link>
                    <Link className="btn btn-outline" href={`/programs/${program.slug}`}>
                      Learn more<span className="sr-only"> about {program.name}</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ))}

        <section className="cta-band">
          <div className="cta-band-media">
            <SmartImage src={IMAGES.programs.cta} alt="" fill sizes="100vw" quality={60} />
          </div>
          <div className="wrap cta-band-inner">
            <div className="cta-band-text">
              <h2>{T.ctaHeading}</h2>
              <p>{T.ctaBody}</p>
            </div>
            <div className="cluster">
              <Link className="btn btn-light btn-lg btn-arrow" href="/contact">{T.ctaLabel}</Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
