import { getContent } from '../../lib/siteContent';
import { PROMO_BAR_DEFAULT } from '../../lib/pageContent';
import PromoBarClient from './PromoBarClient';

// Server wrapper so the banner text is admin-editable; the marquee/hide-on-
// /admin behavior needs the client for usePathname, so that part is split out.
export default async function PromoBar() {
  const c = await getContent('promoBar', PROMO_BAR_DEFAULT);
  return <PromoBarClient message={c.message} />;
}
