export const PROGRAMS = [
  {
    slug: 'green-plus',
    eyebrow: 'Green+ | Enterprise',
    title: 'Sustainable Landscaping. Documented Impact.',
    body:
      'Green+ is our eco-focused upgrade designed to improve your property while strengthening your environmental positioning. We install trees and plant material with long-term growth and CO₂ absorption in mind. Every project includes estimated impact documentation and biannual progress summaries. It’s a structured, trackable way to enhance curb appeal while reinforcing your commitment to sustainability.',
    highlights: [
      'Trees and plant material selected for long-term CO₂ absorption',
      'Estimated environmental impact documentation per project',
      'Biannual progress summaries',
    ],
    ctaLabel: 'Learn more',
  },
  {
    slug: 'spring-plus',
    eyebrow: 'Spring+ | Enterprise',
    title: 'Seasonal Color. Instant Curb Appeal.',
    body:
      'Spring+ is our commercial annual planting program built to refresh properties with vibrant, high-visibility color. We strategically design and install seasonal flower displays that elevate first impressions and create a polished, professional look. With optional seasonal maintenance, your property stays sharp and inviting throughout the busiest months of the year.',
    highlights: [
      'Strategically designed seasonal flower displays',
      'Built for high-visibility commercial properties',
      'Optional seasonal maintenance add-on',
    ],
    ctaLabel: 'Learn more',
  },
];

export function getProgram(slug, programs = PROGRAMS) {
  return programs.find((p) => p.slug === slug);
}
