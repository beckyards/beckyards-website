import 'server-only';
import sharp from 'sharp';
import { knownDimsFor } from './media';

// Server-side image measuring, so pages can hand <SmartImage> a real width/height
// (the aspect ratio that prevents layout shift) without anyone typing numbers in.
// Every function here resolves — a missing, slow or garbage image yields the
// fallback size instead of an error, because the public site must keep rendering.

export const FALLBACK_IMAGE_SIZE = { width: 1600, height: 1200 };

const REVALIDATE_SECONDS = 60 * 60 * 24 * 30;
// Phone photos keep their EXIF block and dimensions near the start of the file;
// 256 KB covers almost all of them, 1 MB is a single retry for the odd huge header.
const RANGE_STEPS = [256 * 1024, 1024 * 1024];
const TIMEOUT_MS = 8000;

// Next's fetch cache stores only 200 responses, never the 206 a Range request
// gets back, so `next.revalidate` alone would re-download on every render. This
// per-process memo is what actually prevents that (and it also covers non-Next
// callers). Failures are remembered briefly so a dead URL isn't retried per render.
const MEMO_MAX = 500;
const OK_TTL_MS = REVALIDATE_SECONDS * 1000;
const FAIL_TTL_MS = 5 * 60 * 1000;
const memo = new Map(); // src -> { at, ttl, promise }

function fallback() {
  return { ...FALLBACK_IMAGE_SIZE };
}

async function readUpTo(res, limit) {
  // A server that ignores Range sends the whole file; stop reading at `limit`.
  const reader = res.body?.getReader();
  if (!reader) return Buffer.from(await res.arrayBuffer()).subarray(0, limit);
  const chunks = [];
  let total = 0;
  while (total < limit) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  reader.cancel().catch(() => {});
  return Buffer.concat(chunks).subarray(0, limit);
}

async function metadataOf(buffer) {
  const meta = await sharp(buffer, { failOn: 'none' }).metadata();
  if (!meta.width || !meta.height) return null;
  // EXIF orientation 5-8 means the photo is displayed rotated 90 degrees, so the
  // stored width/height are swapped relative to what the viewer sees.
  const rotated = meta.orientation >= 5 && meta.orientation <= 8;
  return rotated
    ? { width: meta.height, height: meta.width }
    : { width: meta.width, height: meta.height };
}

async function measure(src) {
  for (const bytes of RANGE_STEPS) {
    let buffer;
    try {
      const res = await fetch(src, {
        headers: { Range: `bytes=0-${bytes - 1}` },
        next: { revalidate: REVALIDATE_SECONDS },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) return null;
      buffer = await readUpTo(res, bytes);
    } catch {
      return null;
    }
    try {
      const size = await metadataOf(buffer);
      if (size) return size;
    } catch {
      // Header not fully inside this slice (or not an image): retry with more
      // bytes only if this slice was full, otherwise there is nothing more to read.
      if (buffer.length < bytes) return null;
    }
  }
  return null;
}

function remember(src, promise, ttl) {
  if (memo.size >= MEMO_MAX) memo.delete(memo.keys().next().value);
  memo.set(src, { at: Date.now(), ttl, promise });
}

/**
 * Pixel size of an image as a viewer sees it (EXIF rotation applied).
 * Server-only. Never throws.
 *   - media-bucket photos in KNOWN_DIMS: instant, no network
 *   - any other http(s) URL: Range-fetches the first 256 KB and reads the header
 *   - anything else, or any failure: { width: 1600, height: 1200 }
 * Local /public paths are not measured (they are not fetchable from here); pass
 * explicit width/height for those.
 */
export async function getImageSize(src) {
  try {
    const known = knownDimsFor(src);
    if (known) return known;
    if (typeof src !== 'string' || !/^https?:\/\//i.test(src)) return fallback();

    const hit = memo.get(src);
    if (hit && Date.now() - hit.at < hit.ttl) return { ...(await hit.promise) };

    // Store the in-flight promise so concurrent callers share one request.
    const promise = measure(src).then((size) => {
      const entry = memo.get(src);
      if (entry?.promise === promise) entry.ttl = size ? OK_TTL_MS : FAIL_TTL_MS;
      return size || fallback();
    }).catch(() => fallback());
    remember(src, promise, FAIL_TTL_MS);
    return { ...(await promise) };
  } catch {
    return fallback();
  }
}

/**
 * Batch version: Map of url -> { width, height } with at most `concurrency`
 * measurements in flight. Every string in `urls` is a key (duplicates collapsed,
 * input order kept), so `sizes.get(url)` is always an object. Never throws.
 */
export async function getImageSizes(urls, concurrency = 6) {
  const unique = [...new Set(Array.isArray(urls) ? urls.filter((u) => typeof u === 'string') : [])];
  const sizes = new Map(unique.map((u) => [u, fallback()]));
  let next = 0;
  async function worker() {
    while (next < unique.length) {
      const url = unique[next++];
      sizes.set(url, await getImageSize(url));
    }
  }
  const workers = Math.max(1, Math.min(Math.floor(concurrency) || 1, unique.length));
  await Promise.all(Array.from({ length: workers }, worker));
  return sizes;
}
