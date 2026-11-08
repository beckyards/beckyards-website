import { notFound } from 'next/navigation';
import Link from 'next/link';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import SmartImage from '../../components/SmartImage';
import ProgramIcon, { ProgramName } from '../ProgramIcon';
import { socialMeta } from '../../../lib/seo';
import { PROGRAMS, PROGRAMS_PAGE as T, getProgram, programImage } from '../../../lib/programs';
import { IMAGES } from '../../../lib/siteImages';
import { getContent } from '../../../lib/siteContent';
import '../programs.css';

export const revalidate = 60;

export function generateStaticParams() {
  return PROGRAMS.map((program) => ({ slug: program.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const programs = await getContent('programs', PROGRAMS);
  const program = getProgram(slug, programs);
  if (!program) return {};
  const description = [program.title, program.pitch].filter(Boolean).join(' ');
  return {
    title: program.name,
    description,
    alternates: { canonical: `/programs/${program.slug}` },
    ...socialMeta({
      title: program.name,
      description,
      path: `/programs/${program.slug}`,
      image: programImage(program),
    }),
  };
}

export default async function ProgramPage({ params }) {
  const { slug } = await params;
  const programs = await getContent('programs', PROGRAMS);
  const program = getProgram(slug, programs);
  if (!program) notFound();

  const others = programs.filter((p) => p.slug !== program.slug);
  const heroCta = program.closingCta || program.ctaLabel || T.heroCta;

  return (
    <>
      <Header />

      <main id="main">
        <section className="page-hero">
          <div className="page-hero-media">
            <SmartImage
              src={programImage(program)}
              alt=""
              fill
              priority
              sizes="100vw"
              quality={85}
              className="prog-hero-img"
            />
          </div>
          <div className="wrap page-hero-inner">
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <ol>
                <li><Link href="/">Home</Link></li>
                <li><Link href="/programs">Programs</Link></li>
                <li aria-current="page">{program.name}</li>
              </ol>
            </nav>
            <p className="eyebrow eyebrow--rule rise" style={{ '--i': 0 }}>{program.eyebrow} program</p>
            <h1 className="display rise" style={{ '--i': 1 }}><ProgramName name={program.name} /></h1>
            <p className="lead prog-hero-title rise" style={{ '--i': 2 }}>{program.title}</p>
            <div className="cluster page-hero-actions rise" style={{ '--i': 3 }}>
              <Link className="btn btn-solid btn-lg btn-arrow" href="/contact">{heroCta}</Link>
              <Link className="btn btn-outline-light btn-lg" href="/programs">{T.allProgramsLabel}</Link>
            </div>
          </div>
        </section>

        <section className="section section--paper">
          <div className="wrap">
            <div className="grid-12 grid--gap-lg prog-detail">
              <div className="col-7 stack">
                <span className="icon-box"><ProgramIcon slug={program.slug} /></span>
                {program.pitch && <p className="prog-detail__pitch">{program.pitch}</p>}
                <p className="prog-body">{program.body}</p>
              </div>

              {program.highlights?.length > 0 && (
                <aside className="col-5 card card--accent prog-included" aria-labelledby="prog-included">
                  <h2 id="prog-included" className="h3">{T.includedHeading}</h2>
                  <ol className="prog-included__list">
                    {program.highlights.map((h, i) => (
                      <li key={h}>
                        <span className="prog-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ol>
                </aside>
              )}
            </div>
          </div>
        </section>

        {others.length > 0 && (
          <section className="section section--sage" aria-labelledby="prog-more">
            <div className="wrap">
              <div className="section-head">
                <p className="eyebrow">{T.moreEyebrow}</p>
                <h2 id="prog-more">{T.moreHeading}</h2>
              </div>
              <div className="grid-2 grid--gap-lg">
                {others.map((p) => (
                  <Link className="photo-card on-dark prog-more-card" href={`/programs/${p.slug}`} key={p.slug}>
                    <div className="photo-card-media">
                      <SmartImage src={programImage(p)} alt="" fill sizes="(min-width: 640px) 50vw, 100vw" quality={60} />
                    </div>
                    <div className="photo-card-body">
                      <span className="eyebrow">{p.eyebrow}</span>
                      <h3 className="photo-card-title"><ProgramName name={p.name} /></h3>
                      <p className="photo-card-text">{p.title}</p>
                      <span className="link-arrow photo-card-more">Learn more</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="cta-band">
          <div className="cta-band-media">
            <SmartImage src={IMAGES.programs.cta} alt="" fill sizes="100vw" quality={60} />
          </div>
          <div className="wrap cta-band-inner">
            <div className="cta-band-text">
              <h2>{program.closingHeading || T.ctaHeading}</h2>
              <p>{program.closingBody || T.ctaBody}</p>
            </div>
            <div className="cluster">
              <Link className="btn btn-light btn-lg btn-arrow" href="/contact">{heroCta}</Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
