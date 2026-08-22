// sales-rep-i18n.js — role/user token -> display label for the sales-rep field
// (F-19-66). Single source of the manager sentinel + its display policy; reused at the
// builder-render seam and the pivot/report seams so no `__X__`-wrapped token ever reaches the DOM.
import { t } from '../i18n/index.js';
import { ROLE_MANAGER } from '../roles.js';

export const MANAGER_SENTINEL     = '__MANAGER__';
const SENTINEL_SHAPE              = /^__.*__$/;
const MANAGER_ROLE_LABEL_KEY      = 'admin.users.role.manager';
// t()-miss default (mirrors kind-i18n.js idiom)
const SAFE_FALLBACK               = '—';

function managerRoleLabel(tFn) {
  const label = tFn(MANAGER_ROLE_LABEL_KEY);
  // t() echoes the key back on a miss — never leak the raw i18n key
  return label === MANAGER_ROLE_LABEL_KEY ? ROLE_MANAGER : label;
}

/**
 * resolveSalesRepLabel — token -> human display label.
 * Policy: real value passes through; MANAGER_SENTINEL resolves to the current user's
 * name/email, else the manager role label; any other wrapped token falls back to '—'.
 * Never throws, never returns a `__...__`-wrapped string.
 * @param {string} token
 * @param {{name?: string, email?: string}|null} [currentUser]
 * @param {(key: string) => string} [tFn]
 * @returns {string}
 */
export function resolveSalesRepLabel(token, currentUser = null, tFn = t) {
  if (!token) return '';
  if (!SENTINEL_SHAPE.test(token)) return token; // AC-04: real rep name/prefix passthrough
  if (token === MANAGER_SENTINEL) {
    const name = currentUser?.name || currentUser?.email;
    return name || managerRoleLabel(tFn);
  }
  return SAFE_FALLBACK; // AC-06: unknown __X__ token -> safe fallback, no wrapper
}
