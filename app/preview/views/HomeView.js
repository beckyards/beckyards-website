'use client';

import Editable from '../Editable';
import Header from '../../components/Header';
import SmartImage from '../../components/SmartImage';
import HomeIcon from '../../components/HomeIcons';
import { SERVICES, getService, serviceImage } from '../../../lib/services';
import { PROGRAMS, programImage } from '../../../lib/programs';
import { IMAGES } from '../../../lib/siteImages';
import { knownDimsFor } from '../../../lib/media';
import { Bar, Removable, AddButton, set, setItem, addItem, removeItem, arr, photoSrc } from '../helpers';
import '../../home.css';

const ICONS = ['heart', 'sparkle', 'chat', 'shield', 'check'];
const TILE_NAMES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export default function HomeView({ c, set: setC }) {
  const aeration = getService('aeration-overseeding');
  const edit = (key, extra) => ({ value: c[key], onCommit: (v) => setC(set(c, key, v)), ...extra });

  const trust = arr(c, 'heroTrust');
  const whyPoints = arr(c, 'whyPoints');
  const heroSrc = photoSrc(c.heroPhoto, IMAGES.hero);
  const beforeSrc = photoSrc(c.beforePhoto, IMAGES.beforeAfter.before);
  const afterSrc = photoSrc(c.afterPhoto, IMAGES.beforeAfter.after);
  const dims = knownDimsFor(afterSrc);
  const frameStyle = { aspectRatio: dims ? `${dims.width} / ${dims.height}` : '3 / 4' };
  // The live page fills this from the portfolio; the preview shows the curated defaults.
  const mosaic = IMAGES.featured.slice(0, 8);

  return (
    <div className="pv-root">
      <Bar label="Homepage" />
      <Header />

      <main id="main">
        {/* 1. Hero */}
        <section className="page-hero page-hero--tall home-hero">
          <div className="page-hero-media">
            <SmartImage src={heroSrc} alt="" fill sizes="100vw" quality={60} />
          </div>
          <div className="wrap page-hero-inner">
            <p className="home-hero__services">
              <Editable {...edit('heroEyebrow', { placeholder: 'Mowing • Mulching • Planting' })} />
            </p>
            <h1 className="display home-hero__title">
              <Editable {...edit('heroHeading', { placeholder: 'Headline' })} />
            </h1>
            <p className="lead home-hero__lead">
              <Editable {...edit('heroSubheading', { multiline: true })} />
            </p>
            <div className="cluster page-hero-actions">
              <span className="btn btn-solid btn-lg btn-arrow">
                <Editable {...edit('heroCtaLabel')} />
              </span>
              <span className="btn btn-outline-light btn-lg">
                <Editable {...edit('heroSecondaryCtaLabel')} />
              </span>
            </div>
            <ul className="home-hero__trust">
              {trust.map((t, i) => (
                <li key={i}>
                  <HomeIcon name="check" />
                  <Removable onRemove={() => setC(removeItem(c, 'heroTrust', i))}>
                    <Editable value={t} onCommit={(v) => setC(setItem(c, 'heroTrust', i, null, v))} />
                  </Removable>
                </li>
              ))}
              <li>
                <AddButton onClick={() => setC(addItem(c, 'heroTrust', 'New point'))}>Add point</AddButton>
              </li>
            </ul>
          </div>
        </section>

        {/* 2. Services */}
        <section className="section section--paper" id="services">
          <div className="wrap">
            <div className="section-head section-head--split">
              <p className="eyebrow eyebrow--rule">
                <Editable {...edit('servicesEyebrow')} />
              </p>
              <h2>
                <Editable {...edit('servicesHeading')} />
              </h2>
              <p className="lead">
                <Editable {...edit('servicesIntro', { multiline: true })} />
              </p>
              <div className="section-head-action">
                <span className="link-arrow">
                  <Editable {...edit('servicesLinkLabel')} />
                </span>
              </div>
            </div>

            <ul className="home-services__grid">
              {SERVICES.map((service) => (
                <li key={service.slug}>
                  <span className="photo-card home-svc">
                    <div className="photo-card-media">
                      <SmartImage src={serviceImage(service)} alt="" fill sizes="(min-width: 900px) 33vw, 50vw" quality={60} />
                    </div>
                    <span className="home-svc__arrow" aria-hidden="true">
                      <HomeIcon name="arrow" />
                    </span>
                    <div className="photo-card-body">
                      <h3 className="photo-card-title">{service.title}</h3>
                      <p className="photo-card-text">{service.tag || service.subtitle}</p>
                    </div>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 2b. Leaf cleanup (seasonal, now booking) */}
        <section className="section section--white home-leaf" id="leaf-cleanup">
          <div className="wrap">
            <div className="split split--7-5 home-leaf__split">
              <div className="stack stack--lg">
                <div className="stack stack--sm">
                  <p className="eyebrow eyebrow--rule">
                    <Editable {...edit('leafEyebrow')} />
                  </p>
                  <h2>
                    <Editable {...edit('leafHeading', { placeholder: 'Heading (clear to hide this section)' })} />
                  </h2>
                  <span className="badge badge--solid home-leaf__note">
                    <Editable {...edit('leafNote')} />
                  </span>
                </div>
                <p className="lead home-leaf__body">
                  <Editable {...edit('leafBody', { multiline: true })} />
                </p>
                <div className="cluster cluster--lg">
                  <span className="btn btn-solid btn-lg btn-arrow">
                    <Editable {...edit('leafCtaLabel')} />
                  </span>
                  <span className="link-arrow">
                    <Editable {...edit('leafDetailsLabel')} />
                  </span>
                </div>
              </div>
              <div className="media-frame ratio-4-3 media-frame--shadow home-leaf__media">
                <SmartImage
                  src={photoSrc(c.leafPhoto, IMAGES.services['seasonal-cleanups'])}
                  alt=""
                  fill
                  sizes="(min-width: 900px) 40vw, 100vw"
                  quality={60}
                />
              </div>
            </div>
          </div>
        </section>

        {/* 3. Aeration (seasonal) */}
        {aeration && (
          <section className="section section--dark home-aeration" id="aeration">
            <div className="wrap">
              <div className="split split--5-7">
                <div className="media-frame ratio-4-3 media-frame--shadow home-aeration__media">
                  <SmartImage
                    src={photoSrc(c.aerationPhoto, serviceImage(aeration))}
                    alt=""
                    fill
                    sizes="(min-width: 900px) 42vw, 100vw"
                    quality={60}
                  />
                </div>
                <div className="stack stack--lg">
                  <div className="stack stack--sm">
                    <p className="eyebrow eyebrow--rule">
                      <Editable {...edit('aerationEyebrow')} />
                    </p>
                    <h2>
                      <Editable {...edit('aerationHeading')} />
                    </h2>
                    <span className="badge badge--solid home-aeration__note">
                      <Editable {...edit('aerationNote')} />
                    </span>
                  </div>
                  <p className="home-aeration__body">{aeration.body}</p>
                  {aeration.highlights?.length > 0 && (
                    <ul className="check-list">
                      {aeration.highlights.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  )}
                  <div className="cluster cluster--lg">
                    <span className="btn btn-solid btn-lg btn-arrow">
                      <Editable {...edit('aerationCtaLabel')} />
                    </span>
                    <span className="link-arrow">
                      <Editable {...edit('aerationDetailsLabel')} />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 4. Before / after (side by side here; the live page uses a drag slider) */}
        <section className="section section--sage" id="difference">
          <div className="wrap">
            <div className="split split--7-5 home-ba-split">
              <div className="stack stack--lg home-ba-copy">
                <div className="stack stack--sm">
                  <p className="eyebrow eyebrow--rule">
                    <Editable {...edit('beforeAfterEyebrow')} />
                  </p>
                  <h2>
                    <Editable {...edit('beforeAfterHeading')} />
                  </h2>
                </div>
                <p className="lead">
                  <Editable {...edit('beforeAfterBody', { multiline: true })} />
                </p>
                <div>
                  <span className="btn btn-outline btn-arrow">
                    <Editable {...edit('beforeAfterLinkLabel')} />
                  </span>
                </div>
              </div>
              <div>
                <div className="pv-ba-pair">
                  <div className="media-frame" style={frameStyle}>
                    <SmartImage src={beforeSrc} alt="" fill sizes="(min-width: 900px) 20vw, 50vw" quality={60} />
                    <span className="media-label">
                      <span className="badge badge--dark">
                        <Editable {...edit('beforeLabel')} />
                      </span>
                    </span>
                  </div>
                  <div className="media-frame" style={frameStyle}>
                    <SmartImage src={afterSrc} alt="" fill sizes="(min-width: 900px) 20vw, 50vw" quality={60} />
                    <span className="media-label">
                      <span className="badge badge--dark">
                        <Editable {...edit('afterLabel')} />
                      </span>
                    </span>
                  </div>
                </div>
                <p className="home-ba__hint">
                  <Editable {...edit('beforeAfterHint')} />
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Featured work */}
        <section className="section section--paper" id="work">
          <div className="wrap">
            <div className="section-head section-head--split">
              <p className="eyebrow eyebrow--rule">
                <Editable {...edit('featuredEyebrow')} />
              </p>
              <h2>
                <Editable {...edit('featuredHeading')} />
              </h2>
              <p className="lead">
                <Editable {...edit('featuredIntro', { multiline: true })} />
              </p>
            </div>

            <div className="home-mosaic" data-count={mosaic.length}>
              {mosaic.map((src, i) => (
                <span key={src} className={`home-mosaic__tile home-mosaic__tile--${TILE_NAMES[i]}`}>
                  <SmartImage src={src} alt="" fill sizes="(min-width: 900px) 25vw, 50vw" quality={60} />
                </span>
              ))}
            </div>
            <p className="pv-note">The live page shows the first photos from the Portfolio here.</p>

            <div className="home-mosaic__foot">
              <span className="btn btn-solid btn-lg btn-arrow">
                <Editable {...edit('featuredCtaLabel')} />
              </span>
            </div>
          </div>
        </section>

        {/* 6. Why BeckYards */}
        <section className="section section--white home-why" id="why-us">
          <div className="wrap">
            <div className="grid-12 grid--gap-lg">
              <div className="col-5 stack stack--lg home-why__intro">
                <div className="stack stack--sm">
                  <p className="eyebrow eyebrow--rule">
                    <Editable {...edit('whyEyebrow')} />
                  </p>
                  <h2>
                    <Editable {...edit('whyHeading')} />
                  </h2>
                </div>
                <p className="lead">
                  <Editable {...edit('whyBody', { multiline: true })} />
                </p>
                <div>
                  <span className="link-arrow">
                    <Editable {...edit('whyLinkLabel')} />
                  </span>
                </div>
              </div>

              <div className="col-7">
                <ul className="home-why__list">
                  {whyPoints.map((point, i) => (
                    <li className="home-why__item" key={i}>
                      <span className="icon-box">
                        <HomeIcon name={ICONS.includes(point?.icon) ? point.icon : 'check'} />
                      </span>
                      <Removable onRemove={() => setC(removeItem(c, 'whyPoints', i))}>
                        <h3 className="home-why__title">
                          <Editable value={point?.title} onCommit={(v) => setC(setItem(c, 'whyPoints', i, 'title', v))} />
                        </h3>
                        <p className="home-why__body">
                          <Editable
                            value={point?.body}
                            multiline
                            onCommit={(v) => setC(setItem(c, 'whyPoints', i, 'body', v))}
                          />
                        </p>
                      </Removable>
                    </li>
                  ))}
                </ul>
                <AddButton onClick={() => setC(addItem(c, 'whyPoints', { icon: 'check', title: 'New point', body: 'Describe it here.' }))}>
                  Add point
                </AddButton>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Programs */}
        <section className="section section--sage" id="programs">
          <div className="wrap">
            <div className="section-head section-head--split">
              <p className="eyebrow eyebrow--rule">
                <Editable {...edit('programsEyebrow')} />
              </p>
              <h2>
                <Editable {...edit('programsHeading')} />
              </h2>
              <p className="lead">
                <Editable {...edit('programsIntro', { multiline: true })} />
              </p>
              <div className="section-head-action">
                <span className="link-arrow">
                  <Editable {...edit('programsLinkLabel')} />
                </span>
              </div>
            </div>

            <ul className="home-programs__grid">
              {PROGRAMS.map((program) => (
                <li key={program.slug}>
                  <span className="card home-program">
                    <div className="media-frame ratio-4-3 home-program__media">
                      <SmartImage src={programImage(program)} alt="" fill sizes="(min-width: 900px) 33vw, 50vw" quality={60} />
                    </div>
                    <div className="home-program__body">
                      {program.eyebrow && <p className="eyebrow">{program.eyebrow}</p>}
                      <h3 className="home-program__name">{program.name}</h3>
                      <p className="home-program__pitch">{program.pitch || program.title}</p>
                      <span className="link-arrow home-program__more">{program.ctaLabel || 'Learn more'}</span>
                    </div>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 8. Final call to action, then the quote form */}
        <section className="cta-band">
          <div className="cta-band-media">
            <SmartImage
              src={photoSrc(c.ctaPhoto, IMAGES.heroAlternates[3] || IMAGES.hero)}
              alt=""
              fill
              sizes="100vw"
              quality={60}
            />
          </div>
          <div className="wrap cta-band-inner">
            <div className="cta-band-text">
              <p className="eyebrow eyebrow--rule">
                <Editable {...edit('ctaEyebrow')} />
              </p>
              <h2>
                <Editable {...edit('ctaHeading')} />
              </h2>
              <p>
                <Editable {...edit('ctaBody', { multiline: true })} />
              </p>
            </div>
            <div className="cluster">
              <span className="btn btn-light btn-lg btn-arrow">
                <Editable {...edit('ctaButtonLabel')} />
              </span>
            </div>
          </div>
        </section>

        <section className="section section--sage">
          <div className="wrap">
            <p className="pv-note">The quote request form appears here on the live page. Edit its wording under Contact.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
