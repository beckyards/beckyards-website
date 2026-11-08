import { isMediaUrl, knownDimsFor } from './media';

// Social-preview image: a 5-10 MB original is useless to a crawler, so point at
// the optimizer's 1200px variant (width and quality are on its allowlist).
// Height comes from the known photo size so portrait photos are not mis-declared.
export function ogImageFor(src) {
  if (typeof src !== 'string' || !src) return [];
  if (!isMediaUrl(src)) return [{ url: src }];
  const dims = knownDimsFor(src);
  return [
    {
      url: `/_next/image?url=${encodeURIComponent(src)}&w=1200&q=75`,
      width: 1200,
      ...(dims ? { height: Math.round((1200 * dims.height) / dims.width) } : {}),
    },
  ];
}

// Open Graph + Twitter data for a page. Setting `openGraph` on a page replaces the
// root layout's object, so siteName/type are repeated here. The title template only
// applies to <title>, so the brand suffix is added for the share card.
export function socialMeta({ title: pageTitle, description, path, image }) {
  const title = `${pageTitle} — BeckYards`;
  const images = ogImageFor(image);
  return {
    openGraph: {
      title,
      description,
      url: path,
      siteName: 'BeckYards Landscaping & Design',
      type: 'website',
      locale: 'en_US',
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: images.map((i) => i.url),
    },
  };
}
