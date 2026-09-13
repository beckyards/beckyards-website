'use client';

import { usePathname } from 'next/navigation';

function Group({ message }) {
  // repeated a few times so one group is always wider than the viewport
  return (
    <span className="promo-bar-group" aria-hidden="true">
      <span>{message}</span>
      <span>{message}</span>
      <span>{message}</span>
    </span>
  );
}

export default function PromoBarClient({ message }) {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/preview')) return null;

  return (
    <a className="promo-bar" href="/contact" aria-label={message}>
      <div className="promo-bar-track">
        <Group message={message} />
        <Group message={message} />
      </div>
    </a>
  );
}
