'use client';

import Editable from '../Editable';
import Header from '../../components/Header';
import SmartImage from '../../components/SmartImage';
import Field, { Icon } from '../../components/FormField';
import { Bar, Removable, AddButton, set, setItem, addItem, removeItem, arr } from '../helpers';
import '../../forms.css';

export default function ContactView({ c, set: setC }) {
  const edit = (key, extra) => ({ value: c[key], onCommit: (v) => setC(set(c, key, v)), ...extra });
  const include = arr(c, 'include');
  const steps = arr(c, 'steps');
  const assurances = arr(c, 'assurances');

  return (
    <div className="pv-root">
      <Bar label="Contact page" />
      <Header />
      <main id="main">
        <section className="page-hero forms-hero">
          {c.image && (
            <div className="page-hero-media">
              <SmartImage src={c.image} alt="" fill sizes="100vw" quality={60} />
            </div>
          )}
          <div className="wrap page-hero-inner">
            <h1 className="h1">
              <Editable {...edit('heroHeading', { placeholder: 'Headline' })} />
            </h1>
            <p className="lead">
              <Editable {...edit('heroLead', { multiline: true })} />
            </p>
          </div>
        </section>

        <section className="section section--sage contact" id="contact">
          <div className="wrap contact-grid">
            <div className="contact-copy">
              <div className="stack stack--sm">
                <p className="eyebrow eyebrow--rule">
                  <Editable {...edit('eyebrow')} />
                </p>
                <h2>
                  <Editable {...edit('heading')} />
                </h2>
                <p className="lead">
                  <Editable {...edit('intro', { multiline: true })} />
                </p>
              </div>

              <div className="stack stack--sm">
                <h3 className="h4">
                  <Editable {...edit('includeHeading')} />
                </h3>
                <ul className="check-list">
                  {include.map((item, i) => (
                    <li key={i}>
                      <Removable onRemove={() => setC(removeItem(c, 'include', i))}>
                        <Editable value={item?.text} onCommit={(v) => setC(setItem(c, 'include', i, 'text', v))} />
                      </Removable>
                    </li>
                  ))}
                </ul>
                <div>
                  <AddButton onClick={() => setC(addItem(c, 'include', { text: 'New item' }))}>Add item</AddButton>
                </div>
              </div>

              <div className="stack stack--sm">
                <h3 className="h4">
                  <Editable {...edit('stepsHeading')} />
                </h3>
                <ol className="contact-steps">
                  {steps.map((s, i) => (
                    <li key={i}>
                      <span className="contact-step-num" aria-hidden="true">{i + 1}</span>
                      <Removable onRemove={() => setC(removeItem(c, 'steps', i))}>
                        <p className="contact-step-title">
                          <Editable value={s?.title} onCommit={(v) => setC(setItem(c, 'steps', i, 'title', v))} />
                        </p>
                        <p className="contact-step-text">
                          <Editable value={s?.text} multiline onCommit={(v) => setC(setItem(c, 'steps', i, 'text', v))} />
                        </p>
                      </Removable>
                    </li>
                  ))}
                </ol>
                <div>
                  <AddButton onClick={() => setC(addItem(c, 'steps', { title: 'New step', text: 'Describe it here.' }))}>
                    Add step
                  </AddButton>
                </div>
              </div>
            </div>

            <div>
              <div className="form-card">
                <h3 className="form-card-title">
                  <Editable {...edit('formHeading')} />
                </h3>
                <p className="form-card-sub">
                  <Editable {...edit('body', { multiline: true })} />
                </p>

                <div className="form-grid" aria-hidden="true">
                  <Field id="pv-name" name="name" label="Name" disabled placeholder="Your full name" />
                  <Field id="pv-phone" name="phone" label="Phone" disabled placeholder="(555) 123-4567" />
                  <Field id="pv-email" name="email" label="Email" disabled placeholder="name@example.com" />
                  <Field id="pv-address" name="address" label="Property address" disabled placeholder="Street, city, state, ZIP" />
                  <Field
                    id="pv-message"
                    name="message"
                    label="What do you need done?"
                    as="textarea"
                    rows={3}
                    full
                    disabled
                    placeholder="Tell us about the work you have in mind…"
                  />
                </div>

                <div className="form-actions">
                  <span className="btn btn-solid btn-lg btn-block">
                    <Editable {...edit('submitLabel')} />
                  </span>
                  <ul className="form-assure">
                    {assurances.map((a, i) => (
                      <li key={i}>
                        <Icon name="check" />
                        <Removable onRemove={() => setC(removeItem(c, 'assurances', i))}>
                          <Editable value={a?.label} onCommit={(v) => setC(setItem(c, 'assurances', i, 'label', v))} />
                        </Removable>
                      </li>
                    ))}
                    <li>
                      <AddButton onClick={() => setC(addItem(c, 'assurances', { label: 'New point' }))}>Add</AddButton>
                    </li>
                  </ul>
                </div>
              </div>

              <p className="pv-note">After someone sends the form, they see this message instead:</p>
              <div className="form-card">
                <div className="form-success">
                  <span className="form-success-icon">
                    <Icon name="check" className="icon" />
                  </span>
                  <h3 className="form-success-title">
                    <Editable {...edit('successHeading')} />
                  </h3>
                  <p>
                    <Editable {...edit('successBody', { multiline: true })} />
                  </p>
                  <span className="btn btn-outline">
                    <Editable {...edit('successAgainLabel')} />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
