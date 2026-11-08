// Shared pieces for the contact and aeration signup forms: one accessible
// field wrapper (label, hint, inline error), the validation rules and a small
// set of line icons. No hooks, so it works from any client component.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Returns an error message, or '' when the value is fine. `rule` is
// { kind: 'text' | 'phone' | 'email', required: boolean, empty: string }.
export function checkValue(rule, value) {
  const v = (value || '').trim();
  if (!v) return rule.required ? rule.empty : '';
  if (rule.kind === 'phone' && v.replace(/\D/g, '').length < 10) {
    return 'Please enter a 10-digit phone number.';
  }
  if (rule.kind === 'email' && !EMAIL_RE.test(v)) {
    return 'Please enter a valid email address, like name@example.com.';
  }
  return '';
}

export function Icon({ name, className = 'icon' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  );
}

const PATHS = {
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  shield: (
    <>
      <path d="M12 3 5 6v5.5c0 4.2 2.8 7.6 7 9.5 4.2-1.9 7-5.3 7-9.5V6l-7-3Z" />
      <path d="m9 12 2 2 4-4.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5v.01" />
    </>
  ),
  tag: (
    <>
      <path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7a1 1 0 0 1 .7.3l7.6 7.6a1 1 0 0 1 0 1.4l-7.7 7.7a1 1 0 0 1-1.4 0l-7.6-7.6a1 1 0 0 1-.3-.7Z" />
      <circle cx="8" cy="8" r="1.2" />
    </>
  ),
  leaf: (
    <>
      <path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14" />
      <path d="M5 19c2-4 5-7 9-9" />
    </>
  ),
};

// A labeled input/textarea. `error` shows inline under the field and is wired
// to the control with aria-describedby so screen readers announce it.
export default function Field({
  id,
  name,
  label,
  optional = false,
  hint,
  error,
  as = 'input',
  full = false,
  rows,
  ...control
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const Control = as;

  return (
    <div className={`form-field${full ? ' form-field--full' : ''}${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>
        {label}
        {optional && <span className="form-optional">Optional</span>}
      </label>
      <Control
        id={id}
        name={name}
        rows={as === 'textarea' ? rows : undefined}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...control}
      />
      {hint && !error && (
        <p className="form-hint" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="form-error" id={errorId}>
          <Icon name="alert" className="icon form-error-icon" />
          {error}
        </p>
      )}
    </div>
  );
}
