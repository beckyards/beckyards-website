'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

// First-party page-view beacon. Fires once per client-side navigation, posts a
// tiny JSON body to /api/track, and does nothing else — no cookies, no
// localStorage, no third-party requests. Honours Do Not Track / Global Privacy
// Control and never runs on the /admin area.
export default function Analytics() {
  const pathname = usePathname();
  const lastSent = useRef(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin') || pathname.startsWith('/preview')) return;
    if (lastSent.current === pathname) return;

    const dnt =
      navigator.doNotTrack === '1' ||
      window.doNotTrack === '1' ||
      navigator.doNotTrack === 'yes' ||
      navigator.globalPrivacyControl === true;
    if (dnt) return;

    lastSent.current = pathname;

    let params;
    try {
      params = new URLSearchParams(window.location.search);
    } catch {
      params = new URLSearchParams();
    }

    const payload = JSON.stringify({
      path: pathname,
      referrer: document.referrer || '',
      utm: {
        source: params.get('utm_source'),
        medium: params.get('utm_medium'),
        campaign: params.get('utm_campaign'),
      },
    });

    try {
      const blob = new Blob([payload], { type: 'application/json' });
      const beaconed = navigator.sendBeacon && navigator.sendBeacon('/api/track', blob);
      if (!beaconed) {
        fetch('/api/track', {
          method: 'POST',
          body: payload,
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Ignore — analytics must never break the page.
    }
  }, [pathname]);

  return null;
}
