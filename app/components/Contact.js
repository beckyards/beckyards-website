'use client';

import { useEffect, useRef, useState } from 'react';
import { formatPhoneInput } from '../../lib/phone';
import Field, { Icon, checkValue } from './FormField';
import '../forms.css';

const EMPTY = { name: '', phone: '', email: '', address: '', message: '' };

const RULES = {
  name: { kind: 'text', required: true, empty: 'Please enter your name.' },
  phone: { kind: 'phone', required: true, empty: 'Please enter your phone number.' },
  email: { kind: 'email', required: true, empty: 'Please enter your email address.' },
  address: { kind: 'text', required: true, empty: 'Please enter the property address.' },
  message: { kind: 'text', required: true, empty: 'Please tell us a little about the work you need.' },
};
const ORDER = ['name', 'phone', 'email', 'address', 'message'];

// `tone` picks the section background: 'sage' (default), 'paper' or 'white'.
// `compact` is for pages where a hero or band above already carries the headline:
// the section heading is dropped so only one "free quote" headline stacks up.
export default function Contact({ c, tone = 'sage', compact = false }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const successRef = useRef(null);
  const refocusRef = useRef(false);
  const Sub = compact ? 'h2' : 'h3';

  const include = Array.isArray(c.include) ? c.include : [];
  const steps = Array.isArray(c.steps) ? c.steps : [];
  const assurances = Array.isArray(c.assurances) ? c.assurances : [];
  const sent = status.state === 'success';

  // Move focus to the confirmation so screen reader and keyboard users land on it.
  useEffect(() => {
    if (sent) successRef.current?.focus();
    else if (refocusRef.current) {
      // The "send another" button unmounted with the panel, so hand focus to the first field.
      refocusRef.current = false;
      document.getElementById('contact-name')?.focus();
    }
  }, [sent]);

  function handleChange(e) {
    const { name, value } = e.target;
    const next = name === 'phone' ? formatPhoneInput(value) : value;
    setForm((f) => ({ ...f, [name]: next }));
    // Once a field has shown an error, clear it live as soon as it is fixed.
    if (errors[name]) setErrors((er) => ({ ...er, [name]: checkValue(RULES[name], next) }));
  }

  function handleBlur(e) {
    const { name, value } = e.target;
    if (!value) return; // don't nag about a field the visitor only tabbed through
    setErrors((er) => ({ ...er, [name]: checkValue(RULES[name], value) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (status.state === 'loading') return;

    const found = {};
    for (const key of ORDER) {
      const msg = checkValue(RULES[key], form[key]);
      if (msg) found[key] = msg;
    }
    setErrors(found);
    const firstBad = ORDER.find((key) => found[key]);
    if (firstBad) {
      setStatus({ state: 'invalid', message: 'Please fix the highlighted fields and try again.' });
      document.getElementById(`contact-${firstBad}`)?.focus();
      return;
    }

    setStatus({ state: 'loading', message: '' });

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }

      setStatus({ state: 'success', message: c.successBody });
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

  function resetForm() {
    refocusRef.current = true;
    setStatus({ state: 'idle', message: '' });
  }

  const loading = status.state === 'loading';

  return (
    <section className={`section section--${tone} contact`} id="contact">
      <div className="wrap contact-grid">
        <div className="contact-copy">
          <div className="stack stack--sm">
            {!compact && <p className="eyebrow eyebrow--rule">{c.eyebrow}</p>}
            {!compact && <h2>{c.heading}</h2>}
            <p className="lead">{c.intro}</p>
          </div>

          {include.length > 0 && (
            <div className="stack stack--sm">
              <Sub className="h4">{c.includeHeading}</Sub>
              <ul className="check-list">
                {include.map((item, i) => (
                  <li key={i}>{item.text}</li>
                ))}
              </ul>
            </div>
          )}

          {steps.length > 0 && (
            <div className="stack stack--sm">
              <Sub className="h4">{c.stepsHeading}</Sub>
              <ol className="contact-steps">
                {steps.map((s, i) => (
                  <li key={i}>
                    <span className="contact-step-num" aria-hidden="true">{i + 1}</span>
                    <div>
                      <p className="contact-step-title">{s.title}</p>
                      <p className="contact-step-text">{s.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        <div className="form-card">
          {sent ? (
            <div className="form-success" role="status">
              <span className="form-success-icon">
                <Icon name="check" className="icon" />
              </span>
              <Sub className="form-success-title" tabIndex={-1} ref={successRef}>
                {c.successHeading}
              </Sub>
              <p>{status.message}</p>
              <button type="button" className="btn btn-outline" onClick={resetForm}>
                {c.successAgainLabel}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <Sub className="form-card-title">{c.formHeading}</Sub>
              {c.body && <p className="form-card-sub">{c.body}</p>}

              <div className="form-grid">
                <Field
                  id="contact-name"
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
                  id="contact-phone"
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
                  id="contact-email"
                  name="email"
                  label="Email"
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.email}
                  placeholder="name@example.com"
                />
                <Field
                  id="contact-address"
                  name="address"
                  label="Property address"
                  type="text"
                  required
                  autoComplete="street-address"
                  value={form.address}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.address}
                  placeholder="Street, city, state, ZIP"
                />
                <Field
                  id="contact-message"
                  name="message"
                  label="What do you need done?"
                  as="textarea"
                  rows={5}
                  full
                  required
                  value={form.message}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.message}
                  hint="Areas to focus on, your vision for the project, and your timeline all help."
                  placeholder="Tell us about the work you have in mind…"
                />
              </div>

              <div className="form-actions">
                <button className="btn btn-solid btn-lg btn-block" type="submit" disabled={loading} aria-busy={loading}>
                  {loading ? (
                    <>
                      <span className="form-spinner" aria-hidden="true" />
                      Sending…
                    </>
                  ) : (
                    c.submitLabel
                  )}
                </button>

                <div aria-live="polite">
                  {(status.state === 'error' || status.state === 'invalid') && (
                    <p className="form-status error" role="alert">
                      {status.message}
                    </p>
                  )}
                </div>

                {assurances.length > 0 && (
                  <ul className="form-assure">
                    {assurances.map((a, i) => (
                      <li key={i}>
                        <Icon name="check" />
                        {a.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
