/** @type {import('next').NextConfig} */
const nextConfig = {
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
};

module.exports = nextConfig;
