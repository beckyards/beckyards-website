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
  },
};

module.exports = nextConfig;
