// ledger-poster.js — shipment/commission -> JournalEntry[], posted via injected LedgerRepo.
// Replaced by WASM (Rust) implementation for strict business rules enforcement and safety.

const DEFAULT_LEDGER_VERSION = 1;
const SOURCE_SHIPMENT   = 'shipment';
const SOURCE_COMMISSION = 'commission';

function getWasm() {
  const wasm = window.__vdg_wasm;
  if (!wasm || !wasm.wasm_build_entries_from_shipment || !wasm.wasm_build_entries_from_commission) {
    throw new Error('WASM module not loaded or ledger_poster functions not found');
  }
  return wasm;
}

export function buildEntriesFromShipment(shipment, chartOfAccounts, postingRules) {
  const wasm = getWasm();
  const rulesPayload = {
    pnl_kind_live: postingRules.pnl_kind_live || {},
    commissions: postingRules.commissions || {}
  };
  return wasm.wasm_build_entries_from_shipment(
    JSON.stringify(shipment),
    JSON.stringify(chartOfAccounts),
    JSON.stringify(rulesPayload)
  );
}

export function buildEntriesFromCommission(commissionEntry, chartOfAccounts, postingRules) {
  const wasm = getWasm();
  const rulesPayload = {
    pnl_kind_live: postingRules.pnl_kind_live || {},
    commissions: postingRules.commissions || {}
  };
  return wasm.wasm_build_entries_from_commission(
    JSON.stringify(commissionEntry),
    JSON.stringify(chartOfAccounts),
    JSON.stringify(rulesPayload)
  );
}

export function validateEntries(entries, chartOfAccounts) {
  // WASM validates entries internally during build, so this is a no-op
  // to maintain backward compatibility with JS callers that expect to call it.
  return;
}

/**
 * postShipment — thin orchestration: fetch chart/rules -> build -> validate -> post for one
 * shipment. No-op (zero appendLeg calls) when the shipment has no postable pnl_lines.
 * Shared by submit-orchestrator.js and pnl-vertical-batch-import.js (both submit paths).
 */
export async function postShipment(shipment, ledgerRepo) {
  if (!ledgerRepo) throw new Error('ledger-poster: ledgerRepo not available');
  const [chart, rules] = await Promise.all([ledgerRepo.chartOfAccounts(), ledgerRepo.postingRules()]);
  const entries = buildEntriesFromShipment(shipment, chart, rules);
  if (!entries.length) return { posted: false, entryIds: [] };
  validateEntries(entries, chart);
  const version = shipment._ledger_version || DEFAULT_LEDGER_VERSION;
  return postJournalEntries(entries, ledgerRepo, `${SOURCE_SHIPMENT}:${shipment.shipment_ref}:v${version}`);
}

/// postCommission — same build -> validate -> post pipeline for one commission_entry record.
export async function postCommission(commissionEntry, ledgerRepo) {
  if (!ledgerRepo) throw new Error('ledger-poster: ledgerRepo not available');
  const [chart, rules] = await Promise.all([ledgerRepo.chartOfAccounts(), ledgerRepo.postingRules()]);
  const entries = buildEntriesFromCommission(commissionEntry, chart, rules);
  if (!entries.length) return { posted: false, entryIds: [] };
  validateEntries(entries, chart);
  const version = commissionEntry._ledger_version || DEFAULT_LEDGER_VERSION;
  return postJournalEntries(entries, ledgerRepo, `${SOURCE_COMMISSION}:${commissionEntry.shipment_ref}:v${version}`);
}

/**
 * postJournalEntries — Phase 2 (I/O, only reached once validateEntries didn't throw):
 * appendLeg for every leg of every entry, then recordPosted. `postedIndex` is the dedup key
 * for this post (e.g. `shipment:<ref>:v<version>`) — isAlreadyPosted/recordPosted key off it
 * so a repost of the same source+version is a no-op without re-appending legs (AC-05).
 */
export async function postJournalEntries(entries, ledgerRepo, postedIndex) {
  if (await ledgerRepo.isAlreadyPosted(postedIndex)) {
    return { posted: false, entryIds: [] };
  }
  const entryIds = [];
  for (const entry of entries) {
    const year = Number((entry.legs[0]?.leg.date || '').slice(0, 4)) || new Date().getFullYear();
    for (const { account_code, leg } of entry.legs) {
      await ledgerRepo.appendLeg(year, account_code, leg);
    }
    entryIds.push(entry.entry_id);
  }
  await ledgerRepo.recordPosted(postedIndex, entryIds);
  return { posted: true, entryIds };
}
