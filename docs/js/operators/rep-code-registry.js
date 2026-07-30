// Rep code registry — F-32-01
// Reuses the existing `sales_code` field (already surfaced by users.js/users-modals.js as
// "Mã sales") as the 4-digit rep code namespace for Job No generation. Assigned once at
// onboarding (inviteSales, online context); pre-existing reps backfill lazily via ensureRepCode.
// user_prefix (the storage-path field) is a SEPARATE field and is never touched here.

import { t } from '../i18n/index.js';

const KIND_USER      = 'user';
const REP_CODE_LEN   = 4;
const REP_CODE_START = 1;

export const REP_CODE_REGEX = /^\d{4}$/;

export function isValidRepCode(code) {
  return REP_CODE_REGEX.test(code || '');
}

// repo.list('user', null), take max existing valid 4-digit sales_code among users, +1.
// Online context (inviteSales already does Drive network calls) — a simple read-max+1 is safe.
export async function assignRepCode(repo) {
  if (!repo) return String(REP_CODE_START).padStart(REP_CODE_LEN, '0');
  const users = await repo.list(KIND_USER, null);
  let max = 0;
  for (const u of users) {
    if (isValidRepCode(u.sales_code)) {
      const n = parseInt(u.sales_code, 10);
      if (n > max) max = n;
    }
  }
  return String(max + 1).padStart(REP_CODE_LEN, '0');
}

// Idempotent backfill: if user.sales_code doesn't match REP_CODE_REGEX, assign one + persist.
// Mirrors the existing seed-if-unseeded idiom (ensureShipmentStateAliases) — called lazily at
// first shipment creation so pre-existing reps (non-numeric sales_code, e.g. "quang") upgrade
// without a manual migration script.
export async function ensureRepCode(user, repo) {
  if (isValidRepCode(user.sales_code)) return user.sales_code;
  const code = await assignRepCode(repo);
  await repo.put(KIND_USER, user.id, { ...user, sales_code: code });
  return code;
}

// Validate a manager-submitted sales_code edit: format + uniqueness against other active users.
// Throws (caller surfaces err.message to the UI) — matches editProfile's existing throw style.
export async function assertRepCodeAssignable(code, ownerId, repo) {
  if (!isValidRepCode(code)) {
    throw new Error(t('users.edit.error.sales_code_invalid'));
  }
  const users = await repo.list(KIND_USER, null);
  const taken = users.some((u) => u.id !== ownerId && u.sales_code === code);
  if (taken) {
    throw new Error(t('users.edit.error.sales_code_duplicate'));
  }
}
