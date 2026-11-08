// Inline line icons for the home page (stroke 1.75, round caps come from the
// global .icon class). Names are what the admin types into whyPoints[].icon.
const PATHS = {
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  heart: <path d="M12 20.5s-7.5-4.6-7.5-10.4A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7.5 2.5c0 5.8-7.5 10.4-7.5 10.4z" />,
  sparkle: (
    <>
      <path d="M11 4l1.9 5.1L18 11l-5.1 1.9L11 18l-1.9-5.1L4 11l5.1-1.9z" />
      <path d="M19 15.5v4M17 17.5h4" />
    </>
  ),
  chat: (
    <>
      <path d="M4 5.5h16v11H10.5L6 20v-3.5H4z" />
      <path d="M8 10h8M8 13h5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.5l7 2.8v5.2c0 4.3-2.9 7.6-7 9-4.1-1.4-7-4.7-7-9V6.3z" />
      <path d="M9 12l2.2 2.2L15.2 10" />
    </>
  ),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  'arrows-h': <path d="M8 7l-5 5 5 5M16 7l5 5-5 5" />,
  'arrow-up-right': <path d="M7 17L17 7M8 7h9v9" />,
};

export default function HomeIcon({ name, className = 'icon', ...rest }) {
  const body = PATHS[name] || PATHS.check;
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...rest}>
      {body}
    </svg>
  );
}
