'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Skeleton } from './ui';
import JobsQuickAdd from './JobsQuickAdd';
import JobsRow from './JobsRow';
import {
  PRIORITIES,
  PRIORITY_LABELS,
  compareJobs,
  formatMinutes,
  formatMoney,
  totalIncome,
  totalMinutes,
} from '../../../../lib/jobs';

const TABS = [
  { key: 'open', label: 'Open' },
  { key: 'done', label: 'Done' },
  { key: 'all', label: 'All' },
];

class ApiError extends Error {}

async function getJson(url) {
  const res = await fetch(url);
  const d = await res.json().catch(() => ({}));
  if (!res.ok || d.error) throw new Error(d.error || 'Request failed.');
  return d;
}

async function api(method, body) {
  let res;
  try {
    res = await fetch('/api/admin/jobs', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.');
  }
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(d.error || 'Something went wrong. Please try again.');
  return d;
}

function clip(text, n = 60) {
  const t = String(text || '');
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function matchesQuery(job, q) {
  if (!q) return true;
  return [job.title, job.client_name, job.address, job.notes].some((v) => v && v.toLowerCase().includes(q));
}

export default function JobsView() {
  const [jobs, setJobs] = useState(null);
  const [clients, setClients] = useState([]);
  const [clientsError, setClientsError] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('open');
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState(null);
  const [highlight, setHighlight] = useState(null);
  const [clearing, setClearing] = useState(false);

  // jobsRef always holds the latest list so async handlers never read a stale
  // closure; setAll keeps it and React state in step.
  const jobsRef = useRef(null);
  const queues = useRef(new Map()); // job id -> { tail, count }: one request at a time per job
  const inflight = useRef(0);
  const mutations = useRef(0);
  const lastLoad = useRef(0);
  const tempSeq = useRef(0);
  const noticeTimer = useRef(null);
  const highlightTimer = useRef(null);

  const setAll = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(jobsRef.current || []) : updater;
    jobsRef.current = next;
    setJobs(next);
  }, []);

  const loadAll = useCallback(async (silent) => {
    const startedAt = mutations.current;
    lastLoad.current = Date.now();
    const [j, c] = await Promise.allSettled([getJson('/api/admin/jobs'), getJson('/api/admin/mowing-route')]);

    if (j.status === 'fulfilled') {
      const items = Array.isArray(j.value.items) ? j.value.items : [];
      // Adds are held until the first load lands, so an unloaded list is always untouched.
      if (jobsRef.current === null || (mutations.current === startedAt && inflight.current === 0)) {
        // Rows added this session keep their React key so open editors/popovers survive a refresh.
        const keys = new Map((jobsRef.current || []).filter((x) => x._key).map((x) => [x.id, x._key]));
        setAll(items.map((x) => (keys.has(x.id) ? { ...x, _key: keys.get(x.id) } : x)));
      }
      if (!silent) { setLoadFailed(false); setError(''); }
    } else if (!silent) {
      setLoadFailed(true);
      setError(j.reason?.message && j.reason.message !== 'Request failed.' ? j.reason.message : 'Could not load your jobs.');
    }

    if (c.status === 'fulfilled') {
      setClients(Array.isArray(c.value.items) ? c.value.items : []);
      setClientsError(false);
    } else if (!silent) {
      setClientsError(true);
    }
  }, [setAll]);

  useEffect(() => { loadAll(false); }, [loadAll]);

  // Coming back to the tab (e.g. after adding a client on the Clients page, or
  // editing on another device) quietly refreshes both lists.
  useEffect(() => {
    function refresh() {
      if (document.visibilityState !== 'visible') return;
      if (inflight.current > 0 || Date.now() - lastLoad.current < 5000) return;
      loadAll(true);
    }
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [loadAll]);

  useEffect(() => () => {
    clearTimeout(noticeTimer.current);
    clearTimeout(highlightTimer.current);
  }, []);

  function showNotice(text, undo) {
    clearTimeout(noticeTimer.current);
    setNotice({ text, undo });
    noticeTimer.current = setTimeout(() => setNotice(null), 6000);
  }

  function enqueue(id, task) {
    let q = queues.current.get(id);
    if (!q) {
      q = { tail: Promise.resolve(), count: 0 };
      queues.current.set(id, q);
    }
    q.count += 1;
    inflight.current += 1;
    q.tail = q.tail
      .then(() => task(() => q.count > 1))
      .catch(() => {})
      .finally(() => {
        q.count -= 1;
        inflight.current -= 1;
        if (q.count === 0) queues.current.delete(id);
      });
  }

  // Optimistic edit of one job. `fields` goes to the API; `optimistic` is what we
  // show right away (it can carry extras like completed_at). On failure only the
  // fields we touched are rolled back, and only if nobody changed them since.
  function updateJob(id, fields, optimistic = fields) {
    const cur = jobsRef.current?.find((j) => j.id === id);
    if (!cur || cur._pending) return;
    mutations.current += 1;
    setError('');

    const prev = {};
    for (const k of Object.keys(optimistic)) prev[k] = cur[k];
    setAll((list) => list.map((j) => (j.id === id ? { ...j, ...optimistic } : j)));

    enqueue(id, async (moreQueued) => {
      try {
        const d = await api('PATCH', { id, ...fields });
        if (d.item && !moreQueued()) {
          setAll((list) => list.map((j) => (j.id === id ? { ...j, ...d.item } : j)));
        }
      } catch (e) {
        setError(e.message);
        setAll((list) => list.map((j) => {
          if (j.id !== id) return j;
          const next = { ...j };
          for (const k of Object.keys(prev)) if (next[k] === optimistic[k]) next[k] = prev[k];
          return next;
        }));
      }
    });
  }

  function setDone(id, done) {
    const job = jobsRef.current?.find((j) => j.id === id);
    if (!job || job.done === done) return;
    updateJob(id, { done }, { done, completed_at: done ? new Date().toISOString() : null });
  }

  function toggleDone(job) {
    const done = !job.done;
    setDone(job.id, done);
    if (done) showNotice(`Done: ${clip(job.title, 50)}`, () => setDone(job.id, false));
  }

  function changePriority(job, priority) {
    if (job.priority === priority) return;
    updateJob(job.id, { priority });
    if (!job.done) showNotice(`Moved “${clip(job.title, 40)}” to ${PRIORITY_LABELS[priority]}`);
  }

  function changeClient(job, value) {
    if (!value) {
      updateJob(job.id, { client_id: null, client_name: null, address: null });
    } else if (value.clientId) {
      updateJob(
        job.id,
        { client_id: value.clientId },
        { client_id: value.clientId, client_name: value.name, address: value.address },
      );
    } else {
      updateJob(job.id, { client_id: null, client_name: value.name, address: null });
    }
  }

  async function createJob(f) {
    mutations.current += 1;
    setError('');
    const tempId = `tmp-${Date.now()}-${++tempSeq.current}`;
    const temp = {
      id: tempId,
      _key: tempId,
      _pending: true,
      title: f.title,
      client_id: f.client_id || null,
      client_name: f.client_name || null,
      address: f.address || null,
      estimated_minutes: f.estimated_minutes ?? null,
      estimated_income: f.estimated_income ?? null,
      priority: f.priority || 'medium',
      notes: f.notes || null,
      done: false,
      completed_at: null,
      sort_order: Date.now(),
      created_at: new Date().toISOString(),
    };

    // A client link wins; the server fills in its name and address.
    const body = {
      title: f.title,
      priority: temp.priority,
      estimated_minutes: temp.estimated_minutes,
      estimated_income: temp.estimated_income,
      notes: temp.notes,
    };
    if (temp.client_id) {
      body.client_id = temp.client_id;
    } else if (temp.client_name) {
      body.client_name = temp.client_name;
      if (temp.address) body.address = temp.address;
    }

    inflight.current += 1;
    setAll((list) => [...list, temp]);
    clearTimeout(highlightTimer.current);
    setHighlight(tempId);
    highlightTimer.current = setTimeout(() => setHighlight(null), 2200);

    try {
      const d = await api('POST', body);
      setAll((list) => list.map((j) => (j.id === tempId ? { ...d.item, _key: tempId } : j)));
      return true;
    } catch (e) {
      setAll((list) => list.filter((j) => j.id !== tempId));
      setError(e.message);
      return false;
    } finally {
      inflight.current -= 1;
    }
  }

  async function handleQuickAdd({ title, client, minutes, income, priority }) {
    if (tab === 'done') setTab('open');
    setQuery('');
    const ok = await createJob({
      title,
      client_id: client?.clientId || null,
      client_name: client?.name || null,
      address: client?.address || null,
      estimated_minutes: minutes,
      estimated_income: income,
      priority,
    });
    if (ok) {
      const parts = [`Added “${clip(title, 50)}”`, PRIORITY_LABELS[priority]];
      if (minutes) parts.push(formatMinutes(minutes));
      if (income != null) parts.push(formatMoney(income));
      if (client) parts.push(client.name);
      showNotice(parts.join(' · '));
    }
    return ok;
  }

  async function duplicateJob(job) {
    if (tab === 'done') setTab('open');
    const ok = await createJob({
      title: job.title,
      client_id: job.client_id,
      client_name: job.client_name,
      address: job.client_id ? null : job.address,
      estimated_minutes: job.estimated_minutes,
      estimated_income: job.estimated_income,
      priority: job.priority,
      notes: job.notes,
    });
    if (ok) showNotice(`Copied “${clip(job.title, 50)}”`);
  }

  function removeJob(job) {
    if (!confirm(`Delete "${clip(job.title)}"? This can't be undone.`)) return;
    mutations.current += 1;
    setError('');
    setAll((list) => list.filter((j) => j.id !== job.id));
    enqueue(job.id, async () => {
      try {
        await api('DELETE', { id: job.id });
      } catch (e) {
        setError(e.message);
        setAll((list) => (list.some((j) => j.id === job.id) ? list : [...list, job]));
      }
    });
  }

  async function clearDone() {
    setClearing(true);
    inflight.current += 1;
    try {
      // Let queued saves land first so a job ticked a moment ago is really done on the server.
      await Promise.all([...queues.current.values()].map((q) => q.tail));
      const ids = (jobsRef.current || []).filter((j) => j.done && !j._pending).map((j) => j.id);
      if (!ids.length) return;
      // Deleting a finished job also removes it from the "Earned" total, so say so.
      const toClear = new Set(ids);
      const earnedGone = totalIncome((jobsRef.current || []).filter((j) => toClear.has(j.id)));
      const warn = earnedGone > 0 ? ` Your Earned total will drop by ${formatMoney(earnedGone)}.` : '';
      if (!confirm(`Permanently delete ${plural(ids.length, 'completed job')}? This can't be undone.${warn}`)) return;
      mutations.current += 1;
      setError('');
      // Sending the ids means jobs finished on another device since the last refresh are left alone.
      await api('DELETE', { clearDone: true, ids });
      const gone = new Set(ids);
      setAll((list) => list.filter((j) => !gone.has(j.id)));
    } catch (e) {
      setError(e.message);
    } finally {
      inflight.current -= 1;
      setClearing(false);
    }
  }

  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })),
    [clients],
  );

  const { open, done } = useMemo(() => {
    const list = jobs || [];
    return {
      open: list.filter((j) => !j.done).sort(compareJobs),
      done: list
        .filter((j) => j.done)
        .sort((a, b) => (Date.parse(b.completed_at) || 0) - (Date.parse(a.completed_at) || 0)),
    };
  }, [jobs]);

  const q = query.trim().toLowerCase();
  const sections = [];
  if (tab !== 'done') {
    const visible = open.filter((j) => matchesQuery(j, q));
    for (const p of PRIORITIES) {
      const items = visible.filter((j) => j.priority === p);
      if (items.length) sections.push({ key: p, p, title: PRIORITY_LABELS[p], items });
    }
  }
  if (tab !== 'open') {
    const items = done.filter((j) => matchesQuery(j, q));
    if (items.length) sections.push({ key: 'done', p: 'done', title: tab === 'done' ? 'Completed' : 'Done', items });
  }

  const counts = { open: open.length, done: done.length, all: (jobs || []).length };
  const openMinutes = totalMinutes(open);
  const unestimated = open.filter((j) => !(j.estimated_minutes > 0)).length;
  const scheduledIncome = totalIncome(open);
  const unpriced = open.filter((j) => j.estimated_income === null || j.estimated_income === undefined).length;
  const earnedIncome = totalIncome(done);
  const now = new Date();
  const earnedThisMonth = totalIncome(
    done.filter((j) => {
      const d = new Date(j.completed_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }),
  );
  const byPriority = Object.fromEntries(PRIORITIES.map((p) => [p, open.filter((j) => j.priority === p).length]));

  let emptyText = '';
  if (jobs && sections.length === 0) {
    if (q) emptyText = `No jobs match “${query.trim()}”.`;
    else if (tab === 'open') emptyText = 'No open jobs — add one above.';
    else if (tab === 'done') emptyText = 'Nothing completed yet. Tick a job off and it will show up here.';
    else emptyText = 'No jobs yet — add your first one above.';
  }

  return (
    <div className="admin-page jobs-page">
      <h1>Jobs</h1>
      <p className="admin-lead">
        Everything that still needs doing, with a time estimate, an income estimate and a priority.
        Type the job, pick a client straight from your Clients list, add what you expect to make,
        tap a time and a priority, and hit Enter. Tick a job off when it's finished and its income
        moves from Scheduled to Earned.
      </p>

      {error && (
        <p className="admin-error jobs-error" role="alert">
          <span>{error}</span>
          <button type="button" className="jobs-error-x" aria-label="Dismiss message" onClick={() => setError('')}>×</button>
        </p>
      )}

      <JobsQuickAdd
        clients={sortedClients}
        clientsError={clientsError}
        ready={Boolean(jobs)}
        loadFailed={loadFailed}
        onAdd={handleQuickAdd}
      />

      {!jobs ? (
        loadFailed ? (
          <button type="button" className="admin-mini" onClick={() => loadAll(false)}>Try again</button>
        ) : (
          <>
            <Skeleton h={56} style={{ marginBottom: 14 }} />
            <Skeleton h={72} style={{ marginBottom: 10 }} />
            <Skeleton h={72} style={{ marginBottom: 10 }} />
            <Skeleton h={72} />
          </>
        )
      ) : (
        <>
          <div className="jobs-summary">
            <div className="jobs-sum-item jobs-sum-money">
              <span className="jobs-sum-label">Scheduled income</span>
              <span className="jobs-sum-num">{formatMoney(scheduledIncome) || '$0'}</span>
              <span className="jobs-sum-sub">
                {open.length === 0
                  ? 'No open jobs'
                  : unpriced > 0
                    ? `${unpriced} of ${open.length} open without an amount`
                    : 'From all open jobs'}
              </span>
            </div>
            <div className="jobs-sum-item jobs-sum-money is-earned">
              <span className="jobs-sum-label">Earned</span>
              <span className="jobs-sum-num">{formatMoney(earnedIncome) || '$0'}</span>
              <span className="jobs-sum-sub">
                {done.length === 0 ? 'No completed jobs yet' : `${formatMoney(earnedThisMonth) || '$0'} this month`}
              </span>
            </div>
            <div className="jobs-sum-item">
              <span className="jobs-sum-label">Open jobs</span>
              <span className="jobs-sum-num">{open.length}</span>
            </div>
            <div className="jobs-sum-item">
              <span className="jobs-sum-label">Estimated time</span>
              <span className="jobs-sum-num">{openMinutes > 0 ? formatMinutes(openMinutes) : '0 min'}</span>
              {unestimated > 0 && open.length > 0 && (
                <span className="jobs-sum-sub">{unestimated} without an estimate</span>
              )}
            </div>
            <div className="jobs-sum-item jobs-sum-prio">
              <span className="jobs-sum-label">By priority</span>
              <span className="jobs-sum-pills">
                {PRIORITIES.map((p) => (
                  <span key={p} className="jobs-count-pill" data-p={p}>
                    <span className="jobs-dot" aria-hidden="true" />
                    {byPriority[p]} {PRIORITY_LABELS[p]}
                  </span>
                ))}
              </span>
            </div>
          </div>

          <div className="jobs-toolbar">
            <div className="seg" role="group" aria-label="Show jobs">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={tab === t.key ? 'is-active' : undefined}
                  aria-pressed={tab === t.key}
                  onClick={() => setTab(t.key)}
                >
                  {t.label} <span className="jobs-tab-count">{counts[t.key]}</span>
                </button>
              ))}
            </div>
            <input
              className="admin-search jobs-search"
              type="search"
              placeholder="Search jobs or clients"
              aria-label="Search jobs or clients"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {emptyText && <p className="jobs-empty">{emptyText}</p>}

          {sections.map((s) => {
            const mins = totalMinutes(s.items);
            const money = totalIncome(s.items);
            return (
              <section key={s.key} className="jobs-section" data-p={s.p} aria-label={`${s.title} jobs`}>
                <header className="jobs-section-head">
                  <span className="jobs-dot" aria-hidden="true" />
                  <h2>{s.title}</h2>
                  <span className="jobs-section-meta">
                    {plural(s.items.length, 'job')}
                    {mins > 0 ? ` · ${formatMinutes(mins)}` : ''}
                    {money > 0 ? ` · ${formatMoney(money)}` : ''}
                  </span>
                  {s.key === 'done' && (
                    <button type="button" className="admin-mini admin-mini-danger" disabled={clearing} onClick={clearDone}>
                      {clearing ? 'Clearing…' : 'Clear completed'}
                    </button>
                  )}
                </header>
                <ul className="jobs-list">
                  {s.items.map((job) => (
                    <JobsRow
                      key={job._key || job.id}
                      job={job}
                      clients={sortedClients}
                      clientsError={clientsError}
                      isNew={highlight != null && job._key === highlight}
                      onToggle={toggleDone}
                      onTitle={(j, title) => updateJob(j.id, { title })}
                      onNotes={(j, notes) => updateJob(j.id, { notes: notes || null })}
                      onMinutes={(j, minutes) => updateJob(j.id, { estimated_minutes: minutes })}
                      onIncome={(j, amount) => updateJob(j.id, { estimated_income: amount })}
                      onPriority={changePriority}
                      onClient={changeClient}
                      onDuplicate={duplicateJob}
                      onDelete={removeJob}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </>
      )}

      <div className="jobs-toast-region" role="status" aria-live="polite">
        {notice && (
          <div className="jobs-toast">
            <span>{notice.text}</span>
            {notice.undo && (
              <button type="button" className="jobs-undo" onClick={() => { notice.undo(); setNotice(null); }}>Undo</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
