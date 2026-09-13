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
  },
];

export function getService(slug, services = SERVICES) {
  return services.find((s) => s.slug === slug);
}
