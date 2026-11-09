import { SERVICES } from '../lib/services';
import { PROGRAMS } from '../lib/programs';
import { getContent } from '../lib/siteContent';

const BASE_URL = 'https://beckyards.com';

// Re-generate hourly so slugs added or renamed in admin Content show up without a deploy.
export const revalidate = 3600;

function slugsOf(list) {
  return (Array.isArray(list) ? list : [])
    .map((item) => item?.slug)
    .filter((slug) => typeof slug === 'string' && slug !== '');
}

export default async function sitemap() {
  // Service/program pages are driven by admin-editable content, so list the slugs
  // that are actually live; getContent falls back to the code defaults on any error.
  const [services, programs] = await Promise.all([
    getContent('services', SERVICES),
    getContent('programs', PROGRAMS),
  ]);

  const entry = (path, changeFrequency, priority) => ({
    url: `${BASE_URL}${path}`,
    changeFrequency,
    priority,
  });

  return [
    entry('', 'weekly', 1),
    entry('/services', 'monthly', 0.9),
    ...slugsOf(services).map((slug) => entry(`/services/${slug}`, 'monthly', 0.8)),
    entry('/programs', 'monthly', 0.8),
    ...slugsOf(programs).map((slug) => entry(`/programs/${slug}`, 'monthly', 0.7)),
    entry('/about', 'monthly', 0.6),
    entry('/portfolio', 'weekly', 0.7),
    entry('/contact', 'yearly', 0.9),
    entry('/aeration-signup', 'monthly', 0.6),
    entry('/leaf-cleanup-signup', 'monthly', 0.6),
    entry('/terms', 'yearly', 0.2),
  ];
}
