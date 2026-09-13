'use client';

import { useState } from 'react';
import { formatPhoneInput } from '../../lib/phone';

const EMPTY = { name: '', phone: '', email: '', address: '', serviceType: 'aeration_overseeding' };

export default function AerationSignupForm() {
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
      const res = await fetch('/api/aeration-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong.');
      }

      setStatus({ state: 'success', message: "You're on the list — we'll be in touch with pricing and scheduling." });
      setForm(EMPTY);
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  }

  return (
    <section className="section contact" id="aeration-signup">
      <div className="wrap contact-inner">
        <div>
          <div className="eyebrow">Seasonal Service</div>
          <h2>Aeration & Overseeding Signup</h2>
          <p>
            Give us your name, phone number, email, and address, and let us know which
            service you're interested in. We'll follow up with pricing and get you on the schedule.
          </p>
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
            <label htmlFor="serviceType">Which service?</label>
            <select id="serviceType" name="serviceType" value={form.serviceType} onChange={handleChange}>
              <option value="aeration_overseeding">Aeration + Overseeding</option>
              <option value="aeration">Aeration Only</option>
            </select>
          </div>
          <button className="btn btn-solid" type="submit" disabled={status.state === 'loading'}>
            {status.state === 'loading' ? 'Signing up…' : 'Sign Up'}
          </button>
          {status.state === 'success' && <p className="form-status success">{status.message}</p>}
          {status.state === 'error' && <p className="form-status error">{status.message}</p>}
        </form>
      </div>
    </section>
  );
}
