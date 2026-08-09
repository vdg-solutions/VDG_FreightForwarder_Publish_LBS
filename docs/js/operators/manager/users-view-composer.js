// users-view-composer.js — pure logic for the admin Users CRUD view (F-24-04).
// No I/O: role list, email/prefix derivation, table filter, sort. Mirrors ledger-composer.js.

export const ROLE_MANAGER    = 'Manager';
export const ROLE_SALES_REP  = 'SalesRep';
export const ROLE_ACCOUNTANT = 'Accountant';
export const ROLE_AUDITOR    = 'Auditor';
export const ROLE_VALUES     = [ROLE_MANAGER, ROLE_SALES_REP, ROLE_ACCOUNTANT, ROLE_AUDITOR];

export const ROLE_PRICING = 'Pricing';

// #28: roles are a FLAT SET — one person holds as many as the job needs (a manager who also sells;
// a sales rep who also keeps the rate cards). ROLE_VALUES stays the filter-bar vocabulary;
// ASSIGNABLE_ROLES is what the add/edit form offers as checkboxes.
export const ASSIGNABLE_ROLES = [...ROLE_VALUES, ROLE_PRICING];

/// Ticked roles, returned in ASSIGNABLE_ROLES order so the wire format is stable.
export function rolesFromForm(overlay) {
  const ticked = new Set([...overlay.querySelectorAll('input[data-role]')]
    .filter((el) => el.checked)
    .map((el) => el.dataset.role));
  return ASSIGNABLE_ROLES.filter((r) => ticked.has(r));
}

/// Checkbox list shared by the add and edit modals.
export function roleCheckboxesHtml(current = [], labelFor = (r) => r) {
  const held = new Set(current || []);
  return ASSIGNABLE_ROLES.map((r) => `
    <label class="flex items-center gap-2 text-xs text-slate-600">
      <input type="checkbox" data-role="${r}" ${held.has(r) ? 'checked' : ''} class="rounded border-slate-300" />
      ${labelFor(r)}
    </label>`).join('');
}

/// Matches user_prefix.rs SUFFIX_MODULO — the 4-digit collision suffix space.
const PREFIX_SEED_RANGE      = 10000;
const STATUS_FILTER_ACTIVE   = 'active';
const STATUS_FILTER_INACTIVE = 'inactive';
const EMAIL_REGEX            = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/// AC-03: Add User modal auto-fills user_prefix from the email local-part (mirrors
/// auth-gate.js::emailPrefix — kept local here so this module stays zero-dependency/pure).
export function deriveUserPrefix(email) {
  return (email || '').split('@')[0].toLowerCase();
}

/// #30: the prefix is ALLOCATED, not typed. It names the user's Drive fork and their grant file,
/// which is machinery, not something a manager should be asked to invent — and the field was
/// mislabelled "Mã sales" on the form, colliding with the real 4-digit sales_code. Two employees
/// can genuinely share a local-part (an@gmail.com / an@congty.vn), so a collision appends 4 random
/// digits. Allocation itself lives in Rust (boundary/user_prefix.rs) — this only feeds it the
/// prefixes already in use and a random starting suffix.
export function allocateUserPrefix(email, users, wasm = null) {
  const bridge = wasm || window.__vdg_wasm;
  const taken  = (users || []).map((u) => u.user_prefix).filter(Boolean);
  const seed   = Math.floor(Math.random() * PREFIX_SEED_RANGE);
  return bridge.user_prefix_allocate(email, JSON.stringify(taken), seed);
}

/// AC-03: "validated as Google email" == well-formed email address; Google OAuth itself is the
/// real identity check, this is just a client-side format guard before submit.
export function isValidEmail(email) {
  return EMAIL_REGEX.test((email || '').trim());
}

/// AC-06: role + active/inactive + search(email/name) compose with AND, matching ledger's
/// filterLegs convention.
export function filterUsers(users, { search = '', role = '', activeFilter = '' } = {}) {
  const needle = search.trim().toLowerCase();
  return users.filter((u) => {
    if (role && u.role !== role) return false;
    if (activeFilter === STATUS_FILTER_ACTIVE   && !u.active) return false;
    if (activeFilter === STATUS_FILTER_INACTIVE && u.active)  return false;
    if (needle) {
      const haystack = `${u.email} ${u.display_name || ''}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}

/// Stable table order — JSONL dedup preserves first-seen insertion order, not alphabetical.
export function sortUsersByEmail(users) {
  return [...users].sort((a, b) => a.email.localeCompare(b.email));
}
