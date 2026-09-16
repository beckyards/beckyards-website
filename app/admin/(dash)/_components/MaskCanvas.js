'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

// Where the actual photo pixels sit inside an <img> rendered with
// object-fit: contain (which letterboxes rather than filling its box) — the
// brush canvas has to sit exactly on top of those pixels, in CSS-pixel
// coordinates, or strokes drift from what you're pointing at.
function contentBox(img) {
  const rect = img.getBoundingClientRect();
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const boxRatio = rect.width / rect.height;
  let width, height;
  if (imgRatio > boxRatio) {
    width = rect.width;
    height = rect.width / imgRatio;
  } else {
    height = rect.height;
    width = rect.height * imgRatio;
  }
  return {
    left: rect.left - img.parentElement.getBoundingClientRect().left + (rect.width - width) / 2,
    top: rect.top - img.parentElement.getBoundingClientRect().top + (rect.height - height) / 2,
    width,
    height,
  };
}

// A brush you paint with over the photo to mark "this is the part I mean" —
// used to apply different adjustments (or a blur) to the painted area vs.
// everything else. The canvas's internal resolution always matches the
// image's real pixel size, so the exported mask lines up 1:1 with what the
// server processes regardless of how small it's displayed on screen.
const MaskCanvas = forwardRef(function MaskCanvas({ imageUrl, brushSize, erasing, paintable = true }, ref) {
  const wrapRef = useRef(null);
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const painted = useRef(false);

  function layout() {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !img.naturalWidth) return;
    if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
    }
    const box = contentBox(img);
    Object.assign(canvas.style, {
      left: `${box.left}px`,
      top: `${box.top}px`,
      width: `${box.width}px`,
      height: `${box.height}px`,
    });
  }

  useEffect(() => {
    layout();
    window.addEventListener('resize', layout);
    return () => window.removeEventListener('resize', layout);
  }, [imageUrl]);

  useImperativeHandle(ref, () => ({
    hasPaint: () => painted.current,
    clear() {
      const canvas = canvasRef.current;
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      painted.current = false;
    },
    toDataURL() {
      return canvasRef.current.toDataURL('image/png');
    },
  }));

  function pos(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return {
      x: ((p.clientX - rect.left) / rect.width) * canvas.width,
      y: ((p.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function paintAt({ x, y }) {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const scale = canvas.width / canvas.getBoundingClientRect().width;
    ctx.globalCompositeOperation = erasing ? 'destination-out' : 'source-over';
    ctx.fillStyle = 'rgba(255,64,64,0.55)';
    ctx.beginPath();
    ctx.arc(x, y, (brushSize / 2) * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  function start(e) {
    e.preventDefault();
    drawing.current = true;
    paintAt(pos(e));
    painted.current = true;
  }
  function move(e) {
    if (!drawing.current) return;
    e.preventDefault();
    paintAt(pos(e));
  }
  function stop() {
    drawing.current = false;
  }

  return (
    <div className="mask-canvas-wrap" ref={wrapRef}>
      <img ref={imgRef} src={imageUrl} alt="" draggable={false} onLoad={layout} />
      <canvas
        ref={canvasRef}
        className={`mask-canvas-overlay${erasing ? ' is-erasing' : ' is-drawing'}${paintable ? '' : ' is-inert'}`}
        onMouseDown={paintable ? start : undefined}
        onMouseMove={paintable ? move : undefined}
        onMouseUp={paintable ? stop : undefined}
        onMouseLeave={paintable ? stop : undefined}
        onTouchStart={paintable ? start : undefined}
        onTouchMove={paintable ? move : undefined}
        onTouchEnd={paintable ? stop : undefined}
      />
    </div>
  );
});

export default MaskCanvas;
