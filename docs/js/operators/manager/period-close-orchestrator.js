// Operator — Period close/reopen logic + pre-close checks. Pure except IDB patch.

import { bulkPatch } from '../../cache/bulk-orchestrator.js';

const PERIOD_CLOSE_KIND     = 'period_close';
const PERIOD_REOPEN_KIND    = 'period_reopen';
const PERIOD_LOCKED_FLAG    = 'period_locked';
const REOPEN_TOKEN_FIELD    = 'reopen_token';
const PERIOD_LOCKS_LS_KEY   = 'vdg.period_locks';
const REASON_MAX_CHARS      = 500;
const CHECK_COST_COVERAGE   = 'cost_coverage';
const CHECK_BILLING_STATUS  = 'billing_status';
const CHECK_OPEN_EXCEPTIONS = 'open_exceptions';
const CHECK_FX_LOCKED       = 'fx_locked';

// ── lock state ────────────────────────────────────────────────────────────────

function _loadLsLocks() {
  try {
    const raw = localStorage.getItem(PERIOD_LOCKS_LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function _saveLsLocks(locks) {
  try { localStorage.setItem(PERIOD_LOCKS_LS_KEY, JSON.stringify(locks)); }
  catch { /* quota — non-fatal */ }
}

/**
 * Returns { locked: boolean, record?: object } for a YYYY-MM period.
 */
export function getCurrentPeriodLock(period) {
  if (!period) return { locked: false };
  const locks = _loadLsLocks();
  const record = locks[period];
  return record ? { locked: true, record } : { locked: false };
}

// ── helpers ───────────────────────────────────────────────────────────────────

function _etdPeriod(etd) {
  if (!etd) return null;
  const d = new Date(etd);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function _shipmentsInPeriod(shipments, period) {
  return shipments.filter((s) => _etdPeriod(s.etd || s.ETD) === period);
}

// ── pre-close checks ──────────────────────────────────────────────────────────

/**
 * @returns {Array<{id:string, label:string, severity:'warn'|'info', failCount:number, failIds:string[]}>}
 */
export async function runPreCloseChecks(repo, period) {
  const [shipments, pnlLines, exceptions] = await Promise.all([
    repo.list('shipment',  null),
    repo.list('pnl_line',  null),
    repo.list('exception', null),
  ]);

  const inPeriod = _shipmentsInPeriod(shipments, period);
  const refSet   = new Set(inPeriod.map((s) => s.shipment_ref || s.ShipmentRef || s.id));

  // Cost coverage
  const noCost = inPeriod.filter((s) => {
    const ref = s.shipment_ref || s.ShipmentRef || s.id;
    return !pnlLines.some((l) => (l.shipment_ref || l.ShipmentRef) === ref);
  });

  // Billing
  const unpaid = inPeriod.filter((s) =>
    s.billing_state === 'Billed' && s.billing_state !== 'Paid');

  // Open exceptions
  const openExc = exceptions.filter((ex) => {
    const ref = ex.shipment_ref || ex.ShipmentRef || '';
    return refSet.has(ref) && ex.state !== 'Closed';
  });

  // FX
  const noFx = inPeriod.filter((s) =>
    s.roe_selling == null && s.ROE_Selling == null);

  return [
    {
      id: CHECK_COST_COVERAGE,
      label: 'Cost coverage',
      severity: 'warn',
      failCount: noCost.length,
      failIds:   noCost.map((s) => s.id),
    },
    {
      id: CHECK_BILLING_STATUS,
      label: 'Billing status (Billed → Paid)',
      severity: 'info',
      failCount: unpaid.length,
      failIds:   unpaid.map((s) => s.id),
    },
    {
      id: CHECK_OPEN_EXCEPTIONS,
      label: 'Open exceptions',
      severity: 'warn',
      failCount: openExc.length,
      failIds:   openExc.map((ex) => ex.id),
    },
    {
      id: CHECK_FX_LOCKED,
      label: 'FX rates locked (ROE)',
      severity: 'warn',
      failCount: noFx.length,
      failIds:   noFx.map((s) => s.id),
    },
  ];
}

// ── close ─────────────────────────────────────────────────────────────────────

/**
 * Closes a period: writes PeriodClose entity, patches shipments, updates localStorage.
 */
export async function closePeriod(repo, db, period, user, checklistSnapshot) {
  const id  = `pc-${period}-${Date.now()}`;
  const rec = {
    id,
    period,
    closed_at:          new Date().toISOString(),
    closed_by:          user,
    checklist_snapshot: checklistSnapshot,
  };

  await repo.put(PERIOD_CLOSE_KIND, id, rec);

  if (db) {
    const shipments = await repo.list('shipment', null);
    const ids       = _shipmentsInPeriod(shipments, period).map((s) => s.id);
    await bulkPatch(db, 'shipment', ids, (e) => ({ ...e, [PERIOD_LOCKED_FLAG]: true }));
    window.dispatchEvent(new CustomEvent('vdg:entity-changed', { detail: { kind: 'shipment' } }));
  }

  const locks    = _loadLsLocks();
  locks[period]  = rec;
  _saveLsLocks(locks);
}

// ── reopen ────────────────────────────────────────────────────────────────────

/**
 * Reopens a period: writes PeriodReopen entity, patches shipments, clears lock.
 */
export async function reopenPeriod(repo, db, period, reason, user) {
  if (!reason || reason.length > REASON_MAX_CHARS) throw new Error('Reason required (max 500 chars)');

  const id    = `pr-${period}-${Date.now()}`;
  const token = crypto.randomUUID?.() || `tok-${Date.now()}`;
  const rec   = {
    id,
    period,
    reason,
    reopened_at:          new Date().toISOString(),
    reopened_by:          user,
    [REOPEN_TOKEN_FIELD]: token,
  };

  await repo.put(PERIOD_REOPEN_KIND, id, rec);

  if (db) {
    const shipments = await repo.list('shipment', null);
    const ids       = _shipmentsInPeriod(shipments, period).map((s) => s.id);
    await bulkPatch(db, 'shipment', ids, (e) => ({ ...e, [PERIOD_LOCKED_FLAG]: false }));
    window.dispatchEvent(new CustomEvent('vdg:entity-changed', { detail: { kind: 'shipment' } }));
  }

  const locks = _loadLsLocks();
  delete locks[period];
  _saveLsLocks(locks);

  return { token };
}

/**
 * Reads L2 period_close records and returns set of locked periods.
 */
export async function loadClosedPeriods(repo) {
  try {
    const records = await repo.list(PERIOD_CLOSE_KIND, null);
    // latest close per period (reopen may cancel; check LS for truth)
    const locks = _loadLsLocks();
    return records
      .filter((r) => !r._deleted && locks[r.period])
      .map((r) => r.period);
  } catch { return []; }
}

export { PERIOD_CLOSE_KIND, PERIOD_REOPEN_KIND, PERIOD_LOCKED_FLAG, REASON_MAX_CHARS };
