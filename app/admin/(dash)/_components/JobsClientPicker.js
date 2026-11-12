'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Icon } from './JobsIcons';
import { routesLabel } from '../../../../lib/clients';

const MAX_OPTIONS = 8;

function rank(client, q) {
  const name = (client.name || '').toLowerCase();
  if (name.startsWith(q)) return 0;
  if (name.includes(q)) return 1;
  return 2;
}

function matchClients(clients, q) {
  if (!q) return clients;
  const needle = q.toLowerCase();
  return clients
    .filter((c) => (c.name || '').toLowerCase().includes(needle) || (c.address || '').toLowerCase().includes(needle))
    .sort((a, b) => rank(a, needle) - rank(b, needle));
}

// Client combobox. `clients` should already be sorted (browse order). `value` is
// the picked client ({ clientId, name, address, group }) or null; picking calls
// onPick with that shape (clientId null = free-text name that isn't on a route).
// Text is owned by the parent so it can resolve leftover typed text on submit.
export default function JobsClientPicker({
  clients,
  value,
  onPick,
  text,
  onText,
  loadError = false,
  inputRef,
  autoFocus = false,
  placeholder = 'Search clients…',
  ariaLabel = 'Client',
  onPicked,
}) {
  const uid = useId();
  const listId = `${uid}-list`;
  const ownRef = useRef(null);
  const ref = inputRef || ownRef;
  const refocus = useRef(false);
  const popRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const q = text.trim();
  const matches = useMemo(() => matchClients(clients, q), [clients, q]);
  const shown = matches.slice(0, MAX_OPTIONS);
  const exact = q !== '' && clients.some((c) => (c.name || '').trim().toLowerCase() === q.toLowerCase());
  const options = [
    ...shown.map((client) => ({ kind: 'client', client })),
    ...(q && !exact ? [{ kind: 'free', text: q }] : []),
  ];
  const activeIdx = Math.min(active, options.length - 1);
  const hiddenCount = matches.length - shown.length;

  // After the chip is removed the input remounts; put the cursor back in it.
  useEffect(() => {
    if (refocus.current && !value) {
      refocus.current = false;
      ref.current?.focus();
    }
  });

  useEffect(() => {
    if (!open || activeIdx < 0) return;
    document.getElementById(`${uid}-opt-${activeIdx}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIdx, uid]);

  // Don't let the list open off-screen (a row near the bottom of the page, or a phone).
  useEffect(() => {
    if (open) popRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [open]);

  function choose(opt) {
    if (opt.kind === 'client') {
      const c = opt.client;
      onPick({ clientId: c.id, name: c.name, address: c.address || null, group: null });
    } else {
      onPick({ clientId: null, name: opt.text, address: null, group: null });
    }
    onText('');
    setOpen(false);
    setActive(-1);
    onPicked?.();
  }

  function clearValue() {
    refocus.current = true;
    onPick(null);
  }

  function onKeyDown(e) {
    const n = options.length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) { setOpen(true); setActive(n ? 0 : -1); } else setActive(n ? (activeIdx + 1) % n : -1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) { setOpen(true); setActive(n ? n - 1 : -1); } else setActive(n ? (activeIdx <= 0 ? n - 1 : activeIdx - 1) : -1);
    } else if (e.key === 'Enter') {
      if (open && activeIdx >= 0 && options[activeIdx]) {
        e.preventDefault();
        choose(options[activeIdx]);
      }
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  }

  if (value) {
    return (
      <div className="jobs-pick">
        <div className="jobs-pick-field has-value">
          <div className="jobs-picked" title={value.address || value.name} onClick={clearValue}>
            {Icon.person}
            <span className="jobs-picked-name">{value.name}</span>
            {value.address && <span className="jobs-picked-addr">{value.address}</span>}
          </div>
          <button
            type="button"
            className="jobs-picked-x"
            aria-label={`Remove client ${value.name}`}
            onClick={(e) => { e.stopPropagation(); clearValue(); }}
          >
            {Icon.close}
          </button>
        </div>
      </div>
    );
  }

  let hint = '';
  if (loadError) hint = "Couldn't load your clients. You can still type a name.";
  else if (!clients.length && !q) hint = 'No clients yet. Type a name to use it as-is.';
  else if (hiddenCount > 0) hint = `${hiddenCount} more. Keep typing to narrow it down.`;

  return (
    <div className="jobs-pick">
      <div className="jobs-pick-field">
        <input
          ref={ref}
          className="jobs-pick-input"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-controls={open && options.length ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={open && activeIdx >= 0 ? `${uid}-opt-${activeIdx}` : undefined}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="words"
          spellCheck={false}
          placeholder={placeholder}
          value={text}
          autoFocus={autoFocus}
          onChange={(e) => {
            onText(e.target.value);
            setOpen(true);
            setActive(e.target.value.trim() ? 0 : -1);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
      </div>

      {open && (options.length > 0 || hint) && (
        // preventDefault on mousedown keeps focus in the input so a tap on an
        // option can't be eaten by the blur that would close the list.
        <div ref={popRef} className="jobs-pick-pop" onMouseDown={(e) => e.preventDefault()}>
          {options.length > 0 && (
            <ul id={listId} className="jobs-pick-list" role="listbox" aria-label="Clients">
              {options.map((opt, i) => (
                <li
                  key={opt.kind === 'client' ? opt.client.id : 'free'}
                  id={`${uid}-opt-${i}`}
                  role="option"
                  aria-selected={i === activeIdx}
                  className={`jobs-opt${i === activeIdx ? ' is-active' : ''}${opt.kind === 'free' ? ' is-free' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(opt)}
                >
                  {opt.kind === 'client' ? (
                    <>
                      <span className="jobs-opt-main">
                        <span className="jobs-opt-name">{opt.client.name}</span>
                        {opt.client.address && <span className="jobs-opt-addr">{opt.client.address}</span>}
                      </span>
                      {routesLabel(opt.client.routes) && (
                        <span className="jobs-badge" data-g={opt.client.routes.length === 1 ? opt.client.routes[0] : undefined}>
                          {routesLabel(opt.client.routes)}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="jobs-opt-main">
                      <span className="jobs-opt-name">Use “{opt.text}”</span>
                      <span className="jobs-opt-addr">Not in your Clients list</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {hint && <div className="jobs-pick-hint">{hint}</div>}
        </div>
      )}
    </div>
  );
}
