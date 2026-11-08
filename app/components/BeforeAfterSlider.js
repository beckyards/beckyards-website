'use client';

import { useRef, useState } from 'react';
import HomeIcon from './HomeIcons';

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

// Drag-to-compare slider. The two photos arrive as ready-made nodes from the
// server page (so they use SmartImage with real sizes); this component only owns
// the interaction. Three input paths, one `pos` state (% of the frame showing the
// "before" photo):
//   - pointer (mouse / touch / pen) anywhere on the frame
//   - a real <input type="range"> for keyboard + screen readers
// The frame's aspect ratio comes from the photo's real size, so nothing shifts
// while the images load.
export default function BeforeAfterSlider({
  beforeImage,
  afterImage,
  beforeLabel = 'Before',
  afterLabel = 'After',
  width,
  height,
  hint,
  label = 'Compare the before and after photos',
}) {
  const [pos, setPos] = useState(50);
  const [dragging, setDragging] = useState(false);
  const frameRef = useRef(null);
  const drag = useRef({ active: false, startX: 0, engaged: false });

  function setFromX(clientX) {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return;
    setPos(clamp(((clientX - rect.left) / rect.width) * 100, 0, 100));
  }

  function onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag.current = {
      active: true,
      startX: e.clientX,
      // A finger that lands to start scrolling the page must not move the
      // handle, so touch only engages after a real horizontal drag.
      engaged: e.pointerType === 'mouse',
    };
    frameRef.current?.setPointerCapture(e.pointerId);
    setDragging(true);
    if (drag.current.engaged) setFromX(e.clientX);
  }

  function onPointerMove(e) {
    const d = drag.current;
    if (!d.active) return;
    if (!d.engaged && Math.abs(e.clientX - d.startX) < 6) return;
    d.engaged = true;
    setFromX(e.clientX);
  }

  function endDrag(e) {
    drag.current.active = false;
    setDragging(false);
    if (frameRef.current?.hasPointerCapture?.(e.pointerId)) {
      frameRef.current.releasePointerCapture(e.pointerId);
    }
  }

  function onKeyDown(e) {
    const steps = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5, PageDown: -15, PageUp: 15 };
    if (e.key in steps) {
      e.preventDefault();
      setPos((p) => clamp(Math.round(p) + steps[e.key], 0, 100));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setPos(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setPos(100);
    }
  }

  const shown = Math.round(pos);
  const ratio = width && height ? width / height : 3 / 4;

  return (
    <div className="home-ba">
      <div
        ref={frameRef}
        className={`home-ba__frame${dragging ? ' is-dragging' : ''}`}
        style={{ '--pos': `${pos}%`, '--ar': ratio, aspectRatio: ratio }}
        role="group"
        aria-label={label}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="home-ba__layer">{afterImage}</div>
        <div className="home-ba__layer home-ba__before">{beforeImage}</div>

        <span className="badge badge--dark home-ba__tag home-ba__tag--before" data-hidden={pos < 14} aria-hidden="true">
          {beforeLabel}
        </span>
        <span className="badge badge--dark home-ba__tag home-ba__tag--after" data-hidden={pos > 86} aria-hidden="true">
          {afterLabel}
        </span>

        {/* Keyboard / assistive-tech control. Visually hidden; the handle below
            shows its focus ring (see the sibling selector in home.css). */}
        <input
          className="home-ba__input"
          type="range"
          min={0}
          max={100}
          step={1}
          value={shown}
          onChange={(e) => setPos(Number(e.target.value))}
          onKeyDown={onKeyDown}
          aria-label={`${beforeLabel} and ${afterLabel} comparison`}
          aria-valuetext={`${shown}% ${beforeLabel.toLowerCase()} photo, ${100 - shown}% ${afterLabel.toLowerCase()} photo`}
        />
        <div className="home-ba__handle" aria-hidden="true">
          <span className="home-ba__knob">
            <HomeIcon name="arrows-h" />
          </span>
        </div>
      </div>
      {hint && <p className="home-ba__hint">{hint}</p>}
    </div>
  );
}
