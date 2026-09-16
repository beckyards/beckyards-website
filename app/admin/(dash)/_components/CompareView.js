'use client';

import { useState } from 'react';
import ImagePickerModal from '../content/ImagePickerModal';
import Lightbox from './Lightbox';

function formatBytes(n) {
  if (!n) return '';
  if (n > 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(n / 1024)} KB`;
}

function Slot({ title, url, onPick, onClear }) {
  return (
    <div className="admin-image-field">
      {url ? (
        <div className="admin-field-preview-drop" onClick={onPick}>
          <img className="admin-field-preview" src={url} alt="" />
          <span className="admin-field-preview-hint">Click to change</span>
        </div>
      ) : (
        <button type="button" className="admin-drop" onClick={onPick} style={{ width: '100%' }}>
          <p>{title}</p>
          <span>Click to choose from Images</span>
        </button>
      )}
      {url && (
        <button type="button" className="admin-mini admin-mini-danger" onClick={onClear}>
          Remove
        </button>
      )}
    </div>
  );
}

export default function CompareView() {
  const [beforeUrl, setBeforeUrl] = useState(null);
  const [afterUrl, setAfterUrl] = useState(null);
  const [beforeLabel, setBeforeLabel] = useState('Before');
  const [afterLabel, setAfterLabel] = useState('After');
  const [layout, setLayout] = useState('horizontal');
  const [picking, setPicking] = useState(null); // 'before' | 'after' | null

  const [stage, setStage] = useState('idle'); // idle | generating | preview | saving | saved | error
  const [preview, setPreview] = useState(null); // { url, bytes } | null
  const [saved, setSaved] = useState(null); // { name, url, bytes } | null
  const [error, setError] = useState('');
  const [zoomed, setZoomed] = useState(null);

  const canGenerate = beforeUrl && afterUrl && stage !== 'generating' && stage !== 'saving';

  async function generate(save) {
    setStage(save ? 'saving' : 'generating');
    setError('');
    try {
      const res = await fetch('/api/admin/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beforeUrl, afterUrl, beforeLabel, afterLabel, layout, save }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not generate the comparison image.');

      if (save) {
        setSaved({ name: data.name, url: data.url, bytes: data.bytes });
        setStage('saved');
      } else {
        setPreview({ url: data.preview, bytes: data.bytes });
        setStage('preview');
      }
    } catch (err) {
      setError(err.message);
      setStage(preview ? 'preview' : 'idle');
    }
  }

  function startOver() {
    setBeforeUrl(null);
    setAfterUrl(null);
    setBeforeLabel('Before');
    setAfterLabel('After');
    setPreview(null);
    setSaved(null);
    setError('');
    setStage('idle');
  }

  return (
    <div className="admin-page admin-page-wide">
      <h1>Before / After</h1>
      <p className="admin-lead">
        Pick two photos already uploaded on the Images page — a before shot and an after shot — and
        generate one combined comparison image labeled with each. Nothing is saved until you choose
        to.
      </p>

      {stage === 'saved' && saved ? (
        <div className="enhance-row">
          <div className="enhance-compare">
            <figure>
              <img className="is-zoomable" src={saved.url} alt="" onClick={() => setZoomed(saved.url)} />
              <figcaption>Saved</figcaption>
            </figure>
          </div>
          <div className="enhance-meta">
            <span className="enhance-size">{formatBytes(saved.bytes)} · saved to Images as {saved.name}</span>
            <div className="admin-media-actions">
              <a className="admin-mini" href="/admin/images" target="_blank" rel="noreferrer">Open Images</a>
              <button type="button" className="admin-mini" onClick={startOver}>Make another</button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="enhance-dual-adjust">
            <div>
              <span className="enhance-group-label">Before photo</span>
              <Slot title="Choose before photo" url={beforeUrl} onPick={() => setPicking('before')} onClear={() => setBeforeUrl(null)} />
              <div className="admin-field" style={{ marginTop: 8 }}>
                <label>Label</label>
                <input value={beforeLabel} onChange={(e) => setBeforeLabel(e.target.value)} maxLength={24} />
              </div>
            </div>
            <div>
              <span className="enhance-group-label">After photo</span>
              <Slot title="Choose after photo" url={afterUrl} onPick={() => setPicking('after')} onClear={() => setAfterUrl(null)} />
              <div className="admin-field" style={{ marginTop: 8 }}>
                <label>Label</label>
                <input value={afterLabel} onChange={(e) => setAfterLabel(e.target.value)} maxLength={24} />
              </div>
            </div>
          </div>

          <div className="admin-mask-tools enhance-mask-tools" style={{ marginTop: 16 }}>
            <span className="enhance-group-label" style={{ marginRight: 4 }}>Layout</span>
            <button type="button" className={`admin-mini${layout === 'horizontal' ? ' is-active' : ''}`} onClick={() => setLayout('horizontal')}>
              Side by side
            </button>
            <button type="button" className={`admin-mini${layout === 'vertical' ? ' is-active' : ''}`} onClick={() => setLayout('vertical')}>
              Stacked
            </button>
          </div>

          {error && <p className="admin-json-error">{error}</p>}

          <div className="admin-media-actions" style={{ marginTop: 14 }}>
            <button type="button" className="admin-primary" disabled={!canGenerate} onClick={() => generate(false)}>
              {stage === 'generating' ? 'Generating…' : 'Generate preview'}
            </button>
            {(beforeUrl || afterUrl) && (
              <button type="button" className="admin-mini" onClick={startOver}>Reset</button>
            )}
          </div>

          {stage === 'preview' && preview && (
            <div className="enhance-row" style={{ marginTop: 16 }}>
              <div className="enhance-compare">
                <figure>
                  <img className="is-zoomable" src={preview.url} alt="" onClick={() => setZoomed(preview.url)} />
                  <figcaption>Preview</figcaption>
                </figure>
              </div>
              <div className="enhance-meta">
                <span className="enhance-size">{formatBytes(preview.bytes)} · not saved yet</span>
                <div className="admin-media-actions">
                  <button type="button" className="admin-primary" onClick={() => generate(true)} disabled={stage === 'saving'}>
                    {stage === 'saving' ? 'Saving…' : 'Save to Images'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <ImagePickerModal
        open={picking !== null}
        onClose={() => setPicking(null)}
        onPick={(url) => {
          if (picking === 'before') setBeforeUrl(url);
          else if (picking === 'after') setAfterUrl(url);
          setPicking(null);
        }}
      />

      {zoomed && <Lightbox src={zoomed} onClose={() => setZoomed(null)} />}
    </div>
  );
}
