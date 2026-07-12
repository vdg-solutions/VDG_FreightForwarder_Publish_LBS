// users-view-composer.js — pure logic for the admin Users CRUD view (F-24-04).
// No I/O: role list, email/prefix derivation, table filter, sort. Mirrors ledger-composer.js.

export const ROLE_MANAGER    = 'Manager';
export const ROLE_SALES_REP  = 'SalesRep';
export const ROLE_ACCOUNTANT = 'Accountant';
export const ROLE_AUDITOR    = 'Auditor';
export const ROLE_VALUES     = [ROLE_MANAGER, ROLE_SALES_REP, ROLE_ACCOUNTANT, ROLE_AUDITOR];

const STATUS_FILTER_ACTIVE   = 'active';
const STATUS_FILTER_INACTIVE = 'inactive';
const EMAIL_REGEX            = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/// AC-03: Add User modal auto-fills sales_prefix from the email local-part (mirrors
/// auth-gate.js::emailPrefix — kept local here so this module stays zero-dependency/pure).
export function deriveSalesPrefix(email) {
  return (email || '').split('@')[0].toLowerCase();
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
