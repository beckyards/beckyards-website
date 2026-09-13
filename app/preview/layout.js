export const metadata = {
  title: 'Preview — BeckYards Admin',
  robots: { index: false, follow: false },
};

// Renders the actual site's markup/classes (via the inherited root layout's
// globals.css) with editable fields swapped in — see [key]/page.js. Only ever
// opened inside an iframe from /admin/content's Visual tab.
export default function PreviewLayout({ children }) {
  return children;
}
