'use client';

import { useState } from 'react';
import { formatPhoneInput } from '../../lib/phone';

const EMPTY = { name: '', phone: '', email: '', address: '', message: '' };

export default function Contact({ c }) {
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: name === 'phone' ? formatPhoneInput(value) : value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus({ state: 'loading', message: '' });

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong.');
      }

      setStatus({ state: 'success', message: "Thanks — we'll get back to you as soon as possible!" });
      setForm(EMPTY);
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  }

  return (
    <section className="section contact" id="contact">
      <div className="wrap contact-inner">
        <div>
          <div className="eyebrow">{c.eyebrow}</div>
          <h2>{c.heading}</h2>
          <p>{c.intro}</p>
          <div className="contact-email">
            <span className="sub">{c.body}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={form.name}
              onChange={handleChange}
              placeholder="Your full name"
            />
          </div>
          <div className="form-field">
            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              value={form.phone}
              onChange={handleChange}
              placeholder="(555) 123-4567"
            />
          </div>
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              placeholder="your.email@example.com"
            />
          </div>
          <div className="form-field">
            <label htmlFor="address">Address</label>
            <input
              id="address"
              name="address"
              type="text"
              required
              value={form.address}
              onChange={handleChange}
              placeholder="123 Main Street, City, State, ZIP"
            />
          </div>
          <div className="form-field">
            <label htmlFor="message">What do you need done?</label>
            <textarea
              id="message"
              name="message"
              required
              value={form.message}
              onChange={handleChange}
              placeholder="Please describe the work you need completed..."
            />
          </div>
          <button className="btn btn-solid" type="submit" disabled={status.state === 'loading'}>
            {status.state === 'loading' ? 'Sending…' : 'Submit Request'}
          </button>
          {status.state === 'success' && <p className="form-status success">{status.message}</p>}
          {status.state === 'error' && <p className="form-status error">{status.message}</p>}
        </form>
      </div>
    </section>
  );
}
