import { getContent } from '../../lib/siteContent';
import { FOOTER_DEFAULT } from '../../lib/pageContent';

export default async function Footer() {
  const c = await getContent('footer', FOOTER_DEFAULT);

  return (
    <footer>
      <div className="wrap footer-inner">
        <span>{c.copyright}</span>
        <div className="footer-links">
          <span>{c.location}</span>
          <a href="/terms">{c.termsLabel}</a>
          <a href="/admin" className="footer-admin">Admin</a>
        </div>
      </div>
    </footer>
  );
}
