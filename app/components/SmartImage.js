import Image from 'next/image';
import { isMediaUrl, knownDimsFor } from '../../lib/media';

// The one way to render a photo on the public site. Photos in the Supabase media
// bucket and local /public files go through next/image (resized, AVIF/WebP,
// cached); any other absolute URL (an admin can paste one into a content field)
// falls back to a plain <img>, since next/image would error on a host that is not
// in next.config.js. Safe in server and client components: no hooks or state, so
// no 'use client'. Event props (onLoad...) only work if the caller is a client component.
//
// Placeholder: instead of a blur data URL, the <img> itself gets a sage
// background-color, which shows in the reserved box until the pixels arrive.
// That is why width/height (or `fill` in a sized wrapper) matter. Pass bg={null}
// for images with transparency; local /public images never get a background.

const PLACEHOLDER_BG = '#edf0e3';
const FALLBACK_DIMS = { width: 1600, height: 1200 };

function isLocalPath(src) {
  return src.startsWith('/') && !src.startsWith('//');
}

export default function SmartImage({
  src,
  alt = '',
  width,
  height,
  fill = false,
  sizes,
  priority = false,
  quality,
  className,
  style,
  bg = PLACEHOLDER_BG,
  ...rest
}) {
  if (typeof src !== 'string' || src === '') return null;

  const local = isLocalPath(src);
  const optimized = local || isMediaUrl(src);
  const tint = bg && !local ? { backgroundColor: bg } : null;

  // Without width/height next/image throws, so never leave them empty: fill in
  // the missing side(s) from the known size of a bucket photo (keeping its
  // aspect ratio), else a neutral 4:3 so the page still renders.
  let w = width;
  let h = height;
  if (!fill && (!w || !h)) {
    const ratio = knownDimsFor(src) || FALLBACK_DIMS;
    if (!w && !h) {
      w = ratio.width;
      h = ratio.height;
    } else if (!h) {
      h = Math.round((w * ratio.height) / ratio.width);
    } else {
      w = Math.round((h * ratio.width) / ratio.height);
    }
  }

  const imgStyle = fill
    ? { objectFit: 'cover', ...tint, ...style }
    : { maxWidth: '100%', height: 'auto', ...tint, ...style };

  if (optimized) {
    // Without `sizes`, next/image builds a 1x/2x srcset from `width`, and for a
    // 5712px photo that means every viewer downloads the 2560px variant. A
    // 100vw default keeps that from happening when a caller forgets; it is a
    // safety net, not a substitute for a real sizes string.
    const effectiveSizes = sizes ?? (fill || w > 1280 ? '100vw' : undefined);
    return (
      <Image
        src={src}
        alt={alt}
        {...(fill ? { fill: true } : { width: w, height: h })}
        sizes={effectiveSizes}
        quality={quality}
        // Next 16 renamed `priority` to `preload`; the explicit fetchPriority
        // makes the browser start the LCP image first.
        {...(priority ? { preload: true, fetchPriority: 'high' } : {})}
        className={className}
        style={imgStyle}
        {...rest}
      />
    );
  }

  const plainStyle = fill
    ? { position: 'absolute', inset: 0, width: '100%', height: '100%', ...imgStyle }
    : imgStyle;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      {...(fill ? {} : { width: w, height: h })}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      className={className}
      style={plainStyle}
      {...rest}
    />
  );
}
