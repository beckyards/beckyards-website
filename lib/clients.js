// Shared by the admin Clients page, Mowing Routes page and their APIs.
//
// `clients` is the master list: one row per person, whatever work you do for them.
// `mowing_clients` (historical name) holds the ROUTE STOPS: a client can have one
// stop on Route A and/or one on Route B, each with its own price, cut height,
// payment type and driving order. A client with no stop is simply "not on a route".

export const CLIENT_TYPES = ['Mowing', 'Landscaping', 'Yearly', 'One-time', 'Other'];

export const ROUTES = ['A', 'B'];
export const ROUTE_LABELS = { A: 'Route A', B: 'Route B' };

export const MAX_LEN = { name: 200, address: 500, phone: 40, email: 200, notes: 2000 };

export const DEFAULT_MOW_HEIGHT = 3;

// Loose on purpose: just "something@something.something", no spaces.
export function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// ['A'] -> "Route A", ['A','B'] -> "Route A + B", [] -> ''
export function routesLabel(routes) {
  if (!Array.isArray(routes) || routes.length === 0) return '';
  return `Route ${routes.join(' + ')}`;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
