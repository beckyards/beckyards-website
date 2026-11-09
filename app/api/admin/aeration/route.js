import { makeSignupAdminHandlers } from '../../../../lib/signupAdminApi';

export const dynamic = 'force-dynamic';

// Aeration & overseeding sign-ups. Behavior lives in lib/signupAdminApi.js so the
// aeration and leaf cleanup lists stay identical.
const handlers = makeSignupAdminHandlers({
  table: 'aeration_signups',
  columns: 'id, name, phone, email, address, service_type, season, price, completed, sort_order, created_at',
  requiredText: ['name', 'phone', 'address'],
  optionalText: ['email'],
});

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
