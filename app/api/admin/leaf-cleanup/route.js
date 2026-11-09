import { makeSignupAdminHandlers } from '../../../../lib/signupAdminApi';

export const dynamic = 'force-dynamic';

// Leaf cleanup sign-ups (same behavior as the aeration list, plus a notes field).
const handlers = makeSignupAdminHandlers({
  table: 'leaf_cleanup_signups',
  columns: 'id, name, phone, email, address, notes, season, price, completed, sort_order, created_at',
  requiredText: ['name', 'phone'],
  optionalText: ['email', 'address', 'notes'],
});

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
