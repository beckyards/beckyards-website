import './admin.css';

export const metadata = {
  title: 'Admin — BeckYards',
  robots: { index: false, follow: false },
};

// Outer admin layout: styling + noindex only, no auth gate (so /admin/login can
// render). The authoritative sign-in check lives in app/admin/(dash)/layout.js.
export default function AdminRootLayout({ children }) {
  return <div className="admin-root">{children}</div>;
}
