import { IMAGES } from './siteImages';

export const PROGRAMS = [
  {
    slug: 'green-plus',
    name: 'Green+',
    eyebrow: 'Enterprise',
    title: 'Sustainable Landscaping. Documented Impact.',
    pitch: 'Trees and plant material chosen to keep growing, with the documentation to show for it.',
    body:
      'Green+ is our eco-focused upgrade designed to improve your property while strengthening your environmental positioning. We install trees and plant material with long-term growth and CO₂ absorption in mind. Every project includes estimated impact documentation and biannual progress summaries. It’s a structured, trackable way to enhance curb appeal while reinforcing your commitment to sustainability.',
    highlights: [
      'Trees and plant material selected for long-term CO₂ absorption',
      'Estimated environmental impact documentation per project',
      'Biannual progress summaries',
    ],
    image: IMAGES.programs['green-plus'],
    imageAlt: 'Evergreen trees in a fresh mulch bed at the edge of a mowed lawn',
    ctaLabel: 'Learn more',
    closingHeading: 'Ready to talk about your property?',
    closingBody: 'Tell us about the property and what you want to accomplish. We’ll follow up with a free quote.',
    closingCta: 'Request a free quote',
  },
  {
    slug: 'spring-plus',
    name: 'Spring+',
    eyebrow: 'Enterprise',
    title: 'Seasonal Color. Instant Curb Appeal.',
    pitch: 'Seasonal color that makes the first impression count.',
    body:
      'Spring+ is our commercial annual planting program built to refresh properties with vibrant, high-visibility color. We strategically design and install seasonal flower displays that elevate first impressions and create a polished, professional look. With optional seasonal maintenance, your property stays sharp and inviting throughout the busiest months of the year.',
    highlights: [
      'Strategically designed seasonal flower displays',
      'Built for high-visibility commercial properties',
      'Optional seasonal maintenance add-on',
    ],
    image: IMAGES.programs['spring-plus'],
    imageAlt: 'A flowering tree in a clean, freshly edged mulch bed',
    ctaLabel: 'Learn more',
    closingHeading: 'Planning your seasonal color?',
    closingBody: 'Tell us about the property and what you have in mind. We’ll follow up with a free quote.',
    closingCta: 'Request a free quote',
  },
  {
    slug: 'community-plus',
    name: 'Community+',
    eyebrow: 'Neighborhood',
    title: 'Lawn Care That Works With Your Budget',
    pitch: 'A well-kept yard, at a price that fits your situation.',
    body:
      "We know reliable lawn care isn't always easy to afford. Community+ is our neighborhood program for homeowners who need mowing or basic maintenance but are working with a tighter budget. Tell us your situation and we'll work with you on a plan and pricing that actually fits — no judgment, just a well-kept yard.",
    highlights: [
      'Flexible, income-based pricing',
      'Mowing and basic maintenance plans',
      "A conversation first — we'll find what works for you",
    ],
    image: IMAGES.programs['community-plus'],
    imageAlt: 'A neat house with a freshly striped front lawn',
    ctaLabel: 'Tell us your situation',
    closingHeading: 'Tell us your situation',
    closingBody:
      'Share a little about your yard and what works for your budget. We’ll start with a conversation and figure out a plan and pricing that fits — no judgment, just a well-kept yard.',
    closingCta: 'Tell us your situation',
  },
];

// Copy for the /programs index and the shared labels on each program page.
// Lives in code (not the admin Content editor) because the 'programs' content
// key is an array of programs and has no room for page-level fields.
export const PROGRAMS_PAGE = {
  heroEyebrow: 'Programs',
  heroHeading: 'Signature Programs',
  heroLead:
    'Three programs, one idea: the work should fit the customer. Green+ and Spring+ are built for commercial and enterprise properties. Community+ is for neighbors who want a well-kept yard on a tighter budget.',
  heroCta: 'Get a free quote',
  enterpriseEyebrow: 'Enterprise',
  enterpriseHeading: 'Built for commercial properties',
  enterpriseLead: 'Two structured programs for commercial and enterprise properties, each planned around a clear result.',
  neighborhoodEyebrow: 'Neighborhood',
  neighborhoodHeading: 'Putting neighbors first',
  ctaHeading: 'Not sure which program fits?',
  ctaBody: 'Tell us about your property and what you’re hoping to do. We’ll point you to the right program and put together a free quote.',
  ctaLabel: 'Get a free quote',
  includedEyebrow: 'What’s included',
  includedHeading: 'What’s included',
  moreEyebrow: 'Keep exploring',
  moreHeading: 'Other programs',
  allProgramsLabel: 'All programs',
};

export function getProgram(slug, programs = PROGRAMS) {
  return programs.find((p) => p.slug === slug);
}

// A saved override may predate the image field, so always resolve through here.
export function programImage(program) {
  return program?.image || IMAGES.programs[program?.slug] || IMAGES.programs.hero;
}
