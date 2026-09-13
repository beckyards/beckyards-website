'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/browser';

const I = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" />
    </svg>
  ),
  analytics: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="21" x2="21" y2="21" /><rect x="5" y="11" width="3" height="7" />
      <rect x="11" y="7" width="3" height="11" /><rect x="17" y="13" width="3" height="5" />
    </svg>
  ),
  messages: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  images: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  ),
  content: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  ),
  aeration: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
  mowing: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />
    </svg>
  ),
};

const LINKS = [
  { href: '/admin', label: 'Dashboard', icon: I.dashboard },
  { href: '/admin/analytics', label: 'Analytics', icon: I.analytics },
  { href: '/admin/messages', label: 'Messages', icon: I.messages },
  { href: '/admin/aeration', label: 'Aeration List', icon: I.aeration },
  { href: '/admin/mowing-route', label: 'Route', icon: I.mowing },
  { href: '/admin/images', label: 'Images', icon: I.images },
  { href: '/admin/content', label: 'Content', icon: I.content },
];

export default function AdminNav({ email }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/admin/login');
    router.refresh();
  }

  return (
    <aside className="admin-nav">
      <div className="admin-brand">
        <a href="/" target="_blank" rel="noreferrer">BeckYards</a>
        <span>Control panel</span>
      </div>
      <nav>
        {LINKS.map((link) => {
          const active =
            link.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(link.href);
          return (
            <a key={link.href} href={link.href} className={active ? 'is-active' : undefined}>
              {link.icon}
              {link.label}
            </a>
          );
        })}
      </nav>
      <div className="admin-nav-foot">
        <span className="admin-whoami">Signed in as</span>
        <span className="admin-email" title={email}>{email}</span>
        <button type="button" onClick={logOut}>Log out</button>
      </div>
    </aside>
  );
}
