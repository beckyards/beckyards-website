'use client';

import { addDays } from '../../../../lib/calendar';
import { todayISO } from '../../../../lib/advertising';

// Optional date for a job. Setting one puts the job on the Calendar; clearing it takes the job off again.
// A job with no date is simply not on the calendar.
export default function JobsDatePicker({ date, onChange, onDone }) {
  const today = todayISO();
  const quick = [
    { label: 'Today', value: today },
    { label: 'Tomorrow', value: addDays(today, 1) },
    { label: 'In a week', value: addDays(today, 7) },
  ];

  function pick(value) {
    onChange(value);
    onDone?.();
  }

  return (
    <div className="jobs-date is-pop">
      <div className="jobs-time-chips" role="group" aria-label="Pick a day">
        {quick.map((q) => (
          <button key={q.label} type="button" className={`jobs-time-chip${date === q.value ? ' is-on' : ''}`} aria-pressed={date === q.value} onClick={() => pick(q.value)}>
            {q.label}
          </button>
        ))}
      </div>
      <label className="jobs-date-field">
        <span className="jobs-label">Or pick a date</span>
        <input
          type="date"
          className="jobs-date-input"
          value={date || ''}
          aria-label="Job date"
          onChange={(e) => { if (e.target.value) pick(e.target.value); }}
        />
      </label>
      {date && (
        <button type="button" className="admin-mini jobs-time-clear" onClick={() => pick(null)}>
          Take off calendar
        </button>
      )}
      <p className="jobs-date-hint">Only jobs with a date show on the Calendar.</p>
    </div>
  );
}
