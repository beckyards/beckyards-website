// Only photos in this project's public Supabase `media` bucket go through the
// next/image optimizer (see app/components/SmartImage.js, which sends anything
// else to a plain <img>). Derived from the env var so a different Supabase
// project never needs a code change; with no env var the list is simply empty.
function mediaRemotePatterns() {
  try {
    const { protocol, hostname, port } = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
    return [
      {
        protocol: protocol.replace(':', ''),
        hostname,
        port,
        pathname: '/storage/v1/object/public/media/**',
      },
    ];
  } catch {
    return [];
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets `NEXT_DIST_DIR=.next-check npm run build` verify a build without
  // clobbering the `.next` folder a running `next dev` is using (sharing it
  // left the dev server serving stale/odd state until restarted).
  distDir: process.env.NEXT_DIST_DIR || '.next',

  // heic-convert (used for iPhone photo uploads) depends on libheif-js, which
  // loads its libheif.wasm binary via a runtime __dirname-relative path —
  // Next.js's automatic serverless file tracing can't follow that statically,
  // so without this the .wasm file is silently missing from the deployed
  // function and every HEIC conversion fails in production only (never in
  // local dev, where the full node_modules tree is on disk).
  outputFileTracingIncludes: {
    '/api/admin/media': ['./node_modules/libheif-js/libheif-wasm/*.wasm'],
    '/api/admin/enhance': ['./node_modules/libheif-js/libheif-wasm/*.wasm'],
    // Belt-and-suspenders for the same class of bug as above: the bundled
    // font used to render Before/After labels as vector paths (see
    // app/api/admin/compare/route.js) is read via fs.readFileSync, which
    // tracing usually follows fine, but explicitly including it costs
    // nothing and rules the failure mode out entirely.
    '/api/admin/compare': ['./lib/fonts/*.woff'],
  },

  images: {
    remotePatterns: mediaRemotePatterns(),
    // AVIF first (smallest), WebP for the rest; JPEG originals are never sent.
    formats: ['image/avif', 'image/webp'],
    // The originals are 6-10 MB phone photos, so every size is a real transform:
    // keep the ladder short. 1200 is a deliberate step (a 390px phone at 3x).
    // imageSizes stay below the smallest deviceSize, as the Next docs require.
    deviceSizes: [640, 828, 1080, 1200, 1600, 1920, 2560],
    imageSizes: [64, 128, 256, 384, 512],
    // Next 16 only serves the qualities listed here (anything else is a 400, and
    // a `quality` prop is coerced to the nearest entry): 60 for thumbnails and
    // heavily scrimmed backgrounds, 75 default, 85 for large hero/detail shots.
    qualities: [60, 75, 85],
    // Uploaded files get a unique name (upsert: false) so their content never
    // changes under a URL; a long TTL keeps transforms to one per size/format.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // Default is 50 MB, which already covers the 6-10 MB originals; stated so
    // nobody lowers it "to save memory" and breaks the photos.
    maximumResponseBody: 50_000_000,
  },
};

module.exports = nextConfig;
