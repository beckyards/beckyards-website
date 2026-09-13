'use client';

import { useEffect, useRef, useState } from 'react';

// Drop an image anywhere in the admin area — not just on /admin/images' own
// drop zone — and it uploads straight to the media library, with the same
// clean auto-naming as everywhere else. Pages with their own drop zone
// (Images, Enhance) call stopPropagation() in their own onDrop, so a drop
// there is handled once, by that page, not twice.
export default function GlobalDropZone({ children }) {
  const [dragging, setDragging] = useState(false);
  const [toast, setToast] = useState(null); // { status, message, uploaded, errors }
  const [copiedName, setCopiedName] = useState('');
  const dragDepth = useRef(0);

  useEffect(() => {
    function carriesFiles(e) {
      return Array.from(e.dataTransfer?.types || []).includes('Files');
    }

    function onDragEnter(e) {
      if (!carriesFiles(e)) return;
      dragDepth.current += 1;
      setDragging(true);
    }
    function onDragOver(e) {
      if (!carriesFiles(e)) return;
      e.preventDefault();
    }
    function onDragLeave(e) {
      if (!carriesFiles(e)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    }
    async function onDrop(e) {
      if (!carriesFiles(e)) return;
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);

      const files = Array.from(e.dataTransfer.files || []);
      if (files.length === 0) return;

      setToast({ status: 'uploading', message: `Uploading ${files.length} image${files.length === 1 ? '' : 's'}…` });
      try {
        const form = new FormData();
        files.forEach((f) => form.append('files', f));
        const res = await fetch('/api/admin/media', { method: 'POST', body: form });
        const data = await res.json().catch(() => ({}));
        if (!res.ok && !(data.uploaded?.length)) throw new Error(data.error || 'Upload failed.');
        setToast({ status: 'done', uploaded: data.uploaded || [], errors: data.errors || [] });
      } catch (err) {
        setToast({ status: 'error', message: err.message });
      }
    }

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  useEffect(() => {
    if (toast?.status !== 'done' && toast?.status !== 'error') return;
    const t = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(t);
  }, [toast]);

  async function copyUrl(url, name) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedName(name);
      setTimeout(() => setCopiedName(''), 1500);
    } catch {
      // Clipboard can be denied — the name/URL is still visible in the toast.
    }
  }

  return (
    <>
      {children}

      {dragging && (
        <div className="admin-global-drop-overlay">
          <div className="admin-global-drop-badge">Drop to upload to Images</div>
        </div>
      )}

      {toast && (
        <div className="admin-toast">
          <div className="admin-toast-head">
            <span>
              {toast.status === 'uploading' && toast.message}
              {toast.status === 'error' && 'Upload failed'}
              {toast.status === 'done' &&
                `${toast.uploaded.length} image${toast.uploaded.length === 1 ? '' : 's'} uploaded`}
            </span>
            <button type="button" className="admin-toast-close" onClick={() => setToast(null)} aria-label="Dismiss">✕</button>
          </div>
          {toast.status === 'error' && <p className="admin-json-error">{toast.message}</p>}
          {toast.status === 'done' && (
            <>
              {toast.uploaded.map((u) => (
                <div className="admin-toast-item" key={u.name}>
                  <span title={u.name}>{u.name}</span>
                  <button type="button" className="admin-mini" onClick={() => copyUrl(u.url, u.name)}>
                    {copiedName === u.name ? 'Copied!' : 'Copy URL'}
                  </button>
                </div>
              ))}
              {toast.errors?.map((msg, i) => (
                <p className="admin-json-error" key={i}>{msg}</p>
              ))}
              {toast.uploaded.length > 0 && (
                <a className="admin-toast-link" href="/admin/images">Open Images →</a>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
