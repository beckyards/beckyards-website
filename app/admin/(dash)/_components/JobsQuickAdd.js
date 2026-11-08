'use client';

import { useEffect, useRef, useState } from 'react';
import { PRIORITIES, PRIORITY_LABELS } from '../../../../lib/jobs';
import JobsClientPicker from './JobsClientPicker';
import JobsTimePicker from './JobsTimePicker';
import { Icon } from './JobsIcons';

// The add bar. Priority and time deliberately survive an add so a run of
// similar jobs is just: type, Enter, type, Enter.
export default function JobsQuickAdd({ clients, clientsError, ready, loadFailed, onAdd }) {
  const [title, setTitle] = useState('');
  const [client, setClient] = useState(null);
  const [clientText, setClientText] = useState('');
  const [minutes, setMinutes] = useState(null);
  const [priority, setPriority] = useState('medium');
  const titleRef = useRef(null);
  const addRef = useRef(null);

  // Autofocus only where there's a hardware keyboard; on a phone it would throw the
  // on-screen keyboard over the list before the person has asked to type.
  useEffect(() => {
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) titleRef.current?.focus();
  }, []);

  // Text typed in the client box but never picked still counts: an exact name
  // match becomes that client, anything else is kept as a free-text name.
  function resolveClient() {
    if (client) return client;
    const t = clientText.trim();
    if (!t) return null;
    const hit = clients.find((c) => (c.name || '').trim().toLowerCase() === t.toLowerCase());
    if (hit) return { clientId: hit.id, name: hit.name, address: hit.address || null, group: hit.route_group || null };
    return { clientId: null, name: t, address: null, group: null };
  }

  function submit(e) {
    e.preventDefault();
    const t = title.trim();
    if (!t || !ready) { titleRef.current?.focus(); return; }
    const c = resolveClient();

    setTitle('');
    setClient(null);
    setClientText('');
    titleRef.current?.focus();

    Promise.resolve(onAdd({ title: t, client: c, minutes, priority })).catch(() => false).then((ok) => {
      if (ok) return;
      // The add failed: give the text back unless they've already started the next one.
      setTitle((cur) => cur || t);
      setClient((cur) => cur || c);
    });
  }

  function afterPick() {
    const btn = addRef.current;
    (btn && !btn.disabled ? btn : titleRef.current)?.focus();
  }

  function footText() {
    if (ready) return 'Press Enter to add. Time and priority stay selected for the next job.';
    return loadFailed ? "Couldn't load your jobs. Tap Try again below." : 'Loading your jobs…';
  }

  return (
    <form className="jobs-add" onSubmit={submit} aria-label="Add a job">
      <div className="jobs-field jobs-add-title">
        <label className="jobs-label" htmlFor="jobs-title-input">What needs doing?</label>
        <input
          id="jobs-title-input"
          ref={titleRef}
          className="jobs-input jobs-input-lg"
          value={title}
          placeholder="e.g. Mulch the front beds"
          maxLength={200}
          autoComplete="off"
          autoCapitalize="sentences"
          enterKeyHint="done"
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="jobs-field jobs-add-client">
        <span className="jobs-label">Client (optional)</span>
        <JobsClientPicker
          clients={clients}
          loadError={clientsError}
          value={client}
          onPick={setClient}
          text={clientText}
          onText={setClientText}
          ariaLabel="Client"
          placeholder="Search by name or address"
          onPicked={afterPick}
        />
      </div>

      <div className="jobs-field jobs-add-time">
        <span className="jobs-label">Estimated time (optional)</span>
        <JobsTimePicker minutes={minutes} onChange={setMinutes} />
      </div>

      <div className="jobs-field jobs-add-prio">
        <span className="jobs-label">Priority</span>
        <div className="jobs-seg" role="group" aria-label="Priority">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              type="button"
              data-p={p}
              className={`jobs-seg-btn${priority === p ? ' is-on' : ''}`}
              aria-pressed={priority === p}
              onClick={() => setPriority(p)}
            >
              <span className="jobs-dot" aria-hidden="true" />
              {PRIORITY_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <button ref={addRef} type="submit" className="admin-primary jobs-add-btn" disabled={!title.trim() || !ready}>
        {Icon.plus}
        Add job
      </button>

      <p className="jobs-add-foot">{footText()}</p>
    </form>
  );
}
