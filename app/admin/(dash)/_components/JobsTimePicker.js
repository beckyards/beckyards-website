'use client';

import { useState } from 'react';
import { TIME_PRESETS, formatMinutes, formatMinutesShort, parseDuration } from '../../../../lib/jobs';

const PRESET_MINUTES = new Set(TIME_PRESETS.map((p) => p.minutes));

// One-tap preset chips plus a free-text custom box ("1h30", "90").
// Live mode (quick-add): every change goes straight to onChange.
// Explicit mode (popover on a saved job): presets apply and close on tap, but the
// custom box waits for Set/Enter so we don't save a job on every keystroke.
export default function JobsTimePicker({ minutes, onChange, onDone, explicit = false }) {
  const [custom, setCustom] = useState(() => (minutes && !PRESET_MINUTES.has(minutes) ? formatMinutesShort(minutes) : ''));
  const parsed = parseDuration(custom);
  const invalid = custom.trim() !== '' && parsed == null;

  function tapPreset(m) {
    setCustom('');
    onChange(minutes === m ? null : m);
    onDone?.();
  }

  function commitCustom() {
    if (parsed == null) return;
    onChange(parsed);
    onDone?.();
  }

  return (
    <div className={`jobs-time${explicit ? ' is-pop' : ''}`}>
      <div className="jobs-time-chips" role="group" aria-label="Estimated time">
        {TIME_PRESETS.map((p) => {
          const on = minutes === p.minutes;
          return (
            <button
              key={p.minutes}
              type="button"
              className={`jobs-time-chip${on ? ' is-on' : ''}`}
              aria-pressed={on}
              onClick={() => tapPreset(p.minutes)}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="jobs-custom">
        <input
          className="jobs-custom-input"
          value={custom}
          placeholder="Custom: 1h30"
          aria-label="Custom estimated time"
          aria-invalid={invalid || undefined}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={24}
          onChange={(e) => {
            const v = e.target.value;
            setCustom(v);
            if (!explicit) onChange(parseDuration(v));
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            if (explicit) { e.preventDefault(); commitCustom(); }
          }}
        />
        {explicit && (
          <button type="button" className="admin-mini admin-mini-primary jobs-set" disabled={parsed == null} onClick={commitCustom}>
            Set
          </button>
        )}
        {!explicit && parsed != null && !PRESET_MINUTES.has(parsed) && (
          <span className="jobs-custom-echo">= {formatMinutes(parsed)}</span>
        )}
        {invalid && <span className="jobs-custom-bad">Try 45, 1h30 or 1:30</span>}
      </div>

      {explicit && minutes != null && (
        <button
          type="button"
          className="admin-mini jobs-time-clear"
          onClick={() => { onChange(null); onDone?.(); }}
        >
          Clear time
        </button>
      )}
    </div>
  );
}
