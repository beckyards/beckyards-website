import { IMAGES } from './siteImages';
import { mediaUrl } from './media';

const m = mediaUrl;

// Default 3-photo galleries for each service page. Every photo is a real job
// photo from the media bucket (see the pools in siteImages.js); the alt text
// describes what is visibly in the frame. `label` is an optional small badge.
const GALLERIES = {
  'lawn-mowing': [
    { src: m('photo-29.jpeg'), alt: 'Freshly mowed lawn with crisp stripes in front of a row of tall evergreens', label: '' },
    { src: m('photo-34.jpeg'), alt: 'Striped lawn leading up to a two-story house and a large shade tree', label: '' },
    { src: m('photo-7.jpeg'), alt: 'Stone-front house behind a lawn mowed in a bold striped pattern', label: '' },
  ],
  mulching: [
    { src: m('photo-5.jpeg'), alt: 'Fresh black mulch bed with shrubs and flowers along a brick house', label: '' },
    { src: m('photo-9.jpeg'), alt: 'Two evergreens in a freshly mulched bed with a clean, curved edge', label: '' },
    { src: m('photo-33.jpeg'), alt: 'Curved black mulch bed with low shrubs in front of a brick porch', label: '' },
  ],
  'bed-redesign': [
    { src: m('photo-28.jpeg'), alt: 'Layered bed of perennials and decorative stones with clean black mulch and edging', label: '' },
    { src: m('photo-27.jpeg'), alt: 'Shrubs and a curved black mulch bed along the front of a house', label: '' },
    { src: m('photo-30.jpeg'), alt: 'Small plantings in black mulch along a front porch and sidewalk', label: '' },
  ],
  planting: [
    { src: m('photo-14.jpeg'), alt: 'Irises planted in fresh mulch along the side of a house', label: '' },
    { src: m('photo-11.jpeg'), alt: 'Purple flowers in a river-stone bed beside a stone wall', label: '' },
    { src: m('photo-16.jpeg'), alt: 'Perennials in a river-stone bed edged with a timber border', label: '' },
  ],
  'seasonal-cleanups': [
    { src: m('photo-35.jpeg'), alt: 'Overgrown side yard with tall weeds before cleanup', label: 'Before' },
    { src: m('photo-31.jpeg'), alt: 'The same spot after cleanup, cleared back to bare soil with a flagstone path', label: 'After' },
    { src: m('photo-2.jpeg'), alt: 'Dump trailer tipped up to unload yard debris', label: '' },
  ],
  'aeration-overseeding': [
    { src: m('photo-25.jpeg'), alt: 'Stone and stucco house with a striped lawn and a rock-edged bed', label: '' },
    { src: m('photo-8.jpeg'), alt: 'White colonial house with a flag behind a neatly striped lawn', label: '' },
    { src: m('photo-24.jpeg'), alt: 'Broad front lawn with bold mowing stripes', label: '' },
  ],
};

export const SERVICES = [
  {
    slug: 'lawn-mowing',
    title: 'Lawn Mowing',
    subtitle: 'Consistent cutting, trimming, and clean edging all season long.',
    tag: 'Weekly & seasonal maintenance',
    body:
      "BeckYards Landscaping & Design provides professional lawn mowing services to keep your property looking neat, healthy, and well-maintained throughout the growing season. Our mowing services include consistent cutting, trimming around obstacles, and clean edging to give your lawn a sharp, polished appearance. Whether you need weekly lawn mowing, routine maintenance, or dependable service throughout the season, we tailor our approach to your property so you can enjoy a lawn that looks its best without the hassle.",
    highlights: [
      'Weekly or biweekly scheduling available',
      'Trimming around obstacles and clean edging',
      'Fully insured, reliable service all season',
    ],
    image: IMAGES.services['lawn-mowing'],
    gallery: GALLERIES['lawn-mowing'],
  },
  {
    slug: 'mulching',
    title: 'Mulching',
    subtitle: 'Expert mulch installation for a cleaner, healthier landscape.',
    tag: 'Bed refresh & protection',
    body:
      'Fresh mulch protects your beds, locks in moisture, and gives your whole property an instantly cleaner look. We install mulch with clean, defined edges so your beds look sharp from the street and stay healthier through the season.',
    highlights: [
      'Clean, defined bed edges',
      'Helps retain moisture and suppress weeds',
      'Refreshes curb appeal in a single visit',
    ],
    image: IMAGES.services.mulching,
    gallery: GALLERIES.mulching,
  },
  {
    slug: 'bed-redesign',
    title: 'Bed Redesign',
    subtitle: 'Thoughtfully designed planting and bed layouts for your property.',
    tag: 'Design & installation',
    body:
      "Transform your landscape with thoughtfully designed planting and bed layouts that complement your property's architecture. From small refreshes to full bed redesigns, we focus on the details that make a real difference in how your outdoor space looks and feels.",
    highlights: [
      'Layouts designed around your property',
      'Plant selection for year-round appeal',
      'Clean installation, start to finish',
    ],
    image: IMAGES.services['bed-redesign'],
    gallery: GALLERIES['bed-redesign'],
  },
  {
    slug: 'planting',
    title: 'Planting',
    subtitle: 'Expert plant selection and installation for lasting color.',
    tag: 'Seasonal & permanent plantings',
    body:
      'Expert plant selection and installation to create lasting color and curb appeal throughout the year. We help choose the right plants for your property’s light, soil, and style, then install them for a clean, professional finish.',
    highlights: [
      'Plant selection matched to your property',
      'Seasonal color or permanent plantings',
      'Professional installation and cleanup',
    ],
    image: IMAGES.services.planting,
    gallery: GALLERIES.planting,
  },
  {
    slug: 'seasonal-cleanups',
    title: 'Seasonal Cleanups',
    subtitle: 'Spring and fall cleanups to keep your property tidy year-round.',
    tag: 'Spring & fall',
    body:
      'BeckYards offers seasonal cleanups to keep your property looking clean, healthy, and well-maintained throughout the year. Our spring cleanups focus on removing debris, refreshing beds, and preparing your landscape for new growth. Fall cleanups help tidy your property before winter by clearing leaves, trimming plants, and leaving your yard neat and orderly. Each cleanup is customized to your property’s needs for a polished, refreshed look.',
    highlights: [
      'Spring: debris removal, bed refresh, new growth prep',
      'Fall: leaf clearing, trimming, winter-ready tidy-up',
      'Customized to your property’s needs',
    ],
    image: IMAGES.services['seasonal-cleanups'],
    gallery: GALLERIES['seasonal-cleanups'],
  },
  {
    slug: 'aeration-overseeding',
    title: 'Aeration & Overseeding',
    subtitle: 'Core aeration and overseeding for a thicker, healthier lawn.',
    tag: 'Seasonal — limited scheduling',
    body:
      'Give your lawn the boost it needs with core aeration and overseeding. Core aeration removes small plugs of soil throughout your lawn, helping reduce soil compaction and allowing water, oxygen, and nutrients to reach the roots more effectively. Overseeding can be added after aeration to introduce fresh grass seed throughout your existing lawn — the holes created during aeration improve seed-to-soil contact, giving new grass a better opportunity to establish and fill in thin or bare areas.',
    highlights: [
      'Aeration: starting around $100–$150',
      'Aeration + Overseeding: typically $175–$300+',
      'Larger properties may cost more depending on acreage and seed needed',
    ],
    image: IMAGES.services['aeration-overseeding'],
    gallery: GALLERIES['aeration-overseeding'],
  },
];

export function getService(slug, services = SERVICES) {
  return services.find((s) => s.slug === slug);
}

// The service object may come from the admin Content row saved before `image`
// and `gallery` existed, so always fall back to the code defaults.
export function serviceImage(service) {
  return service?.image || IMAGES.services[service?.slug] || IMAGES.hero;
}

export function serviceGallery(service) {
  const saved = Array.isArray(service?.gallery)
    ? service.gallery.filter((g) => g && typeof g.src === 'string' && g.src.trim() !== '')
    : [];
  return saved.length > 0 ? saved : GALLERIES[service?.slug] || [];
}

// Page-level copy for /services and /services/[slug]. These live in code (not a
// DB content key) so adding them needs no admin plumbing; the service data
// above stays editable from admin Content.
export const SERVICES_PAGE = {
  index: {
    metaTitle: 'Services',
    metaDescription:
      'Lawn mowing, mulching, bed redesign, planting, seasonal cleanups, and aeration & overseeding from BeckYards Landscaping & Design.',
    heroImage: IMAGES.pools.mowing[5],
    eyebrow: 'Services',
    heading: 'Services Built Around You',
    intro:
      'From weekly mowing to full bed redesigns, every property gets the same care and attention to detail. Pick a service to see what is included.',
    primaryCta: 'Get a Free Quote',
    secondaryCta: 'Browse Services',
    listEyebrow: 'What We Do',
    listHeading: 'Everything We Take Care Of',
    listIntro: 'Choose the service you need or combine a few. Every job is scoped around your property.',
    learnMore: 'Learn more',
    factsEyebrow: 'Good to know',
    factsHeading: 'Simple to Get Started',
    facts: [
      { icon: 'quote', title: 'Free quotes', text: 'Tell us about your property through the contact form and we will put together a customized quote.' },
      { icon: 'shield', title: 'Fully insured', text: 'Insurance documentation is available on request.' },
      { icon: 'leaf', title: 'Taking new mowing clients', text: 'We are currently accepting new lawn mowing clients.' },
      { icon: 'calendar', title: 'Aeration is seasonal', text: 'Aeration & overseeding is a seasonal service with limited availability.' },
    ],
    ctaImage: IMAGES.pools.beds[0],
    ctaHeading: 'Tell Us About Your Property',
    ctaText:
      'Share your address, the scope of work, and your timeline, and we will send back a free, customized quote.',
    ctaButton: 'Get a Free Quote',
  },
  detail: {
    breadcrumbHome: 'Home',
    breadcrumbServices: 'Services',
    quoteCta: 'Get a Free Quote',
    signupCta: 'Sign Up',
    askCta: 'Ask a Question',
    includedTitle: 'What You Get',
    pricingTitle: 'Pricing & Details',
    galleryEyebrow: 'Our Work',
    galleryHeading: 'Recent Work',
    moreEyebrow: 'Keep Exploring',
    moreHeading: 'Explore Other Services',
    ctaHeading: 'Ready to Get Started?',
    ctaText: 'Tell us about your property and we will put together a free, customized quote.',
    ctaTextAeration: 'Aeration & overseeding is seasonal with limited availability. Send in a quick sign-up to get on the list.',
  },
};
