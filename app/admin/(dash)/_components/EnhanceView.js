'use client';

import { useEffect, useRef, useState } from 'react';
import Lightbox from './Lightbox';
import MaskCanvas from './MaskCanvas';
import { createClient } from '../../../../lib/supabase/browser';

const NEUTRAL = { brightness: 0, contrast: 0, saturation: 0, sharpen: 0, rotate: 0 };
const NEUTRAL_REGION = { brightness: 0, contrast: 0, saturation: 0, sharpen: 0 };
const NEUTRAL_BG_REGION = { ...NEUTRAL_REGION, blur: 0 };

function baseName(name) {
  const dot = name.lastIndexOf('.');
  return dot > -1 ? name.slice(0, dot) : name;
}

function formatBytes(n) {
  if (!n) return '';
  if (n > 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(n / 1024)} KB`;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// A rough-but-instant live preview of the slider values, layered as CSS on
// top of the server-corrected image — no network round-trip while dragging.
// Sharpening has no CSS equivalent, so it only shows up once you hit "Update
// preview" or "Save", which re-run the real sharp pipeline. Doesn't apply
// once a mask is in play (a spatial split can't be approximated with a
// single filter), so masked previews only update via the real thing.
function liveStyle(adj) {
  return {
    filter: `brightness(${100 + adj.brightness}%) contrast(${100 + adj.contrast}%) saturate(${100 + adj.saturation}%)`,
    transform: adj.rotate ? `rotate(${adj.rotate}deg)` : undefined,
  };
}

function Slider({ label, value, onChange, min = -100, max = 100 }) {
  return (
    <label className="enhance-slider">
      <span>{label}</span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="enhance-slider-value">{value > 0 ? `+${value}` : value}</span>
    </label>
  );
}

function RegionAdjust({ title, adj, onChange, withBlur }) {
  return (
    <div>
      <span className="enhance-group-label">{title}</span>
      <Slider label="Brightness" value={adj.brightness} onChange={(v) => onChange({ ...adj, brightness: v })} />
      <Slider label="Contrast" value={adj.contrast} onChange={(v) => onChange({ ...adj, contrast: v })} />
      <Slider label="Saturation" value={adj.saturation} onChange={(v) => onChange({ ...adj, saturation: v })} />
      <Slider label="Sharpen" value={adj.sharpen} onChange={(v) => onChange({ ...adj, sharpen: v })} min={0} max={100} />
      {withBlur && (
        <Slider label="Blur" value={adj.blur} onChange={(v) => onChange({ ...adj, blur: v })} min={0} max={25} />
      )}
    </div>
  );
}

// Everything to do with "Edit manually": the global sliders (or, once a mask
// exists, separate foreground/background ones), rotate, the paint-a-mask
// tool, and the save/discard/done actions.
function ManualPanel({
  item, onAdjust, onRotate, onReset, onRefresh, onSave, onToggleManual, onDiscard,
  maskMode, setMaskMode, hasMask, setHasMask, brushSize, setBrushSize, erasing, setErasing,
  fgAdj, setFgAdj, bgAdj, setBgAdj, maskCanvasRef, clearMask,
}) {
  const adj = item.adjustments;

  return (
    <div className="enhance-manual">
      <div className="enhance-mask-tools">
        <button
          type="button"
          className={`admin-mini${maskMode ? ' is-active' : ''}`}
          onClick={() => setMaskMode(!maskMode)}
        >
          {maskMode ? 'Hide brush' : hasMask ? 'Edit mask' : 'Paint a mask'}
        </button>
        {maskMode && (
          <>
            <label>
              Brush
              <input type="range" min={10} max={200} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} />
            </label>
            <button type="button" className={`admin-mini${!erasing ? ' is-active' : ''}`} onClick={() => setErasing(false)}>Paint</button>
            <button type="button" className={`admin-mini${erasing ? ' is-active' : ''}`} onClick={() => setErasing(true)}>Erase</button>
            <button type="button" className="admin-mini admin-mini-danger" onClick={clearMask}>Clear mask</button>
          </>
        )}
        {(maskMode || hasMask) && (
          <span className="enhance-mask-hint">
            {maskMode
              ? "Brush over one part of the photo — the part you paint gets its own adjustments below, separate from everything else."
              : 'Mask painted — adjust the painted area and the rest separately below.'}
          </span>
        )}
      </div>

      {hasMask ? (
        <div className="enhance-dual-adjust">
          <RegionAdjust title="Painted area" adj={fgAdj} onChange={setFgAdj} />
          <RegionAdjust title="Everything else" adj={bgAdj} onChange={setBgAdj} withBlur />
        </div>
      ) : (
        <>
          <Slider label="Brightness" value={adj.brightness} onChange={(v) => onAdjust('brightness', v)} />
          <Slider label="Contrast" value={adj.contrast} onChange={(v) => onAdjust('contrast', v)} />
          <Slider label="Saturation" value={adj.saturation} onChange={(v) => onAdjust('saturation', v)} />
          <Slider label="Sharpen" value={adj.sharpen} onChange={(v) => onAdjust('sharpen', v)} min={0} max={100} />
        </>
      )}

      <div className="enhance-manual-row">
        <button type="button" className="admin-mini" onClick={onRotate}>⟲ Rotate 90°</button>
        <span className="enhance-hint">Sharpen (and a mask) won't show until you update the preview.</span>
      </div>
      <div className="enhance-manual-actions">
        <button type="button" className="admin-mini" onClick={onRefresh} disabled={item.refreshing}>
          {item.refreshing ? 'Updating…' : 'Update preview'}
        </button>
        <button type="button" className="admin-mini" onClick={onReset}>Reset adjustments</button>
        <button type="button" className="admin-primary" onClick={onSave} disabled={item.stage === 'saving'}>
          {item.stage === 'saving' ? 'Saving…' : 'Save to Images'}
        </button>
        <span className="enhance-manual-spacer" />
        <button type="button" className="admin-mini" onClick={onToggleManual}>Done adjusting</button>
        <button type="button" className="admin-mini admin-mini-danger" onClick={onDiscard}>Discard photo</button>
      </div>
    </div>
  );
}

function EnhanceRow({ item, onSave, onDiscard, onToggleManual, onAdjust, onRotate, onReset, onRefresh, onRename, onDelete, onZoom }) {
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [busy, setBusy] = useState(false);

  // Mask/region-editing state — only meaningful in the 'reviewing' stage,
  // but hooks have to be called unconditionally regardless of which stage
  // this render actually is.
  const [maskMode, setMaskMode] = useState(false);
  const [hasMask, setHasMask] = useState(false);
  const [brushSize, setBrushSize] = useState(60);
  const [erasing, setErasing] = useState(false);
  const [fgAdj, setFgAdj] = useState({ ...NEUTRAL_REGION });
  const [bgAdj, setBgAdj] = useState({ ...NEUTRAL_BG_REGION });
  const maskCanvasRef = useRef(null);

  function clearMask() {
    maskCanvasRef.current?.clear();
    setHasMask(false);
    setFgAdj({ ...NEUTRAL_REGION });
    setBgAdj({ ...NEUTRAL_BG_REGION });
  }

  // Builds what onRefresh/onSave need: null (plain single-adjustment path)
  // or { maskDataUrl, fg, bg } once something's actually been painted.
  function currentMaskPayload() {
    if (!hasMask || !maskCanvasRef.current?.hasPaint()) return null;
    return { maskDataUrl: maskCanvasRef.current.toDataURL(), fg: fgAdj, bg: bgAdj };
  }

  if (item.stage === 'correcting') {
    return (
      <div className="enhance-row">
        <div className="enhance-compare">
          <figure>
            <img className="is-zoomable" src={item.beforeUrl} alt="" onClick={() => onZoom(item.beforeUrl)} />
            <figcaption>{item.sourceName}</figcaption>
          </figure>
        </div>
        <div className="enhance-meta"><span className="enhance-size">{item.phase === 'uploading' ? 'Uploading…' : 'Correcting…'}</span></div>
      </div>
    );
  }

  if (item.stage === 'error') {
    return (
      <div className="enhance-row">
        <div className="enhance-compare">
          <figure>
            <img className="is-zoomable" src={item.beforeUrl} alt="" onClick={() => onZoom(item.beforeUrl)} />
            <figcaption>{item.sourceName}</figcaption>
          </figure>
        </div>
        <div className="enhance-meta">
          <p className="admin-json-error" style={{ margin: 0 }}>{item.error}</p>
          <div className="admin-media-actions">
            <button type="button" className="admin-mini admin-mini-danger" onClick={() => onDiscard(item)}>Dismiss</button>
          </div>
        </div>
      </div>
    );
  }

  if (item.stage === 'saved') {
    async function commitRename() {
      setRenaming(false);
      const typed = renameValue.trim();
      if (!typed || typed === baseName(item.name)) return;
      setBusy(true);
      await onRename(item, typed);
      setBusy(false);
    }

    return (
      <div className="enhance-row">
        <div className="enhance-compare">
          <figure>
            <img className="is-zoomable" src={item.beforeUrl} alt="" onClick={() => onZoom(item.beforeUrl)} />
            <figcaption>Before</figcaption>
          </figure>
          <figure>
            <img className="is-zoomable" src={item.url} alt="" onClick={() => onZoom(item.url)} />
            <figcaption>Saved</figcaption>
          </figure>
        </div>
        <div className="enhance-meta">
          {renaming ? (
            <input
              className="admin-media-rename"
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setRenaming(false); }}
            />
          ) : (
            <button type="button" className="admin-media-name" onClick={() => { setRenameValue(baseName(item.name)); setRenaming(true); }}>
              {item.name}
            </button>
          )}
          <span className="enhance-size">{formatBytes(item.bytes)} · saved to Images</span>
          <div className="admin-media-actions">
            <a className="admin-mini" href="/admin/images" target="_blank" rel="noreferrer">Open Images</a>
            <button type="button" className="admin-mini admin-mini-danger" disabled={busy} onClick={() => onDelete(item)}>Delete</button>
          </div>
        </div>
      </div>
    );
  }

  // stage === 'reviewing': the auto-corrected result, not saved anywhere yet.
  // Once painting has started, keep the <canvas> element mounted for the
  // rest of the session — unmounting it (e.g. by switching back to a plain
  // <img> when the brush toolbar is hidden) would throw away the painted
  // pixels along with the DOM node. "Hide brush" only hides the toolbar.
  const showCanvas = item.manualOpen && (maskMode || hasMask);

  return (
    <div className={`enhance-row${item.manualOpen ? ' enhance-row--editing' : ''}`}>
      <div className="enhance-compare">
        <figure>
          <img className="is-zoomable" src={item.beforeUrl} alt="" onClick={() => onZoom(item.beforeUrl)} />
          <figcaption>Before</figcaption>
        </figure>
        <figure>
          {showCanvas ? (
            <MaskCanvas ref={maskCanvasRef} imageUrl={item.previewUrl} brushSize={brushSize} erasing={erasing} paintable={maskMode} />
          ) : (
            <img
              className="is-zoomable"
              src={item.previewUrl}
              alt=""
              style={hasMask ? undefined : liveStyle(item.adjustments)}
              onClick={() => onZoom(item.previewUrl, hasMask ? undefined : liveStyle(item.adjustments))}
            />
          )}
          <figcaption>
            {item.manualOpen
              ? maskMode
                ? 'Paint over the part you mean'
                : hasMask
                  ? 'Masked — adjust each part below'
                  : 'After (your adjustments)'
              : 'After — auto-corrected'}
          </figcaption>
        </figure>
      </div>
      <div className="enhance-meta">
        <span className="enhance-size">{formatBytes(item.previewBytes)} · not saved yet</span>
        {item.error && <p className="admin-json-error" style={{ margin: 0 }}>{item.error}</p>}
        {item.manualOpen ? (
          <ManualPanel
            item={item}
            onAdjust={(key, v) => onAdjust(item, key, v)}
            onRotate={() => onRotate(item)}
            onReset={() => { onReset(item); clearMask(); }}
            onRefresh={async () => onRefresh(item, await currentMaskPayload())}
            onSave={async () => onSave(item, await currentMaskPayload())}
            onToggleManual={() => onToggleManual(item)}
            onDiscard={() => onDiscard(item)}
            maskMode={maskMode}
            setMaskMode={(v) => {
              // Leaving the canvas visible commits nothing extra — the paint
              // is already on the canvas element, which stays mounted (it's
              // just hidden behind the plain <img> again).
              if (!v && maskCanvasRef.current?.hasPaint()) setHasMask(true);
              setMaskMode(v);
            }}
            hasMask={hasMask}
            setHasMask={setHasMask}
            brushSize={brushSize}
            setBrushSize={setBrushSize}
            erasing={erasing}
            setErasing={setErasing}
            fgAdj={fgAdj}
            setFgAdj={setFgAdj}
            bgAdj={bgAdj}
            setBgAdj={setBgAdj}
            maskCanvasRef={maskCanvasRef}
            clearMask={clearMask}
          />
        ) : (
          <div className="admin-media-actions">
            <button type="button" className="admin-primary" onClick={() => onSave(item, null)} disabled={item.stage === 'saving'}>
              {item.stage === 'saving' ? 'Saving…' : 'Send to Images'}
            </button>
            <button type="button" className="admin-mini" onClick={() => onToggleManual(item)}>Edit manually</button>
            <button type="button" className="admin-mini admin-mini-danger" onClick={() => onDiscard(item)}>Discard</button>
          </div>
        )}
      </div>
    </div>
  );
}

// Builds the JSON body (shared fields plus either the flat single-adjustment
// set or a mask + separate foreground/background sets, depending on whether
// a mask was painted). The original photo itself isn't in here — it already
// lives in the enhance-tmp bucket by the time this is called; see
// uploadOriginal() and /api/admin/enhance/upload-url.
function buildRequestBody(item, maskPayload, save) {
  const body = {
    tmpPath: item.tmpPath,
    fileName: item.sourceName,
    save,
    auto: true,
    rotate: item.adjustments.rotate,
  };

  if (maskPayload) {
    body.mask = maskPayload.maskDataUrl;
    for (const [k, v] of Object.entries(maskPayload.fg)) body[`fg${k[0].toUpperCase()}${k.slice(1)}`] = v;
    for (const [k, v] of Object.entries(maskPayload.bg)) body[`bg${k[0].toUpperCase()}${k.slice(1)}`] = v;
  } else {
    body.brightness = item.adjustments.brightness;
    body.contrast = item.adjustments.contrast;
    body.saturation = item.adjustments.saturation;
    body.sharpen = item.adjustments.sharpen;
  }
  return body;
}

// Uploads the original file straight to Supabase Storage (bypassing our own
// server entirely for the big payload — see upload-url/route.js for why) and
// returns the path to reference in every later /api/admin/enhance call for
// this item. Only needs to happen once per item; the raw bytes don't change
// between a preview, a re-preview after adjusting sliders, and the final save.
async function uploadOriginal(file) {
  const res = await fetch('/api/admin/enhance/upload-url', { method: 'POST' });
  const { path, token, error } = await res.json().catch(() => ({}));
  if (!res.ok || !path) throw new Error(error || 'Could not start the upload.');

  const supabase = createClient();
  const { error: uploadError } = await supabase.storage
    .from('enhance-tmp')
    .uploadToSignedUrl(path, token, file);
  if (uploadError) throw new Error(uploadError.message || 'Upload failed.');

  return path;
}

export default function EnhanceView() {
  const [items, setItems] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [zoomed, setZoomed] = useState(null); // { src, style } | null
  const fileInput = useRef(null);

  function zoom(src, style) {
    setZoomed({ src, style });
  }

  // Paste an image straight from the clipboard (a screenshot, or something
  // copied from another app) — one more way in besides drag-drop and the
  // file picker.
  useEffect(() => {
    function onPaste(e) {
      const files = Array.from(e.clipboardData?.items || [])
        .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
        .map((item) => item.getAsFile())
        .filter(Boolean);
      if (files.length > 0) processFiles(files);
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  function patchItem(id, patch) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function processFiles(fileList) {
    const files = Array.from(fileList || []);
    files.forEach(async (file) => {
      const id = uid();
      const beforeUrl = URL.createObjectURL(file);
      const item = {
        id, file, beforeUrl, sourceName: file.name, stage: 'correcting', phase: 'uploading',
        adjustments: { ...NEUTRAL }, manualOpen: false, error: '',
      };
      setItems((prev) => [item, ...prev]);

      try {
        const tmpPath = await uploadOriginal(file);
        const uploaded = { ...item, tmpPath };
        patchItem(id, { tmpPath, phase: 'correcting' });
        runCorrection(uploaded, null);
      } catch (err) {
        patchItem(id, { stage: 'error', error: err.message });
      }
    });
  }

  async function runCorrection(item, maskPayload) {
    try {
      const res = await fetch('/api/admin/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRequestBody(item, maskPayload, false)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not process that image.');
      patchItem(item.id, { stage: 'reviewing', previewUrl: data.preview, previewBytes: data.bytes, refreshing: false, error: '' });
    } catch (err) {
      patchItem(item.id, { stage: item.stage === 'reviewing' ? 'reviewing' : 'error', refreshing: false, error: err.message });
    }
  }

  function refreshPreview(item, maskPayload) {
    patchItem(item.id, { refreshing: true });
    runCorrection(item, maskPayload);
  }

  async function saveToImages(item, maskPayload) {
    patchItem(item.id, { stage: 'saving' });
    try {
      const res = await fetch('/api/admin/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRequestBody(item, maskPayload, true)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save that image.');
      patchItem(item.id, { stage: 'saved', name: data.name, url: data.url, bytes: data.bytes });
    } catch (err) {
      patchItem(item.id, { stage: 'reviewing', error: err.message });
    }
  }

  function discardItem(item) {
    URL.revokeObjectURL(item.beforeUrl);
    if (item.tmpPath) {
      fetch('/api/admin/enhance/upload-url', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: item.tmpPath }),
      }).catch(() => {});
    }
    setItems((prev) => prev.filter((it) => it.id !== item.id));
  }

  function toggleManual(item) {
    patchItem(item.id, { manualOpen: !item.manualOpen });
  }

  function adjust(item, key, value) {
    patchItem(item.id, { adjustments: { ...item.adjustments, [key]: value } });
  }

  function rotate(item) {
    const next = { ...item.adjustments, rotate: (item.adjustments.rotate + 90) % 360 };
    patchItem(item.id, { adjustments: next });
  }

  function resetAdjustments(item) {
    patchItem(item.id, { adjustments: { ...NEUTRAL } });
  }

  async function onRename(item, typed) {
    const res = await fetch('/api/admin/media', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: item.name, to: typed }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return;
    patchItem(item.id, { name: data.name, url: data.url || item.url });
  }

  async function onDelete(item) {
    if (!confirm(`Delete "${item.name}" from the image library?`)) return;
    await fetch('/api/admin/media', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: item.name }),
    });
    setItems((prev) => prev.filter((it) => it.id !== item.id));
  }

  const working = items.some((it) => it.stage === 'correcting');

  return (
    <div className="admin-page admin-page-wide">
      <h1>Enhance</h1>
      <p className="admin-lead">
        Drop in any photo and it's automatically color- and contrast-corrected. Nothing is saved
        until you choose to — review the result, fine-tune it by hand if you want (including
        painting a mask to edit part of the photo separately), then send it to Images or discard
        it. The original file is never changed.
      </p>

      <div
        className={`admin-drop admin-drop-lg${dragOver ? ' is-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); processFiles(e.dataTransfer.files); }}
        onClick={() => fileInput.current?.click()}
      >
        <input
          ref={fileInput}
          type="file"
          // The MIME wildcard covers anything the OS/browser already calls an
          // image; the extensions are appended so formats with inconsistent
          // MIME reporting (older cameras, some phones) still show up in the
          // picker. What actually happens with each format is decided
          // server-side, not by this list — see /api/admin/enhance.
          accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif,.tif,.tiff,.heic,.heif,.bmp"
          multiple
          hidden
          onChange={(e) => processFiles(e.target.files)}
        />
        <p>{working ? 'Correcting…' : 'Drop photos here, or click to choose — or paste with ⌘/Ctrl+V'}</p>
        <span>JPG, PNG, WebP, GIF, AVIF, TIFF or iPhone (HEIC) photos · up to 60 MB each</span>
      </div>

      {items.length === 0 ? (
        <p className="admin-empty">Nothing corrected yet this session.</p>
      ) : (
        <div className="enhance-list">
          {items.map((item) => (
            <EnhanceRow
              key={item.id}
              item={item}
              onSave={saveToImages}
              onDiscard={discardItem}
              onToggleManual={toggleManual}
              onAdjust={adjust}
              onRotate={rotate}
              onReset={resetAdjustments}
              onRefresh={refreshPreview}
              onRename={onRename}
              onDelete={onDelete}
              onZoom={zoom}
            />
          ))}
        </div>
      )}

      {zoomed && (
        <Lightbox src={zoomed.src} style={zoomed.style} onClose={() => setZoomed(null)} />
      )}
    </div>
  );
}
