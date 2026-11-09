'use client';

import { useEffect, useRef, useState } from 'react';
import { formatPhoneInput } from '../../lib/phone';
import Field, { Icon, checkValue } from './FormField';
import '../forms.css';

const EMPTY = { name: '', phone: '', email: '', address: '', serviceType: 'aeration_overseeding' };

// Phone and name are required; email and address stay optional (same rules as
// the API route). Optional fields are only checked when something is typed.
const RULES = {
  name: { kind: 'text', required: true, empty: 'Please enter your name.' },
  phone: { kind: 'phone', required: true, empty: 'Please enter your phone number.' },
  email: { kind: 'email', required: false },
  address: { kind: 'text', required: false },
};
const ORDER = ['name', 'phone', 'email', 'address'];

const CHOICES = [
  { value: 'aeration_overseeding', title: 'Aeration + Overseeding', text: 'Core aeration, then fresh grass seed' },
  { value: 'aeration', title: 'Aeration Only', text: 'Core aeration without seed' },
];

const STEPS = [
  'Send your name and phone number. Everything else is optional.',
  'We follow up with pricing for your property.',
  'We get you on the schedule.',
];

// Pricing lines look like "Aeration: starting around $100–$150". Split those
// into label/value rows; anything without a colon becomes a footnote.
function splitHighlights(highlights) {
  const rows = [];
  const notes = [];
  for (const h of highlights || []) {
    const i = h.indexOf(': ');
    if (i > 0 && i < 40) rows.push({ label: h.slice(0, i), value: h.slice(i + 2) });
    else notes.push(h);
  }
  return { rows, notes };
}

// `service` is the aeration entry from the services content (title, tag, body,
// highlights), so the summary stays in sync with what the owner edits in admin.
// `season` is the label this list is collecting for (e.g. "Fall 2027").
export default function AerationSignupForm({ service, season }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const successRef = useRef(null);
  const refocusRef = useRef(false);

  const { rows, notes } = splitHighlights(service?.highlights);
  const sent = status.state === 'success';
  const loading = status.state === 'loading';

  useEffect(() => {
    if (sent) successRef.current?.focus();
    else if (refocusRef.current) {
      // The "sign up another" button unmounted with the panel, so hand focus to the first field.
      refocusRef.current = false;
      document.getElementById('aeration-name')?.focus();
    }
  }, [sent]);

  function handleChange(e) {
    const { name, value } = e.target;
    const next = name === 'phone' ? formatPhoneInput(value) : value;
    setForm((f) => ({ ...f, [name]: next }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: checkValue(RULES[name], next) }));
  }

  function handleBlur(e) {
    const { name, value } = e.target;
    if (!value) return;
    setErrors((er) => ({ ...er, [name]: checkValue(RULES[name], value) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;

    const found = {};
    for (const key of ORDER) {
      const msg = checkValue(RULES[key], form[key]);
      if (msg) found[key] = msg;
    }
    setErrors(found);
    const firstBad = ORDER.find((key) => found[key]);
    if (firstBad) {
      setStatus({ state: 'invalid', message: 'Please fix the highlighted fields and try again.' });
      document.getElementById(`aeration-${firstBad}`)?.focus();
      return;
    }

    setStatus({ state: 'loading', message: '' });

    try {
      const res = await fetch('/api/aeration-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }

      setStatus({
        state: 'success',
        message: `You're on the ${season || 'aeration'} list — we'll be in touch with pricing and scheduling.`,
      });
      setForm(EMPTY);
      setErrors({});
    } catch (err) {
      const offline = err instanceof TypeError;
      setStatus({
        state: 'error',
        message: offline ? 'We could not reach the server. Check your connection and try again.' : err.message,
      });
    }
  }

  return (
    <section className="section section--sage aer" id="aeration-signup">
      <div className="wrap aer-grid">
        <aside className="aer-panel on-dark" aria-labelledby="aer-service-title">
          <div className="stack stack--sm">
            {service?.tag && <p className="badge badge--outline">{service.tag}</p>}
            <h2 className="h2" id="aer-service-title">{service?.title || 'Aeration & Overseeding'}</h2>
            {service?.body && <p className="aer-body">{service.body}</p>}
          </div>

          {rows.length > 0 && (
            <div className="stack stack--xs">
              <h3 className="h4">Typical pricing</h3>
              <dl className="aer-prices">
                {rows.map((r) => (
                  <div className="aer-price" key={r.label}>
                    <dt>{r.label}</dt>
                    <dd>{r.value}</dd>
                  </div>
                ))}
              </dl>
              {notes.map((n) => (
                <p className="aer-note" key={n}>{n}</p>
              ))}
            </div>
          )}

          <div className="stack stack--xs">
            <h3 className="h4">How signup works</h3>
            <ol className="contact-steps">
              {STEPS.map((text, i) => (
                <li key={i}>
                  <span className="contact-step-num" aria-hidden="true">{i + 1}</span>
                  <div>
                    <p className="contact-step-text">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </aside>

        <div className="form-card">
          {sent ? (
            <div className="form-success" role="status">
              <span className="form-success-icon">
                <Icon name="check" className="icon" />
              </span>
              <h3 className="form-success-title" tabIndex={-1} ref={successRef}>You’re on the list</h3>
              <p>{status.message}</p>
              <button type="button" className="btn btn-outline" onClick={() => {
                  refocusRef.current = true;
                  setStatus({ state: 'idle', message: '' });
                }}>
                Sign up another property
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <h3 className="form-card-title">
                {season ? `Get on the ${season} aeration list` : 'Get on the aeration list'}
              </h3>
              <p className="form-card-sub">
                {season ? `Limited availability for ${season}.` : 'Limited availability this season.'} Your name and
                phone number are all we need.
              </p>

              <div className="form-grid">
                <Field
                  id="aeration-name"
                  name="name"
                  label="Name"
                  type="text"
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.name}
                  placeholder="Your full name"
                />
                <Field
                  id="aeration-phone"
                  name="phone"
                  label="Phone"
                  type="tel"
                  inputMode="tel"
                  required
                  autoComplete="tel"
                  value={form.phone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.phone}
                  placeholder="(555) 123-4567"
                />
                <Field
                  id="aeration-email"
                  name="email"
                  label="Email"
                  optional
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.email}
                  placeholder="name@example.com"
                />
                <Field
                  id="aeration-address"
                  name="address"
                  label="Property address"
                  optional
                  type="text"
                  autoComplete="street-address"
                  value={form.address}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.address}
                  placeholder="Street, city, state, ZIP"
                />

                <fieldset className="aer-choice form-field--full">
                  <legend>Which service?</legend>
                  <div className="aer-choice-grid">
                    {CHOICES.map((o) => (
                      <label className="aer-choice-option" key={o.value}>
                        <input
                          type="radio"
                          name="serviceType"
                          value={o.value}
                          checked={form.serviceType === o.value}
                          onChange={handleChange}
                        />
                        <span className="aer-choice-body">
                          <span className="aer-choice-title">{o.title}</span>
                          <span className="aer-choice-text">{o.text}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>

              <div className="form-actions">
                <button className="btn btn-solid btn-lg btn-block" type="submit" disabled={loading} aria-busy={loading}>
                  {loading ? (
                    <>
                      <span className="form-spinner" aria-hidden="true" />
                      Signing up…
                    </>
                  ) : (
                    'Sign Up'
                  )}
                </button>

                <div aria-live="polite">
                  {(status.state === 'error' || status.state === 'invalid') && (
                    <p className="form-status error" role="alert">
                      {status.message}
                    </p>
                  )}
                </div>

                <ul className="form-assure">
                  <li><Icon name="check" />We follow up with pricing and scheduling</li>
                  <li><Icon name="check" />Fully insured</li>
                </ul>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
