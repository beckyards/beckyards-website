// Default (built-in) copy for every page/section the admin Content editor can
// override, one export per `site_content` key. Matches what's hardcoded in
// each page so nothing changes visually until someone edits it in /admin.

import { mediaUrl } from './media';
import { IMAGES } from './siteImages';
import { AERATION_SEASON } from './seasons';

// Photo fields are objects ({ image, alt }) because the admin Content editor only
// shows an image picker for fields named image/src/cover/poster/thumb/thumbnail.
// An empty `image` falls back to the curated photo in lib/siteImages.js.
export const HOME_DEFAULT = {
  heroEyebrow: 'Mowing • Mulching • Bed Redesign • Planting • Seasonal Cleanups',
  heroHeading: 'Landscaping That Puts You First',
  heroSubheading:
    'From the first consultation to the final touches, we treat every property as if it were our own.',
  heroCtaLabel: 'Free Quote',
  heroSecondaryCtaLabel: 'See Our Work',
  heroTrust: ['Fully insured', 'Free quotes', 'Customer-first service'],
  heroPhoto: { image: IMAGES.hero },

  servicesEyebrow: 'Services',
  servicesHeading: 'What We Do',
  servicesIntro: 'From weekly mowing to full bed redesigns — pick a service to see the details.',
  servicesLinkLabel: 'All services',

  // "Leaf cleanup, now booking" band between Services and Aeration. Clear the
  // heading in the editor to hide it.
  leafEyebrow: 'Fall Cleanup',
  leafHeading: 'Leaf Cleanup — Now Booking',
  leafNote: 'Sign up now and we’ll follow up with a quote.',
  leafBody:
    'Let us handle the leaves. We clear them from your lawn and beds, trim back plants, and leave your yard neat and ready for winter.',
  leafCtaLabel: 'Sign Up for Leaf Cleanup',
  leafDetailsLabel: 'About seasonal cleanups',
  leafPhoto: { image: IMAGES.services['seasonal-cleanups'], alt: '' },

  aerationEyebrow: 'Seasonal Service',
  aerationHeading: 'Lawn Aeration & Overseeding',
  aerationNote: `Now taking ${AERATION_SEASON} signups — limited availability.`,
  aerationCtaLabel: 'Sign Up',
  aerationDetailsLabel: 'Service details',
  aerationPhoto: {
    image: mediaUrl('photo-29.jpeg'),
    alt: 'A freshly mowed, evenly striped lawn lined with tall evergreens',
  },

  beforeAfterEyebrow: 'Before & After',
  beforeAfterHeading: 'See the Difference',
  beforeAfterBody:
    'Drag the handle to compare an overgrown bed with the same spot after we cleared it out. Clean lines and tidy finishes are what we aim for on every job.',
  beforeAfterHint: 'Drag to compare',
  beforeAfterLinkLabel: 'See the full portfolio',
  beforeLabel: 'Before',
  afterLabel: 'After',
  beforePhoto: {
    image: IMAGES.beforeAfter.before,
    alt: 'An overgrown garden bed beside a walkway and fence, before cleanup',
  },
  afterPhoto: {
    image: IMAGES.beforeAfter.after,
    alt: 'The same spot after cleanup, with the bed cleared out and the flagstone path visible',
  },

  featuredEyebrow: 'Recent Work',
  featuredHeading: 'Fresh Beds. Sharp Stripes.',
  featuredIntro: 'A look at recent jobs: striped lawns, fresh mulch beds, and redesigned plantings.',
  featuredCtaLabel: 'View Full Portfolio',

  whyEyebrow: 'Why Choose BeckYards',
  whyHeading: 'A Lasting Impact On Every Project',
  whyBody:
    'We are a small, owner-run company built on putting our customers first and leaving a lasting impact on each customer and their project. From the first consultation to the final touches, we treat every property as if it were our own.',
  whyLinkLabel: 'More about BeckYards',
  // icon: heart | sparkle | chat | shield | check
  whyPoints: [
    {
      icon: 'heart',
      title: 'Customer-first, start to finish',
      body: 'From the first consultation to the final touches, you come first, and your property is treated as if it were our own.',
    },
    {
      icon: 'sparkle',
      title: 'Clean details, sharp finishes',
      body: 'Defined bed edges, tidy cleanups, and the small details that make a property look finished.',
    },
    {
      icon: 'chat',
      title: 'On time and upfront',
      body: 'We show up when we say we will, and we are clear about scope and pricing before work begins.',
    },
    {
      icon: 'shield',
      title: 'Fully insured',
      body: 'Insurance documentation is available on request.',
    },
  ],

  programsEyebrow: 'Programs',
  programsHeading: 'Signature Programs',
  programsIntro:
    'Three programs built around who we are working for: eco-focused and commercial properties, and neighbors on a tighter budget.',
  programsLinkLabel: 'All programs',

  ctaEyebrow: 'Free Quote',
  ctaHeading: 'Ready for a yard you’re proud of?',
  ctaBody: 'Tell us about your property. Quotes are free, and we’ll get back to you as soon as possible.',
  ctaButtonLabel: 'Get Your Free Quote',
  ctaPhoto: { image: mediaUrl('photo-7.jpeg') },
};

export const CONTACT_PAGE_DEFAULT = {
  eyebrow: 'Contact',
  heading: 'Help Us Provide Your Best Quote',
  intro:
    'The more details you share, the faster we can respond with an accurate, customized quote.',
  body: "We'll get back to you as soon as possible!",
  // /contact page banner (the home page shows only the form section).
  image: mediaUrl('photo-34.jpeg'),
  heroHeading: 'Let’s Talk About Your Yard',
  heroLead: 'Tell us what you have in mind. Quotes are free, and we reply as soon as possible.',
  includeHeading: 'Helpful to include',
  include: [
    { text: 'Your address' },
    { text: 'The scope of work' },
    { text: 'Which areas of your property you’d like us to focus on' },
    { text: 'Your vision for the project' },
    { text: 'Your timeline' },
  ],
  stepsHeading: 'What happens next',
  steps: [
    { title: 'You send the details', text: 'Tell us about your property and the work you have in mind.' },
    { title: 'We get back to you', text: 'We reply as soon as possible to talk through the scope and timing.' },
    { title: 'You get a free quote', text: 'Final pricing may be adjusted after an on-site assessment.' },
  ],
  formHeading: 'Request your free quote',
  submitLabel: 'Send Request',
  assurances: [{ label: 'Free quotes' }, { label: 'Fully insured' }],
  successHeading: 'Request received',
  successBody: "Thanks — we'll get back to you as soon as possible!",
  successAgainLabel: 'Send another request',
};

export const ABOUT_DEFAULT = {
  eyebrow: 'About BeckYards',
  heading: 'Customers First. Every Yard.',
  intro:
    'BeckYards Landscaping & Design is a small, owner-run company built on putting our customers first and leaving a lasting impact on each of our customers and their projects.',
  // Blank line = new paragraph.
  body: "Every job gets treated like it matters, from a quick weekly mow to a full bed redesign. We show up when we say we will, communicate clearly about scope and pricing, and focus on clean results — not just getting the work done, but getting it done right.\n\nWe handle mowing, mulching, bed redesign, planting, seasonal cleanups, and aeration & overseeding, and we treat every property as if it were our own.\n\nBeckYards is a Christian-owned business, and our faith is the reason we work the way we do. We believe in doing honest work, serving our neighbors well, and caring for the yards and homes we are trusted with. We aim to work as though we are doing it for the Lord: with integrity, humility, and respect for every customer, whatever their background or beliefs.",
  image: IMAGES.about,
  storyEyebrow: 'How We Work',
  storyHeading: 'Not Just Done. Done Right.',
  storyPhoto: { image: IMAGES.aboutStory, alt: 'A freshly planted and mulched garden bed along the side of a house' },
  servicesLabel: 'What we take care of',
  // Faith / purpose band between the story and the values. Blank line = new paragraph.
  // Clear the heading and body in the editor to hide the whole section.
  faithEyebrow: 'Our Purpose',
  faithHeading: 'We Serve Others to Glorify God',
  faithBody:
    'At BeckYards, serving others is how we honor God. Every yard we care for, every bed we plant, and every customer we talk with is a chance to show the same care we have been shown.\n\nThat is why we work with integrity, treat people with respect, and give every project our best effort. We do not only want to do good work. We want the way we serve you to reflect the God we serve.',
  faithVerse: 'Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.',
  faithVerseRef: 'Colossians 3:23 (NIV)',
  valuesEyebrow: 'What We Stand For',
  valuesHeading: 'The Way We Do Business',
  values: [
    {
      title: 'Rooted in faith',
      body: 'We are Christians, and our faith guides how we treat people: with honesty, humility, and the kind of care we would want for ourselves.',
    },
    {
      title: 'Customers come first',
      body: 'Every job starts with what you want for your property. We serve our customers well and treat each property as if it were our own.',
    },
    {
      title: 'A lasting impact',
      body: 'We take care of what we are trusted with, focusing on the details that make a property look finished and leaving a lasting impact on each customer and project.',
    },
    {
      title: 'Honest and dependable',
      body: 'We are upfront about scope and pricing before work begins, we show up when we say we will, and we are fully insured. Documentation is available on request.',
    },
  ],
  galleryEyebrow: 'Our Work',
  galleryHeading: 'Details You Can See',
  galleryLinkLabel: 'See the full portfolio',
  gallery: [
    { src: IMAGES.aboutStrip[0], alt: 'Curved mulch bed with flowering plants beside a front walkway' },
    { src: IMAGES.aboutStrip[1], alt: 'Freshly striped front lawn' },
    { src: IMAGES.aboutStrip[2], alt: 'Fresh black mulch bed with a clean curved edge' },
    { src: IMAGES.aboutStrip[3], alt: 'Flowering tree in a freshly mulched round bed' },
  ],
  ctaHeading: 'Let’s Talk About Your Property',
  ctaBody: 'Tell us what you have in mind and we’ll get back to you with a free quote.',
  ctaLabel: 'Get a Free Quote',
  ctaPhoto: { image: IMAGES.aboutStrip[1] },
};

// Gallery of completed-work photos shown on /portfolio. Empty by default —
// add photos from the admin Content editor's Portfolio tab (drag-and-drop
// straight into the gallery field, same as any other gallery array).
export const PORTFOLIO_DEFAULT = [];

export const PROMO_BAR_DEFAULT = {
  message: 'Now accepting new lawn mowing clients',
  linkLabel: 'Get a free quote',
};

export const FOOTER_DEFAULT = {
  copyright: '© 2026 BeckYards Landscaping & Design',
  location: 'Fully insured',
  termsLabel: 'Terms & Policies',
  blurb: 'Landscaping that puts you first, with a lasting impact on every customer and project.',
  ctaText: 'Tell us about your property and we will get back to you as soon as possible.',
  ctaLabel: 'Get a free quote',
  servicesHeading: 'Services',
  programsHeading: 'Programs',
  companyHeading: 'Company',
};

export const TERMS_DEFAULT = {
  eyebrow: 'Legal',
  heading: 'Terms & Policies',
  lastUpdated: 'Last Updated: September 2026',
  intro: 'Questions about anything below? Reach us through the contact form.',
  tocLabel: 'On this page',
  contactHeading: 'Contact',
  contactBody: 'Questions about these terms can be sent through our contact form.',
  contactCtaLabel: 'Contact Us',
  sections: [
    {
      heading: 'Our Services',
      body: 'BeckYards Landscaping & Design provides lawn mowing, mulching, bed redesign, planting, seasonal cleanups, aeration and overseeding, and related landscaping services. The scope, deliverables, and pricing for each service are confirmed with you before work begins.',
    },
    {
      heading: 'Quotes & Scheduling',
      body: 'Quotes are provided based on the information submitted through our contact form or in person. Final pricing may be adjusted after an on-site assessment. Scheduling is confirmed once a quote is accepted; some seasonal services (such as aeration and overseeding) have limited availability windows.',
    },
    {
      heading: 'Weather & On-Site Conditions',
      body: 'Some services depend on conditions outside our control. BeckYards may reschedule work due to weather, unsafe conditions, property access issues, or other circumstances that would affect safety or quality. We will work with you to find a new time as soon as reasonably possible.',
    },
    {
      heading: 'Payment',
      body: 'Payment terms are confirmed at the time of quoting. Recurring services (such as weekly mowing) are billed on the agreed schedule. One-time projects may require a deposit before work begins.',
    },
    {
      heading: 'Cancellation & Rescheduling',
      body: 'We ask for as much notice as possible if you need to reschedule or cancel a visit. Recurring service plans can be cancelled at any time; cancellation takes effect at the end of the current billing period.',
    },
    {
      heading: 'Insurance',
      body: 'BeckYards Landscaping & Design is fully insured. Documentation is available on request.',
    },
    {
      heading: 'Property Access',
      body: 'You agree to provide reasonable access to the property for scheduled work, including access to water, gates, or other areas needed to complete the job.',
    },
    {
      heading: 'No Performance Guarantee',
      body: 'While we take pride in quality workmanship, factors like weather, soil conditions, and ongoing care outside our services can affect results (for example, with seeding or planting). We do not guarantee specific outcomes beyond the work performed.',
    },
    {
      heading: 'Changes to These Terms',
      body: 'We may update these Terms & Policies from time to time. Updated terms apply to future services and do not change the terms of work already agreed to.',
    },
  ],
};
