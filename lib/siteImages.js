import { mediaUrl } from './media';

// Curated photo choices used as DEFAULTS across the public site. Every one of
// these is a real BeckYards job photo that already lives in the Supabase media
// bucket (visible on the admin Images page). The admin Content editor can still
// override any image that is stored in a content field.
const m = mediaUrl;

export const IMAGES = {
  // Homepage hero candidates, best first (portrait crops are poor for a wide hero).
  hero: m('photo-19.jpeg'),
  heroAlternates: [m('photo-25.jpeg'), m('photo-8.jpeg'), m('photo-24.jpeg'), m('photo-7.jpeg')],

  services: {
    'lawn-mowing': m('photo-24.jpeg'),
    mulching: m('photo-18.jpeg'),
    'bed-redesign': m('photo-26.jpeg'),
    planting: m('photo-21.jpeg'),
    'seasonal-cleanups': m('photo-13.jpeg'),
    'aeration-overseeding': m('photo-17.jpeg'),
  },

  programs: {
    'green-plus': m('photo-9.jpeg'),
    'spring-plus': m('photo-12.jpeg'),
    'community-plus': m('photo-8.jpeg'),
    hero: m('photo-5.jpeg'), // /programs banner (also the fallback for unknown programs)
    cta: m('photo-24.jpeg'), // closing band background
  },

  // A true same-spot before/after pair (overgrown bed -> cleaned-out bed).
  beforeAfter: { before: m('photo-35.jpeg'), after: m('photo-31.jpeg') },

  about: m('photo-8.jpeg'),
  // About page: portrait photo beside the story copy, and a four-photo strip of real work.
  aboutStory: m('photo-14.jpeg'),
  aboutStrip: ['photo-26.jpeg', 'photo-24.jpeg', 'photo-18.jpeg', 'photo-12.jpeg'].map(m),

  // Strongest photos for homepage "featured work" tiles, best first.
  featured: [
    m('photo-26.jpeg'),
    m('photo-24.jpeg'),
    m('photo-18.jpeg'),
    m('photo-12.jpeg'),
    m('photo-29.jpeg'),
    m('photo-5.jpeg'),
    m('photo-21.jpeg'),
    m('photo-34.jpeg'),
  ],

  // Extra supporting shots, grouped by subject, for galleries / detail pages.
  pools: {
    mowing: ['photo-24.jpeg', 'photo-29.jpeg', 'photo-17.jpeg', 'photo-34.jpeg', 'photo-15.jpeg', 'photo-22.jpeg', 'photo-7.jpeg'].map(m),
    mulching: ['photo-18.jpeg', 'photo-5.jpeg', 'photo-6.jpeg', 'photo-12.jpeg', 'photo-23.jpeg', 'photo-32.jpeg', 'photo-9.jpeg', 'photo-33.jpeg'].map(m),
    beds: ['photo-26.jpeg', 'photo-28.jpeg', 'photo-27.jpeg', 'photo-30.jpeg', 'photo-20.jpeg', 'photo-11.jpeg', 'photo-16.jpeg'].map(m),
    planting: ['photo-21.jpeg', 'photo-14.jpeg', 'photo-11.jpeg', 'photo-16.jpeg', 'photo-26.jpeg', 'photo-5.jpeg'].map(m),
    cleanups: ['photo-13.jpeg', 'photo-2.jpeg', 'photo-3.jpeg', 'photo-4.jpeg', 'photo-35.jpeg', 'photo-31.jpeg'].map(m),
    houses: ['photo-19.jpeg', 'photo-25.jpeg', 'photo-8.jpeg', 'photo-10.jpeg', 'photo-7.jpeg', 'photo-33.jpeg'].map(m),
  },
};
