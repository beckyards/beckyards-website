'use client';

import { useEffect } from 'react';

// Full-size image viewer. Click any thumbnail to open it, click the backdrop
// (or press Escape, or hit the ✕) to close. Shared by Images and Enhance.
export default function Lightbox({ src, alt, style, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!src) return null;

  return (
    <div className="admin-lightbox-backdrop" onClick={onClose}>
      <button type="button" className="admin-lightbox-close" onClick={onClose} aria-label="Close">✕</button>
      <img
        className="admin-lightbox-img"
        src={src}
        alt={alt || ''}
        style={style}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
