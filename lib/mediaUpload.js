// Shared naming + upload logic for the `media` bucket, used by the uploader
// at app/api/admin/media/route.js.

export const MEDIA_BUCKET = 'media';
export const MEDIA_MAX_BYTES = 25 * 1024 * 1024; // 25 MB per file
export const MEDIA_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

// Filenames a camera/phone/screenshot tool generates that carry no real
// information ("IMG_1234", "DSC00021", "PXL_20260101_120000", a bare hex/UUID
// chunk, "image", "photo", "screenshot ..."). Uploads with a name like this
// fall back to a plain sequential "photo" name instead of a meaningless slug,
// since the goal is a name a person can actually type back to reference the
// exact file later.
const GENERIC_NAME_RE =
  /^(img|image|dsc|dscn|pxl|photo|pic|picture|screenshot|screen[- ]?shot|shoot|untitled|copy of|[0-9a-f]{6,}|[0-9]+)[-_ .]?[0-9a-f]*$/i;

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Turns an original upload filename (or a caller-supplied base like
// "sunset-beach") into a clean, storage-safe base name with no extension.
export function baseNameFrom(filename) {
  const dot = filename.lastIndexOf('.');
  const stem = dot > -1 ? filename.slice(0, dot) : filename;
  const slug = slugify(stem).slice(0, 60);
  if (!slug || GENERIC_NAME_RE.test(slug)) return 'photo';
  return slug;
}

export function extFrom(filename, fallback = 'jpg') {
  const dot = filename.lastIndexOf('.');
  const ext = dot > -1 ? filename.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  return ext || fallback;
}

// iPhones save photos as HEIC by default. Most browsers report an empty
// file.type for it (rather than "image/heic"), so check the extension too --
// this is how uploads from a phone were silently getting rejected as "not an
// allowed image type" with no obvious explanation.
export function isHeicFile(filename, mimeType) {
  const type = (mimeType || '').toLowerCase();
  if (type === 'image/heic' || type === 'image/heif') return true;
  return /\.(heic|heif)$/i.test(filename || '');
}

// A name is safe to use as a flat object key in the bucket: no path
// separators, no leading dot, reasonable length, matches a plausible
// "name.ext" shape.
export function isSafeObjectName(name) {
  return (
    typeof name === 'string' &&
    name.length > 0 &&
    name.length <= 140 &&
    !name.includes('/') &&
    !name.startsWith('.') &&
    /^[a-z0-9][a-z0-9._-]*\.[a-z0-9]+$/i.test(name)
  );
}

// Uploads `buffer` into the media bucket under a name derived from `base`
// (no extension) + `ext`, retrying with "-2", "-3", ... on a collision so
// uploads never silently overwrite an existing photo. Returns the final
// { name, url }.
export async function uploadToMedia(supabase, buffer, base, ext, contentType) {
  const clean = slugify(base).slice(0, 60) || 'photo';
  for (let n = 1; n <= 50; n += 1) {
    const name = n === 1 ? `${clean}.${ext}` : `${clean}-${n}.${ext}`;
    const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(name, buffer, {
      contentType,
      upsert: false,
    });
    if (!error) {
      return { name, url: supabase.storage.from(MEDIA_BUCKET).getPublicUrl(name).data.publicUrl };
    }
    // Supabase Storage returns a 409-ish "already exists" error for a name
    // collision; anything else is a real failure, so stop retrying.
    const msg = (error.message || '').toLowerCase();
    if (!msg.includes('exist')) throw error;
  }
  throw new Error('Could not find a free filename after 50 attempts.');
}
