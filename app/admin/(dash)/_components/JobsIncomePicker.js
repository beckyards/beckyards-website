'use client';

import { useState } from 'react';
import { INCOME_PRESETS, formatMoney, parseMoney } from '../../../../lib/jobs';

// Dollar amount for a job.
// Live mode (quick-add bar): just a "$" box; every keystroke goes to onChange.
// Explicit mode (popover on a saved job): one-tap amounts, plus a custom box that
// waits for Set/Enter so we don't save the job on every keystroke.
export default function JobsIncomePicker({ amount, onChange, onInvalid, onText, onDone, explicit = false, id }) {
  const [text, setText] = useState(() => {
    if (amount === null || amount === undefined) return '';
    if (explicit && INCOME_PRESETS.includes(Number(amount))) return '';
    return String(Number(amount));
  });
  const parsed = parseMoney(text);
  const invalid = text.trim() !== '' && parsed == null;

  function tapPreset(value) {
    setText('');
    onChange(Number(amount) === value ? null : value);
    onDone?.();
  }

  function commit() {
    if (parsed == null) return;
    onChange(parsed);
    onDone?.();
  }

  const input = (
    <span className="jobs-money">
      <span className="jobs-money-sign" aria-hidden="true">$</span>
      <input
        id={id}
        className="jobs-money-input"
        value={text}
        placeholder={explicit ? 'Custom' : '0'}
        aria-label="Estimated income in dollars"
        aria-invalid={invalid || undefined}
        inputMode="decimal"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        maxLength={12}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          if (!explicit) {
            const n = parseMoney(v);
            onChange(n);
            // Lets the add bar refuse to submit text it can't read, instead of dropping it.
            onInvalid?.(v.trim() !== '' && n == null);
            onText?.(v.trim() !== '');
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && explicit) { e.preventDefault(); commit(); }
        }}
      />
    </span>
  );

  if (!explicit) {
    return (
      <div className="jobs-income">
        {input}
        {invalid && <span className="jobs-custom-bad">Try 150 or 150.50</span>}
      </div>
    );
  }

  return (
    <div className="jobs-income is-pop">
      <div className="jobs-time-chips" role="group" aria-label="Estimated income">
        {INCOME_PRESETS.map((v) => {
          const on = Number(amount) === v;
          return (
            <button
              key={v}
              type="button"
              className={`jobs-time-chip${on ? ' is-on' : ''}`}
              aria-pressed={on}
              onClick={() => tapPreset(v)}
            >
              {formatMoney(v)}
            </button>
          );
        })}
      </div>

      <div className="jobs-custom">
        {input}
        <button type="button" className="admin-mini admin-mini-primary jobs-set" disabled={parsed == null} onClick={commit}>
          Set
        </button>
        {invalid && <span className="jobs-custom-bad">Try 150 or 150.50</span>}
      </div>

      {amount !== null && amount !== undefined && (
        <button
          type="button"
          className="admin-mini jobs-time-clear"
          onClick={() => { onChange(null); onDone?.(); }}
        >
          Clear amount
        </button>
      )}
    </div>
  );
}
