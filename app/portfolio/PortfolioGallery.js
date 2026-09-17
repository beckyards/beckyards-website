'use client';

import { useEffect, useState } from 'react';

export default function PortfolioGallery({ photos }) {
  const [index, setIndex] = useState(null);

  useEffect(() => {
    if (index === null) return;
    function onKey(e) {
      if (e.key === 'Escape') setIndex(null);
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % photos.length);
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + photos.length) % photos.length);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, photos.length]);

  return (
    <>
      <div className="photo-grid">
        {photos.map((photo, i) => (
          <div className="photo-grid-item" key={photo.src || i} onClick={() => setIndex(i)}>
            <img src={photo.src} alt={photo.alt || ''} loading="lazy" />
          </div>
        ))}
      </div>

      {index !== null && (
        <div className="portfolio-lightbox" onClick={() => setIndex(null)}>
          <button
            type="button"
            className="portfolio-lightbox-close"
            onClick={(e) => {
              e.stopPropagation();
              setIndex(null);
            }}
            aria-label="Close"
          >
            ×
          </button>
          {photos.length > 1 && (
            <>
              <button
                type="button"
                className="portfolio-lightbox-nav prev"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex((i) => (i - 1 + photos.length) % photos.length);
                }}
                aria-label="Previous photo"
              >
                ‹
              </button>
              <button
                type="button"
                className="portfolio-lightbox-nav next"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex((i) => (i + 1) % photos.length);
                }}
                aria-label="Next photo"
              >
                ›
              </button>
            </>
          )}
          <img
            src={photos[index].src}
            alt={photos[index].alt || ''}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
