// Operator: dynamic sales rep registry — F-15-14
// Pure: no DOM access. Cache 5-min TTL, force-refresh on user entity change.

const SALES_REGISTRY_TTL_MS = 5 * 60 * 1000;
const KIND_USER             = 'user';

const COLOR_PALETTE = [
  'border-blue-500',
  'border-emerald-500',
  'border-amber-500',
  'border-rose-500',
  'border-indigo-500',
  'border-cyan-500',
  'border-orange-500',
  'border-purple-500',
];

let _cache = { data: null, expiresAt: 0 };

// djb2 hash → palette index
function _hashColor(prefix) {
  let h = 5381;
  for (let i = 0; i < prefix.length; i++) {
    h = ((h << 5) + h) ^ prefix.charCodeAt(i);
    h = h >>> 0; // unsigned 32-bit
  }
  return COLOR_PALETTE[h % COLOR_PALETTE.length];
}

function _isActive(u) {
  if (u.role !== 'sales')  return false;
  if (u.disabled)          return false;
  if (u.status === 'disabled') return false;
  return true;
}

function _mapUser(u) {
  const prefix = u.prefix || (u.email ? u.email.split('@')[0].toLowerCase() : u.id);
  return {
    id:         u.id,
    name:       u.name || prefix,
    prefix,
    email:      u.email || '',
    color:      u.color || _hashColor(prefix),
    sales_code: u.sales_code || prefix,
  };
}

export async function getActiveSalesReps(repo) {
  if (_cache.data && Date.now() < _cache.expiresAt) return _cache.data;

  const all = await repo.list(KIND_USER, null);
  const reps = all.filter(_isActive).map(_mapUser);

  _cache = { data: reps, expiresAt: Date.now() + SALES_REGISTRY_TTL_MS };
  return reps;
}

export function getSalesRepByPrefix(reps, prefix) {
  if (!prefix) return null;
  const up = prefix.toUpperCase();
  return reps.find((r) => r.prefix.toUpperCase() === up) ?? null;
}

export function clearRegistryCache() {
  _cache = { data: null, expiresAt: 0 };
}

// Attach to global event bus — call once from app.js or lazily here
if (typeof window !== 'undefined') {
  window.addEventListener('vdg:entity-changed', (e) => {
    if (e.detail?.kind === KIND_USER) clearRegistryCache();
  });
}
