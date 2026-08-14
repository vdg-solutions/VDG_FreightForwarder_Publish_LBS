// write-gate.js — the one place a shipment/P&L mutation is allowed or refused (F-20-10/F-20-11).
//
// Two laws meet here, both decided in Rust and only SURFACED in JS:
//   period lock — meta-pref `preferences.locked_periods` (written by period-lock-registry.js:
//                 Close Period and the commission settle flow, F-42-01), membership judged by
//                 wasm `is_period_closed`;
//   license     — `license_status`'s `can_write` (grace = read-only), stamped on
//                 window.__vdg_license_status at boot by license-boot-gate.js.
//
// Both used to be dead bridges: the lock button wrote a list nobody read, and the grace
// classifier had no caller — a banner without a gate is theatre, so the gate came first.

import { t } from '../i18n/index.js';

const KIND_META_PREF   = 'meta-pref';
const PREFS_META_KEY   = 'preferences';
const MONTH_KEY_LEN    = 7; // 'YYYY-MM'

// The meta-pref field the lock registry writes. One name, one owner — the old period-lock-ui.js
// copy (checkPeriodLock) duplicated the wasm law in JS and is deleted, and F-42-01 removed the
// three other places that separately claimed to know whether a period was closed.
export const PREF_LOCKED_PERIODS_KEY = 'locked_periods';

export class PeriodLockedError extends Error {
  constructor(periodKey) {
    super(t('period.locked_error', { k: periodKey }));
    this.name   = 'PeriodLockedError';
    this.period = periodKey;
  }
}

export class LicenseReadOnlyError extends Error {
  constructor(graceDaysLeft) {
    super(t('license.readonly_error', { d: graceDaysLeft }));
    this.name = 'LicenseReadOnlyError';
    this.graceDaysLeft = graceDaysLeft;
  }
}

function _wasm() {
  return (globalThis.window || globalThis).__vdg_wasm;
}

/// Throws when this session may not mutate shipment/P&L data. `etd` is the shipment's ETD
/// (ISO date) — the coordinate the period law judges. A record with no parseable ETD passes
/// the period check (it belongs to no period yet) but still faces the license check.
export async function assertWritable(repo, etd, kind = 'shipment') {
  const lic = (globalThis.window || globalThis).__vdg_license_status;
  if (lic && lic.can_write === false) {
    throw new LicenseReadOnlyError(lic.grace_days_left ?? 0);
  }

  const etdMs = Date.parse(etd ?? '');
  if (Number.isNaN(etdMs)) return;

  const prefs  = await repo.get(KIND_META_PREF, PREFS_META_KEY).catch(() => null);
  const locked = prefs?.[PREF_LOCKED_PERIODS_KEY];
  if (!Array.isArray(locked) || !locked.length) return;

  const wasm = _wasm();
  if (!wasm?.is_period_closed) return; // gate not up yet (boot migrators) — locks bind user flows
  if (wasm.is_period_closed(kind, BigInt(Math.trunc(etdMs)), JSON.stringify(locked))) {
    throw new PeriodLockedError(new Date(etdMs).toISOString().slice(0, MONTH_KEY_LEN));
  }
}
