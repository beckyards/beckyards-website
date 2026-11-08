const BASE_URL = 'https://beckyards.com';

// /_next/image is deliberately not blocked: crawlers need it to see the photos.
// /preview is the admin Content editor's live-preview frame, not a real page.
export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/preview'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
