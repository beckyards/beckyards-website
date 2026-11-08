'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import SmartImage from '../components/SmartImage';

// photos: [{ src, alt, caption, width, height }] — already cleaned and measured
// by page.js. `alt` is always non-empty; `caption` is only the owner-written text.

const TILE_SIZES = '(min-width: 1200px) 400px, (min-width: 900px) 34vw, (min-width: 640px) 50vw, 100vw';

function ratioOf(photo) {
  const r = photo.width / photo.height;
  return Number.isFinite(r) && r > 0 ? Math.round(r * 1000) / 1000 : 1.333;
}

function Icon({ children }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

export default function PortfolioGallery({ photos }) {
  const [index, setIndex] = useState(null);
  const tileRefs = useRef([]);
  const lightboxRef = useRef(null);
  const closeRef = useRef(null);
  const touchRef = useRef(null);
  const total = photos.length;
  const open = index !== null;

  const indexRef = useRef(null);
  indexRef.current = index;

  const close = useCallback(() => {
    const ended = indexRef.current;
    setIndex(null);
    // Hand focus back to the tile of the photo we ended on, once the page behind
    // is no longer inert.
    if (ended !== null) requestAnimationFrame(() => tileRefs.current[ended]?.focus());
  }, []);

  const step = useCallback(
    (delta) => setIndex((i) => (i === null ? i : (i + delta + total) % total)),
    [total]
  );

  // While open: lock page scroll, hide the page behind from keyboard and screen
  // readers, move focus in, and handle keys.
  useEffect(() => {
    if (!open) return undefined;

    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPadding = body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    const root = lightboxRef.current;
    const inerted = Array.from(body.children).filter((el) => el !== root && !el.inert);
    inerted.forEach((el) => {
      el.inert = true;
    });

    closeRef.current?.focus();

    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        step(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        step(-1);
      } else if (e.key === 'Tab' && root) {
        // Focus trap (the page behind is inert; this also covers the edges).
        const items = Array.from(root.querySelectorAll('button:not([disabled])'));
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (!root.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      inerted.forEach((el) => {
        el.inert = false;
      });
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPadding;
    };
  }, [open, close, step]);

  function onTouchStart(e) {
    if (e.touches.length !== 1) {
      touchRef.current = null;
      return;
    }
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  function onTouchEnd(e) {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start || total < 2) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
  }

  // Current photo plus its neighbours stay mounted (keyed by index) so stepping
  // forward or back never waits on a download.
  let slideIndexes = [];
  if (open) {
    slideIndexes = Array.from(new Set([(index - 1 + total) % total, index, (index + 1) % total]));
  }
  const current = open ? photos[index] : null;

  return (
    <>
      <div className="pf-grid">
        {photos.map((photo, i) => (
          <button
            key={`${photo.src}-${i}`}
            type="button"
            className="pf-tile"
            style={{ '--ar': ratioOf(photo) }}
            ref={(el) => {
              tileRefs.current[i] = el;
            }}
            onClick={() => setIndex(i)}
            aria-haspopup="dialog"
          >
            <SmartImage
              src={photo.src}
              alt={photo.alt}
              fill
              sizes={TILE_SIZES}
              quality={60}
            />
            <span className="pf-tile-zoom" aria-hidden="true">
              <Icon>
                <circle cx="11" cy="11" r="6.5" />
                <path d="M20 20l-4.2-4.2M11 8.5v5M8.5 11h5" />
              </Icon>
            </span>
          </button>
        ))}
      </div>

      {open &&
        createPortal(
          <div
            className="pf-lb on-dark"
            ref={lightboxRef}
            role="dialog"
            aria-modal="true"
            aria-label="BeckYards project photo viewer"
            onClick={(e) => {
              if (e.target === e.currentTarget) close();
            }}
          >
            <div
              className="pf-lb-stage"
              onClick={(e) => {
                if (e.target === e.currentTarget) close();
              }}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {slideIndexes.map((i) => {
                const photo = photos[i];
                const ar = ratioOf(photo);
                const isCurrent = i === index;
                return (
                  <figure
                    key={`${photo.src}-${i}`}
                    className={`pf-lb-slide${isCurrent ? ' is-current' : ''}`}
                    style={{ '--ar': ar }}
                    aria-hidden={isCurrent ? undefined : true}
                  >
                    <SmartImage
                      src={photo.src}
                      alt={isCurrent ? photo.alt : ''}
                      fill
                      // Sized to what the slide will really be on screen: capped
                      // by viewport width or by the height left for the stage.
                      sizes={`min(100vw, calc(${ar} * (100vh - 9rem)))`}
                      quality={85}
                      loading="eager"
                      bg="#283219"
                      style={{ objectFit: 'contain' }}
                    />
                  </figure>
                );
              })}
            </div>

            <button
              type="button"
              className="pf-lb-btn pf-lb-close"
              ref={closeRef}
              onClick={close}
              aria-label="Close photo viewer"
            >
              <Icon>
                <path d="M6 6l12 12M18 6L6 18" />
              </Icon>
            </button>

            {total > 1 && (
              <>
                <button
                  type="button"
                  className="pf-lb-btn pf-lb-prev"
                  onClick={() => step(-1)}
                  aria-label="Previous photo"
                >
                  <Icon>
                    <path d="M15 5l-7 7 7 7" />
                  </Icon>
                </button>
                <button
                  type="button"
                  className="pf-lb-btn pf-lb-next"
                  onClick={() => step(1)}
                  aria-label="Next photo"
                >
                  <Icon>
                    <path d="M9 5l7 7-7 7" />
                  </Icon>
                </button>
              </>
            )}

            <div className="pf-lb-bar" aria-live="polite" onClick={(e) => e.target === e.currentTarget && close()}>
              <p className="pf-lb-count">
                {index + 1} / {total}
              </p>
              {current.caption && <p className="pf-lb-caption">{current.caption}</p>}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
