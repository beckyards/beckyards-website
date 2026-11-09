// The season each sign-up list is currently collecting for. Change these when a
// new season opens (e.g. 'Fall 2028'); every new sign-up is stamped with the
// value here, and the admin lists group rows by it so last season's names stay
// visible but separate.
//
// The database defaults (aeration_signups.season / leaf_cleanup_signups.season)
// match these as a safety net, but the API routes always set the value explicitly.

export const AERATION_SEASON = 'Fall 2027';
export const LEAF_CLEANUP_SEASON = 'Fall 2026';
