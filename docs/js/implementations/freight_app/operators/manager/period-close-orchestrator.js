// Operator — Period close/reopen logic + pre-close checks. Writes flow through the repo.
//
// F-42-01: "closed" is ONE thing now — a lock record in meta-pref `preferences.locked_periods`,
// the list write-gate.js and Rust's period_lock.rs already enforce (period-lock-registry.js).
// The old localStorage map and the read-by-nobody `shipment.period_locked` flag are gone: they
// were extra copies of a fact, and the copy the UI showed was not the copy the gate obeyed.
// F-42-02: closing balances are stamped on the close record — the opening books of the next
// period (period-opening-balance.js).

import { listShipments } from '../../core_abstractions/ports/shipment-repo.js';
import { lockPeriod, unlockPeriod, findLock, lockedPeriodKeys } from '../../core_abstractions/ports/period-lock-registry.js';
import { snapshotClosingBalances, CLOSING_BALANCES_FIELD } from '../../core_abstractions/ports/period-opening-balance.js';

const PERIOD_CLOSE_KIND     = 'period_close';
const PERIOD_REOPEN_KIND    = 'period_reopen';
const REOPEN_TOKEN_FIELD    = 'reopen_token';
const REASON_MAX_CHARS      = 500;
const CHECK_COST_COVERAGE   = 'cost_coverage';
const CHECK_BILLING_STATUS  = 'billing_status';
const CHECK_OPEN_EXCEPTIONS = 'open_exceptions';
const CHECK_FX_LOCKED       = 'fx_locked';

// ── lock state ────────────────────────────────────────────────────────────────

/**
 * Lock state of a YYYY-MM period, read from the same list the write gate enforces — so the
 * banner cannot say "open" while a write is being refused, or the reverse.
 * @returns {Promise<{locked: boolean, record?: object}>}
 */
export async function getCurrentPeriodLock(repo, period) {
  const record = await findLock(repo, period);
  return record ? { locked: true, record } : { locked: false };
}

/// Period keys currently closed — for the screen's 🔒 markers.
export async function loadClosedPeriods(repo) {
  try { return await lockedPeriodKeys(repo); } catch { return []; }
}

/// Close records (newest first per period is the caller's business) — the ledger reads these
/// for the opening balances stamped at close.
export async function listCloseRecords(repo) {
  try { return await repo.list(PERIOD_CLOSE_KIND, null); } catch { return []; }
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
    listShipments(repo, null),
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
 * Closes a period: takes the write lock, stamps the closing balances, records the event.
 *
 * The lock goes FIRST on purpose. If a later step fails the books are frozen with no close
 * record — recoverable by re-running the close (locking is idempotent) or by reopening. The
 * opposite order fails the other way: a close record everyone trusts over books nobody locked,
 * which is the exact defect F-42-01 exists to remove.
 *
 * @param {object} ledgerRepo  optional — without it the period still closes, but carries no
 *                             opening books; the caller must say so rather than imply success.
 * @returns {Promise<{accountCount:number, failed:string[], skipped:boolean}>} snapshot outcome
 */
export async function closePeriod(repo, period, user, checklistSnapshot, ledgerRepo = null) {
  await lockPeriod(repo, period, user);

  let balances = [];
  let failed   = [];
  let skipped  = true;
  if (ledgerRepo) {
    const accounts = await ledgerRepo.chartOfAccounts();
    ({ balances, failed } = await snapshotClosingBalances(ledgerRepo, accounts, period));
    skipped = false;
  }

  const id  = `pc-${period}-${Date.now()}`;
  await repo.put(PERIOD_CLOSE_KIND, id, {
    id,
    period,
    closed_at:          new Date().toISOString(),
    closed_by:          user,
    checklist_snapshot: checklistSnapshot,
    [CLOSING_BALANCES_FIELD]: balances,
  });

  return { accountCount: balances.length, failed, skipped };
}

// ── reopen ────────────────────────────────────────────────────────────────────

/**
 * Reopens a period: records the event and releases the write lock. Releasing is the point —
 * before F-42-01 this wrote a `period_reopen` row and left the lock in place, so a period the
 * screen showed as reopened still refused every write.
 */
export async function reopenPeriod(repo, period, reason, user) {
  if (!reason || reason.length > REASON_MAX_CHARS) throw new Error('Reason required (max 500 chars)');

  const id    = `pr-${period}-${Date.now()}`;
  const token = crypto.randomUUID?.() || `tok-${Date.now()}`;
  await repo.put(PERIOD_REOPEN_KIND, id, {
    id,
    period,
    reason,
    reopened_at:          new Date().toISOString(),
    reopened_by:          user,
    [REOPEN_TOKEN_FIELD]: token,
  });

  await unlockPeriod(repo, period);
  return { token };
}

export { PERIOD_CLOSE_KIND, PERIOD_REOPEN_KIND, REASON_MAX_CHARS };
