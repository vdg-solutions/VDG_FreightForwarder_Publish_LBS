// ledger-reconciler.js — weekly double-entry balance validator (F-23-06).
// Scans every chart account's {year}.jsonl via the repo's public listLegs (same call
// ledger-viewer.js makes per account), groups legs by entry_id, flags debit/credit mismatches.

const AMOUNT_EPSILON                = 0.005; // half-cent float-rounding tolerance on stored VND amounts
const AUTO_RECONCILE_INTERVAL_DAYS  = 7;
const MS_PER_DAY                    = 24 * 60 * 60 * 1000;

/// AC-01/AC-02: pure — legs already fetched -> per-entry_id { debit_sum, credit_sum }.
export function groupLegsByEntry(legs) {
  const byEntry = new Map();
  for (const leg of legs) {
    const agg = byEntry.get(leg.entry_id) || { debit_sum: 0, credit_sum: 0 };
    agg.debit_sum  += leg.debit  || 0;
    agg.credit_sum += leg.credit || 0;
    byEntry.set(leg.entry_id, agg);
  }
  return byEntry;
}

/// AC-02: entries where |debit_sum - credit_sum| exceeds tolerance -> {entry_id, diff}.
/// diff = debit_sum - credit_sum (positive = more debit posted than credit).
export function findUnbalanced(byEntry) {
  const unbalanced = [];
  for (const [entry_id, { debit_sum, credit_sum }] of byEntry) {
    const diff = debit_sum - credit_sum;
    if (Math.abs(diff) > AMOUNT_EPSILON) unbalanced.push({ entry_id, diff });
  }
  return unbalanced;
}

/// AC-01/AC-02/AC-04: scans every chart account's ledger file for `year`, groups by entry_id,
/// flags mismatches. Empty ledger (no accounts posted yet) is vacuously balanced, not an error.
export async function reconcile(ledgerRepo, year = new Date().getFullYear()) {
  const startedAtMs = Date.now();
  const accounts    = await ledgerRepo.chartOfAccounts();

  let scannedLegs = 0;
  const allLegs   = [];
  for (const account of accounts) {
    const legs = await ledgerRepo.listLegs(year, account.code);
    scannedLegs += legs.length;
    allLegs.push(...legs);
  }

  const byEntry    = groupLegsByEntry(allLegs);
  const unbalanced = findUnbalanced(byEntry);

  return {
    run_at:         new Date().toISOString(),
    scanned_legs:   scannedLegs,
    entry_count:    byEntry.size,
    balanced:       unbalanced.length === 0,
    unbalanced,               // [{entry_id, diff}] — rich, for the UI list (AC-02)
    unbalanced_ids: unbalanced.map((u) => u.entry_id), // compact, matches log schema (AC-03)
    elapsed_ms:     Date.now() - startedAtMs,
  };
}

/// AC-05/AC-06: pure decision — no prior record (or missing run_at) counts as due.
export function isReconcileDue(lastRecord, now = new Date()) {
  if (!lastRecord?.run_at) return true;
  const elapsedMs = now.getTime() - new Date(lastRecord.run_at).getTime();
  return elapsedMs > AUTO_RECONCILE_INTERVAL_DAYS * MS_PER_DAY;
}

/// AC-03: run + persist. Log record is the compact projection — unbalanced_ids, not diff pairs
/// (diff detail is transient, only meaningful in the same-run UI list).
export async function runAndRecord(ledgerRepo, year = new Date().getFullYear()) {
  const result = await reconcile(ledgerRepo, year);
  await ledgerRepo.appendReconciliationRecord({
    run_at:         result.run_at,
    scanned_legs:   result.scanned_legs,
    entry_count:    result.entry_count,
    balanced:       result.balanced,
    unbalanced_ids: result.unbalanced_ids,
    elapsed_ms:     result.elapsed_ms,
  });
  return result;
}

/// AC-05: fire-and-forget entry point for boot — never throws into the caller (repo-init-steps.js
/// calls this unawaited, same shape as sync/dunning-scheduler.js's initDunningScheduler).
export function maybeAutoReconcile(ledgerRepo, year = new Date().getFullYear()) {
  ledgerRepo.getLastReconciliation()
    .then((last) => (isReconcileDue(last) ? runAndRecord(ledgerRepo, year) : null))
    .catch((err) => console.error('[ledger-reconciler] auto-reconcile failed:', err)); // DEV
}
