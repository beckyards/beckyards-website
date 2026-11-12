// The admin panel's structure, in one place. The sidebar (AdminNav) and the dashboard's
// section cards (Dashboard) both read this, so they can't drift apart.
//   icon: a key into the icon set in AdminNav.js (sections have one too, shown on the collapsed header)
//   desc: the one-line blurb shown on the dashboard card
// A section with a single page is shown as a plain link; sections with several collapse and expand.

export const DASHBOARD_LINK = { href: '/admin', label: 'Dashboard', icon: 'dashboard' };

export const SECTIONS = [
  {
    key: 'inbox',
    icon: 'messages',
    title: 'Inbox',
    items: [
      { href: '/admin/messages', label: 'Messages', icon: 'messages', desc: 'Questions and quote requests from the website contact form, with a reply box.' },
    ],
  },
  {
    key: 'signups',
    icon: 'aeration',
    title: 'Seasonal Sign-ups',
    items: [
      { href: '/admin/aeration', label: 'Aeration List', icon: 'aeration', desc: 'Everyone who signed up for aeration & overseeding, by season, with a spot to set their price.' },
      { href: '/admin/leaf-cleanup', label: 'Leaf Cleanup', icon: 'leaf', desc: 'Everyone who signed up for a fall leaf cleanup, with their notes and a spot to set their price.' },
    ],
  },
  {
    key: 'clients',
    icon: 'clients',
    title: 'Clients & Jobs',
    items: [
      { href: '/admin/clients', label: 'Clients', icon: 'clients', desc: 'Everyone you work for in one list: mowing, landscaping, one-time and yearly jobs.' },
      { href: '/admin/jobs', label: 'Jobs', icon: 'jobs', desc: 'Your to-do list: jobs with a time estimate, priority and expected income, with Scheduled and Earned totals.' },
    ],
  },
  {
    key: 'mowing',
    icon: 'mowing',
    title: 'Mowing',
    items: [
      { href: '/admin/mowing-route', label: 'Mowing Routes', icon: 'mowing', desc: "Route A and Route B: set each stop's price and cut height, and drag to set the driving order." },
      { href: '/admin/route-run', label: 'Run Route', icon: 'route', desc: 'Pick Route A or B, check clients off as you mow, and look back at completed routes.' },
    ],
  },
  {
    key: 'photos',
    icon: 'images',
    title: 'Photos',
    items: [
      { href: '/admin/images', label: 'Images', icon: 'images', desc: "Upload photos, rename them to something you'll recognize, copy URLs, or delete." },
      { href: '/admin/enhance', label: 'Enhance', icon: 'enhance', desc: 'Fix the color and contrast of a photo, or adjust one part of it, then save it to Images.' },
      { href: '/admin/compare', label: 'Before/After', icon: 'compare', desc: 'Combine a before photo and an after photo into one labeled comparison image.' },
    ],
  },
  {
    key: 'website',
    icon: 'content',
    title: 'Website',
    items: [
      { href: '/admin/content', label: 'Content', icon: 'content', desc: "Edit every page's words: headlines, intros, team bios, terms. Form or raw JSON." },
      { href: '/admin/analytics', label: 'Analytics', icon: 'analytics', desc: 'Traffic trends, top pages, referrers, devices and countries over 7 to 90 days.' },
    ],
  },
];
