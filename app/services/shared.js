export { ogImageFor } from '../../lib/seo';

// Honors the focal point the admin gallery editor saves (0-100 percentages).
export function focalStyle(item) {
  const x = Number(item?.focalX);
  const y = Number(item?.focalY);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
  return { objectPosition: `${Math.min(100, Math.max(0, x))}% ${Math.min(100, Math.max(0, y))}%` };
}

const ICONS = {
  quote: (
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12ZM8.5 11h7M8.5 14h4" />
  ),
  shield: <path d="M12 3 19 6v5.5c0 4.4-2.9 7.8-7 9.5-4.1-1.7-7-5.1-7-9.5V6l7-3ZM9 12l2.2 2.2L15.2 10" />,
  leaf: <path d="M5 19c0-8.5 5-14 15-14 0 10-5.5 15-13.5 15M5 19l8-8" />,
  calendar: <path d="M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2ZM3 10h18M8 3v4M16 3v4" />,
};

export function ServiceIcon({ name }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      {ICONS[name] || ICONS.leaf}
    </svg>
  );
}
