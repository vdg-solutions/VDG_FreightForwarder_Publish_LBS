// period-lock-registry.js — the ONE owner of "which periods are closed" (F-42-01).
//
// Owner 2026-08-14: "coi lại logic của đóng kì và mở lại nha, hơi lệch đó, kế toán có kì mà."
// It was worse than lệch: the state existed four times over and the four disagreed.
//   1. localStorage 'vdg.period_locks'  — what the Close Period screen showed (device-local:
//      close on the office PC, still open on the laptop);
//   2. `period_close` records           — written, then filtered BY the localStorage map, so a
//      fresh device saw no closed periods at all;
//   3. `shipment.period_locked`         — bulk-patched onto every shipment in the period and
//      read by NOBODY — a write-amplified flag with no gate behind it;
//   4. meta-pref `preferences.locked_periods` — the ONLY one write-gate.js/Rust actually
//      enforce, and closePeriod never wrote it.
// So "Đóng kỳ" locked nothing, and the commission settle flow — the one writer of #4 — locked
// a period that "Mở lại kỳ" could never unlock.
//
// One representation now: #4, the one the law already reads. Everything else derives from it.
// Greenfield, so no migration off the old localStorage map — it is simply gone.

import { PREF_LOCKED_PERIODS_KEY } from '../../core_abstractions/ports/write-gate.js';
import { PERIOD_KEY_FIELD, LOCKED_AT_FIELD, LOCKED_BY_FIELD } from '../../core_abstractions/ports/period-lock-registry.js';

const KIND_META_PREF = 'meta-pref';
const PREFS_META_KEY = 'preferences';


async function _readPrefs(repo) {
  if (!repo) return {};
  const prefs = await repo.get(KIND_META_PREF, PREFS_META_KEY).catch(() => null);
  return prefs && typeof prefs === 'object' ? prefs : {};
}

function _locksOf(prefs) {
  const list = prefs?.[PREF_LOCKED_PERIODS_KEY];
  return Array.isArray(list) ? list : [];
}

/// Every lock record, verbatim as the Rust law reads them.
async function readLockedPeriods(repo) {
  return _locksOf(await _readPrefs(repo));
}

/// Just the keys — 'YYYY-MM' from the close screen, 'YYYY-Qn' from a quarterly settle.
async function lockedPeriodKeys(repo) {
  return (await readLockedPeriods(repo)).map((l) => l?.[PERIOD_KEY_FIELD]).filter(Boolean);
}

/// The lock record for one period key, or null when it is open.
async function findLock(repo, periodKey) {
  if (!periodKey) return null;
  return (await readLockedPeriods(repo)).find((l) => l?.[PERIOD_KEY_FIELD] === periodKey) || null;
}

/**
 * Locks a period. Idempotent: re-closing an already-closed period keeps the FIRST lock's
 * stamp rather than rewriting who closed it — the second close is not a new accounting event.
 * @returns {Promise<object>} the lock record now in force
 */
async function lockPeriod(repo, periodKey, user) {
  if (!periodKey) throw new Error('period_key required');
  const prefs    = await _readPrefs(repo);
  const existing = _locksOf(prefs).find((l) => l?.[PERIOD_KEY_FIELD] === periodKey);
  if (existing) return existing;

  const record = {
    [PERIOD_KEY_FIELD]: periodKey,
    [LOCKED_AT_FIELD]:  new Date().toISOString(),
    [LOCKED_BY_FIELD]:  user || '',
  };
  // Spread the whole prefs row: this kind holds every workspace preference, and writing a
  // partial object would blank the neighbours.
  await repo.put(KIND_META_PREF, PREFS_META_KEY, {
    ...prefs, [PREF_LOCKED_PERIODS_KEY]: [..._locksOf(prefs), record],
  });
  return record;
}

/**
 * Unlocks a period. Removes EVERY entry for the key, not just the first — a duplicate from an
 * older write path must not survive the reopen and keep the books frozen.
 * @returns {Promise<boolean>} true when something was actually unlocked
 */
async function unlockPeriod(repo, periodKey) {
  const prefs = await _readPrefs(repo);
  const locks = _locksOf(prefs);
  const kept  = locks.filter((l) => l?.[PERIOD_KEY_FIELD] !== periodKey);
  if (kept.length === locks.length) return false;
  await repo.put(KIND_META_PREF, PREFS_META_KEY, { ...prefs, [PREF_LOCKED_PERIODS_KEY]: kept });
  return true;
}

/// The operator, bound behind core_abstractions/ports/period-lock-registry.js by the freight_app bootstrap.
export const periodLockRegistry = { readLockedPeriods, lockedPeriodKeys, findLock, lockPeriod, unlockPeriod };
