// Public URL of a file in the Supabase `media` bucket (the same files the admin
// Images page lists), so defaults in code can point at uploaded photos.
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');

export const MEDIA_BASE = `${SUPABASE_URL}/storage/v1/object/public/media/`;

export function mediaUrl(fileName) {
  return `${MEDIA_BASE}${fileName}`;
}

// True for a URL that lives in this project's media bucket (safe to run through
// next/image, whose remotePatterns are limited to this host).
export function isMediaUrl(src) {
  return typeof src === 'string' && SUPABASE_URL !== '' && src.startsWith(MEDIA_BASE);
}

// Pixel size (after EXIF rotation) of the photos already in the media bucket, so
// pages can render them with the right aspect ratio without downloading
// 6-10 MB originals just to measure them. Unknown files fall back to a header
// range-fetch in lib/imageSize.js.
export const KNOWN_DIMS = {
  'photo.jpeg': [1179, 1560],
  'photo-2.jpeg': [1980, 3520],
  'photo-3.jpeg': [5712, 4284],
  'photo-4.jpeg': [5712, 4284],
  'photo-5.jpeg': [5712, 4284],
  'photo-6.jpeg': [1980, 3520],
  'photo-7.jpeg': [4032, 3024],
  'photo-8.jpeg': [5712, 4284],
  'photo-9.jpeg': [5712, 4284],
  'photo-10.jpeg': [4284, 5712],
  'photo-11.jpeg': [4284, 5712],
  'photo-12.jpeg': [4284, 5712],
  'photo-13.jpeg': [5712, 4284],
  'photo-14.jpeg': [4284, 5712],
  'photo-15.jpeg': [4284, 5712],
  'photo-16.jpeg': [4284, 5712],
  'photo-17.jpeg': [5712, 4284],
  'photo-18.jpeg': [5712, 4284],
  'photo-19.jpeg': [5712, 4284],
  'photo-20.jpeg': [5712, 4284],
  'photo-21.jpeg': [5712, 4284],
  'photo-22.jpeg': [5712, 4284],
  'photo-23.jpeg': [4284, 5712],
  'photo-24.jpeg': [5712, 4284],
  'photo-25.jpeg': [5712, 4284],
  'photo-26.jpeg': [5712, 4284],
  'photo-27.jpeg': [5712, 4284],
  'photo-28.jpeg': [5712, 4284],
  'photo-29.jpeg': [5712, 4284],
  'photo-30.jpeg': [5712, 4284],
  'photo-31.jpeg': [4284, 5712],
  'photo-32.jpeg': [4284, 5712],
  'photo-33.jpeg': [5712, 4284],
  'photo-34.jpeg': [5712, 4284],
  'photo-35.jpeg': [4284, 5712],
  'before-after-compare-2.jpg': [1206, 800],
};

// Only trusts the table for URLs in this project's bucket: an external URL that
// happens to end in "photo-3.jpeg" must not inherit that photo's size. Never
// throws (a malformed %-escape in an admin-pasted URL would otherwise).
export function knownDimsFor(src) {
  if (!isMediaUrl(src)) return null;
  let name;
  try {
    name = decodeURIComponent(src.split('?')[0].split('/').pop() || '');
  } catch {
    return null;
  }
  const dims = Object.hasOwn(KNOWN_DIMS, name) ? KNOWN_DIMS[name] : null;
  return dims ? { width: dims[0], height: dims[1] } : null;
}
