// Line icons for the programs (stroke styling comes from .icon in globals.css).
const PATHS = {
  'green-plus': (
    <>
      <path d="M5 19C5 10.5 10 5 19.5 4.5 19.5 14 14 19 5 19Z" />
      <path d="M5 19 14 10" />
    </>
  ),
  'spring-plus': (
    <>
      <circle cx="12" cy="12" r="2.25" />
      <circle cx="12" cy="6" r="2.75" />
      <circle cx="12" cy="18" r="2.75" />
      <circle cx="6" cy="12" r="2.75" />
      <circle cx="18" cy="12" r="2.75" />
    </>
  ),
  'community-plus': (
    <>
      <path d="M3.5 11 12 4l8.5 7" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M10 20v-5.5h4V20" />
    </>
  ),
};

const FALLBACK = <path d="M12 4v16M4 12h16" />;

export default function ProgramIcon({ slug }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {PATHS[slug] || FALLBACK}
    </svg>
  );
}

// "Green+" -> Green with the plus picked out in the brand green.
export function ProgramName({ name }) {
  if (typeof name === 'string' && name.endsWith('+')) {
    return (
      <>
        {name.slice(0, -1)}
        <span className="prog-plus">+</span>
      </>
    );
  }
  return name;
}
