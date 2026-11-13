'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PRIORITIES, PRIORITY_LABELS, formatMinutes, formatMinutesShort, formatMoney } from '../../../../lib/jobs';
import JobsClientPicker from './JobsClientPicker';
import JobsTimePicker from './JobsTimePicker';
import JobsIncomePicker from './JobsIncomePicker';
import JobsDatePicker from './JobsDatePicker';
import { formatDay } from '../../../../lib/advertising';
import { Icon } from './JobsIcons';

// Click straight on text to edit it in place. Enter / blur saves, Escape cancels.
// `finished` guards against the blur some browsers fire when the input unmounts,
// which would otherwise re-run the save after Escape.
function EditableText({ value, placeholder, className, label, multiline, maxLength, disabled, allowEmpty, startEditing, onSave, onClose }) {
  const [editing, setEditing] = useState(Boolean(startEditing));
  const [draft, setDraft] = useState(value || '');
  const finished = useRef(false);

  function begin() {
    if (disabled) return;
    finished.current = false;
    setDraft(value || '');
    setEditing(true);
  }

  function finish(save) {
    if (finished.current) return;
    finished.current = true;
    setEditing(false);
    onClose?.();
    if (!save) return;
    const next = draft.trim();
    // A title can't be blank; an empty edit just reverts.
    if (next !== (value || '') && (next || allowEmpty)) onSave(next);
  }

  if (!editing) {
    return (
      <button
        type="button"
        className={`jobs-text-btn ${className}`}
        title="Click to edit"
        aria-label={value ? `Edit ${label.toLowerCase()}: ${value}` : `Add ${label.toLowerCase()}`}
        disabled={disabled}
        onClick={begin}
      >
        {value || <span className="jobs-text-empty">{placeholder}</span>}
      </button>
    );
  }

  const Tag = multiline ? 'textarea' : 'input';
  return (
    <Tag
      autoFocus
      className={`jobs-edit ${className}`}
      value={draft}
      maxLength={maxLength}
      aria-label={label}
      placeholder={placeholder}
      rows={multiline ? 2 : undefined}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => { const n = e.target.value.length; e.target.setSelectionRange(n, n); }}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !(multiline && e.shiftKey)) { e.preventDefault(); finish(true); }
        else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); }
      }}
    />
  );
}

// Small popover that closes on outside tap, Escape, or focus leaving it.
function usePopover() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    wrapRef.current?.querySelector('.jobs-pop')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const close = useCallback((refocus) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  return {
    open,
    close,
    wrapRef,
    triggerRef,
    toggle: () => setOpen((v) => !v),
    wrapProps: {
      ref: wrapRef,
      onKeyDown: (e) => {
        if (e.key === 'Escape' && open) { e.stopPropagation(); close(true); }
      },
      onBlur: (e) => {
        if (open && e.relatedTarget && !wrapRef.current?.contains(e.relatedTarget)) setOpen(false);
      },
    },
  };
}

export default function JobsRow({
  job, clients, clientsError, isNew,
  onToggle, onTitle, onNotes, onMinutes, onIncome, onSchedule, onPriority, onClient, onDuplicate, onDelete,
}) {
  const locked = Boolean(job._pending);
  const clientPop = usePopover();
  const timePop = usePopover();
  const incomePop = usePopover();
  const datePop = usePopover();
  const prioPop = usePopover();
  const [clientText, setClientText] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);

  useEffect(() => {
    if (!clientPop.open) setClientText('');
  }, [clientPop.open]);

  const hasClient = Boolean(job.client_name);
  const hasTime = job.estimated_minutes > 0;
  const hasIncome = job.estimated_income !== null && job.estimated_income !== undefined;
  const hasDate = Boolean(job.scheduled_date);
  const cls = [
    'jobs-row',
    job.done && 'is-done',
    locked && 'is-pending',
    isNew && 'is-new',
    (clientPop.open || timePop.open || incomePop.open || prioPop.open || datePop.open) && 'has-pop',
  ].filter(Boolean).join(' ');

  return (
    <li className={cls} data-p={job.priority}>
      <button
        type="button"
        role="checkbox"
        aria-checked={job.done}
        aria-label={job.title}
        className="jobs-check"
        disabled={locked}
        onClick={() => onToggle(job)}
      >
        <span className="jobs-check-dot">{Icon.check}</span>
      </button>

      <div className="jobs-main">
        <EditableText
          className="jobs-title"
          label="Job title"
          value={job.title}
          maxLength={200}
          disabled={locked}
          onSave={(v) => onTitle(job, v)}
        />

        <div className="jobs-meta-line">
          <span className="jobs-pop-anchor" {...clientPop.wrapProps}>
            <button
              ref={clientPop.triggerRef}
              type="button"
              className={`jobs-chip ${hasClient ? 'jobs-chip-client' : 'jobs-chip-ghost'}`}
              aria-haspopup="dialog"
              aria-expanded={clientPop.open}
              aria-label={hasClient ? `Client ${job.client_name}. Change client.` : 'Add a client'}
              title={hasClient ? 'Change client' : 'Add a client'}
              disabled={locked}
              onClick={clientPop.toggle}
            >
              {Icon.person}
              <span>{hasClient ? job.client_name : 'Client'}</span>
            </button>
            {clientPop.open && (
              <div className="jobs-pop jobs-pop-client" role="dialog" aria-label="Choose a client">
                <div className="jobs-pop-head">
                  <span className="jobs-label">Client</span>
                  {hasClient && (
                    <button
                      type="button"
                      className="admin-mini admin-mini-danger"
                      onClick={() => { onClient(job, null); clientPop.close(true); }}
                    >
                      Remove client
                    </button>
                  )}
                </div>
                <JobsClientPicker
                  clients={clients}
                  loadError={clientsError}
                  value={null}
                  autoFocus
                  text={clientText}
                  onText={setClientText}
                  onPick={(v) => { if (v) { onClient(job, v); clientPop.close(true); } }}
                />
              </div>
            )}
          </span>

          {job.address && <span className="jobs-addr" title={job.address}>{job.address}</span>}

          {!job.notes && !noteOpen && !locked && (
            <button type="button" className="jobs-chip jobs-chip-ghost" aria-label="Add a note" onClick={() => setNoteOpen(true)}>
              {Icon.note}
              <span>Note</span>
            </button>
          )}
        </div>

        {(job.notes || noteOpen) && (
          <EditableText
            className="jobs-notes"
            multiline
            allowEmpty
            label="Note"
            placeholder="Add a note: gate code, what to bring..."
            startEditing={noteOpen && !job.notes}
            value={job.notes || ''}
            maxLength={2000}
            disabled={locked}
            onSave={(v) => onNotes(job, v)}
            onClose={() => setNoteOpen(false)}
          />
        )}
      </div>

      <div className="jobs-chips">
        <span className="jobs-pop-anchor" {...datePop.wrapProps}>
          <button
            ref={datePop.triggerRef}
            type="button"
            className={`jobs-chip jobs-chip-date ${hasDate ? '' : 'jobs-chip-ghost'}`}
            aria-haspopup="dialog"
            aria-expanded={datePop.open}
            aria-label={hasDate ? `On the calendar ${formatDay(job.scheduled_date, true)}. Change.` : 'Put on the calendar'}
            title={hasDate ? 'On the calendar. Click to change or remove.' : 'Put on the calendar (optional)'}
            disabled={locked}
            onClick={datePop.toggle}
          >
            {Icon.calendar}
            <span>{hasDate ? formatDay(job.scheduled_date) : 'Date'}</span>
          </button>
          {datePop.open && (
            <div className="jobs-pop jobs-pop-date" role="dialog" aria-label="Calendar date">
              <JobsDatePicker
                date={job.scheduled_date || null}
                onChange={(d) => onSchedule(job, d)}
                onDone={() => datePop.close(true)}
              />
            </div>
          )}
        </span>

        <span className="jobs-pop-anchor" {...incomePop.wrapProps}>
          <button
            ref={incomePop.triggerRef}
            type="button"
            className={`jobs-chip jobs-chip-income ${hasIncome ? '' : 'jobs-chip-ghost'}`}
            aria-haspopup="dialog"
            aria-expanded={incomePop.open}
            aria-label={hasIncome ? `Estimated income ${formatMoney(job.estimated_income)}. Change.` : 'Add estimated income'}
            title={hasIncome ? 'Change estimated income' : 'Add estimated income'}
            disabled={locked}
            onClick={incomePop.toggle}
          >
            {Icon.dollar}
            <span>{hasIncome ? formatMoney(job.estimated_income) : 'Income'}</span>
          </button>
          {incomePop.open && (
            <div className="jobs-pop jobs-pop-income" role="dialog" aria-label="Estimated income">
              <JobsIncomePicker
                explicit
                amount={hasIncome ? Number(job.estimated_income) : null}
                onChange={(a) => onIncome(job, a)}
                onDone={() => incomePop.close(true)}
              />
            </div>
          )}
        </span>

        <span className="jobs-pop-anchor" {...timePop.wrapProps}>
          <button
            ref={timePop.triggerRef}
            type="button"
            className={`jobs-chip jobs-chip-time ${hasTime ? '' : 'jobs-chip-ghost'}`}
            aria-haspopup="dialog"
            aria-expanded={timePop.open}
            aria-label={hasTime ? `Estimated time ${formatMinutes(job.estimated_minutes)}. Change.` : 'Add an estimated time'}
            title={hasTime ? 'Change estimated time' : 'Add an estimated time'}
            disabled={locked}
            onClick={timePop.toggle}
          >
            {Icon.clock}
            <span>{hasTime ? formatMinutesShort(job.estimated_minutes) : 'Time'}</span>
          </button>
          {timePop.open && (
            <div className="jobs-pop jobs-pop-time" role="dialog" aria-label="Estimated time">
              <JobsTimePicker
                explicit
                minutes={hasTime ? job.estimated_minutes : null}
                onChange={(m) => onMinutes(job, m)}
                onDone={() => timePop.close(true)}
              />
            </div>
          )}
        </span>

        <span className="jobs-pop-anchor" {...prioPop.wrapProps}>
          <button
            ref={prioPop.triggerRef}
            type="button"
            className="jobs-pill"
            data-p={job.priority}
            disabled={locked}
            aria-haspopup="dialog"
            aria-expanded={prioPop.open}
            aria-label={`Priority ${PRIORITY_LABELS[job.priority] || job.priority}. Change priority.`}
            title="Change priority"
            onClick={prioPop.toggle}
          >
            <span className="jobs-dot" aria-hidden="true" />
            {PRIORITY_LABELS[job.priority] || job.priority}
          </button>
          {prioPop.open && (
            <div className="jobs-pop jobs-pop-prio" role="dialog" aria-label="Priority">
              <div className="jobs-seg" role="group" aria-label="Priority">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    data-p={p}
                    className={`jobs-seg-btn${job.priority === p ? ' is-on' : ''}`}
                    aria-pressed={job.priority === p}
                    onClick={() => { prioPop.close(true); onPriority(job, p); }}
                  >
                    <span className="jobs-dot" aria-hidden="true" />
                    {PRIORITY_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </span>
      </div>

      <div className="jobs-actions">
        <button
          type="button"
          className="jobs-icon-btn"
          aria-label={`Duplicate ${job.title}`}
          title="Duplicate"
          disabled={locked}
          onClick={() => onDuplicate(job)}
        >
          {Icon.copy}
        </button>
        <button
          type="button"
          className="jobs-icon-btn is-danger"
          aria-label={`Delete ${job.title}`}
          title="Delete"
          disabled={locked}
          onClick={() => onDelete(job)}
        >
          {Icon.trash}
        </button>
      </div>
    </li>
  );
}
