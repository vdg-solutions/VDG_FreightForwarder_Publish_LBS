// F-29-15: sidebar accordion — pure persistence + active-group-override helpers.
// No Lit/DOM import — sidebar.js imports Lit from a CDN URL and can't be loaded
// under node:test, so the testable logic lives here (strings + Sets only).

export const SIDEBAR_COLLAPSED_KEY = 'vdg.sidebar.collapsed';

// Parse stored JSON array of collapsed group keys -> Set<string>.
// null / '' / non-array / malformed JSON -> empty Set (all-expanded). Never throws.
export function parseCollapsed(raw) {
  if (!raw) return new Set();
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((k) => typeof k === 'string'));
  } catch { /* corrupt pref discarded — fall back to all-expanded */ return new Set(); }
}

// Set<string> -> JSON string for localStorage.
export function serializeCollapsed(set) {
  return JSON.stringify([...set]);
}

// Toggle one group key, returning a NEW Set (immutable update for Lit reactivity).
export function toggleCollapsed(set, key) {
  const next = new Set(set);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

// AC-04 predicate: a group renders collapsed iff saved-collapsed AND it is not the active group.
export function isGroupCollapsed(collapsedSet, groupKey, activeGroupKey) {
  return collapsedSet.has(groupKey) && groupKey !== activeGroupKey;
}

// Group key owning the active route (reuses item.route === activeRoute), else null.
export function activeGroupKey(items, activeRoute) {
  const match = items.find((i) => i.route === activeRoute);
  return match ? match.group : null;
}
