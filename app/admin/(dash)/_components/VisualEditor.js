'use client';

import { useEffect, useRef, useState } from 'react';

// Hosts /preview/[pageKey] in an iframe and keeps it in sync with the same
// `value` the Form/Raw JSON tabs edit, over postMessage:
//   iframe -> us:  {type:'ready'}          — send it the current draft
//   iframe -> us:  {type:'change', value}  — someone edited a field in place
//   us -> iframe:  {type:'content', value} — push the current draft down
// The iframe never talks to Supabase itself; it's a pure rendering surface
// driven entirely by whatever this component hands it.
export default function VisualEditor({ pageKey, value, onChange }) {
  const iframeRef = useRef(null);
  const readyRef = useRef(false);
  const [device, setDevice] = useState('desktop');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function onMessage(e) {
      if (e.origin !== window.location.origin) return;
      if (e.source !== iframeRef.current?.contentWindow) return;
      const msg = e.data;
      if (msg?.source !== 'oskelo-preview') return;

      if (msg.type === 'ready') {
        readyRef.current = true;
        setLoading(false);
        post(value);
      } else if (msg.type === 'change') {
        onChange(msg.value);
      }
    }

    function post(v) {
      iframeRef.current?.contentWindow?.postMessage({ source: 'oskelo-admin', type: 'content', value: v }, window.location.origin);
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey]);

  // Re-sync whenever the draft changes from elsewhere (e.g. the Form tab)
  // while this iframe is already loaded.
  useEffect(() => {
    if (!readyRef.current) return;
    iframeRef.current?.contentWindow?.postMessage({ source: 'oskelo-admin', type: 'content', value }, window.location.origin);
  }, [value]);

  function handleLoad() {
    readyRef.current = false; // wait for this (possibly new) document's own 'ready'
  }

  return (
    <div className="visual-editor">
      <div className="visual-editor-bar">
        <div className="admin-modeswitch">
          <button type="button" className={device === 'desktop' ? 'is-active' : undefined} onClick={() => setDevice('desktop')}>Desktop</button>
          <button type="button" className={device === 'mobile' ? 'is-active' : undefined} onClick={() => setDevice('mobile')}>Mobile</button>
        </div>
        <a className="admin-mini" href={`/preview/${pageKey}`} target="_blank" rel="noreferrer">Open full-size ↗</a>
      </div>
      <div className={`visual-editor-frame-wrap${device === 'mobile' ? ' is-mobile' : ''}`}>
        {loading && <div className="visual-editor-loading">Loading preview…</div>}
        <iframe
          ref={iframeRef}
          src={`/preview/${pageKey}`}
          title="Live preview"
          className="visual-editor-frame"
          onLoad={handleLoad}
        />
      </div>
    </div>
  );
}
