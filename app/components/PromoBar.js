import { getContent } from '../../lib/siteContent';
import { PROMO_BAR_DEFAULT } from '../../lib/pageContent';
import PromoBarClient from './PromoBarClient';

// Server wrapper so the banner text is admin-editable; hiding it on /admin and
// /preview needs usePathname, so that part is split into the client component.
export default async function PromoBar() {
  const c = await getContent('promoBar', PROMO_BAR_DEFAULT);
  return <PromoBarClient message={c.message} linkLabel={c.linkLabel} />;
}
