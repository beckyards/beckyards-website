'use client';

import { useEffect, useRef, useState } from 'react';
import { formatPhoneInput } from '../../lib/phone';
import Field, { Icon, checkValue } from './FormField';
import '../forms.css';

const EMPTY = { name: '', phone: '', email: '', address: '', notes: '' };

// Phone and name are required; everything else is optional (same rules as the
// API route). Optional fields are only checked when something is typed.
const RULES = {
  name: { kind: 'text', required: true, empty: 'Please enter your name.' },
  phone: { kind: 'phone', required: true, empty: 'Please enter your phone number.' },
  email: { kind: 'email', required: false },
  address: { kind: 'text', required: false },
  notes: { kind: 'text', required: false },
};
const ORDER = ['name', 'phone', 'email', 'address', 'notes'];

const STEPS = [
  'Send your name and phone number. Everything else is optional.',
  'We follow up with a quote for your property.',
  'We get your cleanup on the schedule.',
];

// `season` is the label the sign-up is collecting for (e.g. "Fall 2026").
export default function LeafCleanupSignupForm({ season }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const successRef = useRef(null);
  const refocusRef = useRef(false);

  const sent = status.state === 'success';
  const loading = status.state === 'loading';

  useEffect(() => {
    if (sent) successRef.current?.focus();
    else if (refocusRef.current) {
      // The "sign up another" button unmounted with the panel, so hand focus to the first field.
      refocusRef.current = false;
      document.getElementById('leaf-name')?.focus();
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
      document.getElementById(`leaf-${firstBad}`)?.focus();
      return;
    }

    setStatus({ state: 'loading', message: '' });

    try {
      const res = await fetch('/api/leaf-cleanup-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }

      setStatus({ state: 'success', message: "You're on the list — we'll be in touch with a quote and scheduling." });
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
    <section className="section section--sage aer" id="leaf-cleanup-signup">
      <div className="wrap aer-grid">
        <aside className="aer-panel on-dark" aria-labelledby="leaf-service-title">
          <div className="stack stack--sm">
            <p className="badge badge--outline">{season ? `${season} · Now booking` : 'Now booking'}</p>
            <h2 className="h2" id="leaf-service-title">Fall Leaf Cleanup</h2>
            <p className="aer-body">
              Let us handle the leaves. We clear them from your lawn and beds, trim back plants, and
              leave your yard neat and ready for winter. Each cleanup is tailored to your property.
            </p>
          </div>

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
              <h3 className="form-card-title">Get on the leaf cleanup list</h3>
              <p className="form-card-sub">
                Now booking fall leaf cleanups. Your name and phone number are all we need.
              </p>

              <div className="form-grid">
                <Field
                  id="leaf-name"
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
                  id="leaf-phone"
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
                  id="leaf-email"
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
                  id="leaf-address"
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
                <Field
                  id="leaf-notes"
                  name="notes"
                  label="Anything we should know?"
                  optional
                  full
                  as="textarea"
                  rows={3}
                  maxLength={1000}
                  value={form.notes}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.notes}
                  placeholder="Large trees, gate codes, pets, or areas to focus on"
                />
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
                  <li><Icon name="check" />We follow up with a quote and scheduling</li>
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
