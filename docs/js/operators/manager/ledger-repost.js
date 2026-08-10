// ledger-repost.js — F-29-24: idempotent, manager-triggered stale-ledger-leg repost.
// Re-derives legs from the CURRENT (already-VND) source via the reused Rust poster
// (build_entries_from_commission/shipment), diffs them against persisted legs, and replaces
// only the ones that diverge. Pure diff / I/O split mirrors ledger-reconciler.js.

import { buildEntriesFromCommission, buildEntriesFromShipment } from '../ledger-poster.js';

const AMOUNT_EPSILON = 0.005; // half-cent float-rounding tolerance, mirrors ledger-reconciler.js
// Distinguishes a purge record from a repost run in the shared repost-log.jsonl.
const PURGE_ACTION   = 'purge_orphans';

// D2: these carry i18n KEYS (ledger.repost.reason.*), not literal English — the view
// (ledger-repost-panel.js) translates at render time. A raw diagnostic string (e.g. a thrown
// err.message, or the dynamic "no posting rule matched" message below) is NOT one of these keys
// — reasonRowHtml in the panel detects that and swaps in the shared
// ledger.repost.reason.other label, keeping the raw text only in the row's title="" attribute.
const REASON_NO_LIVE_SOURCE        = 'ledger.repost.reason.no_live_source';
const REASON_UNRESOLVED_STRUCTURE  = 'ledger.repost.reason.unresolved_structure';
const REASON_ACCOUNT_CHANGED       = 'ledger.repost.reason.account_changed';
const REASON_UNDERIVABLE_DEFAULT   = 'ledger.repost.reason.underivable_default';

function setsDiffer(a, b) {
  if (a.size !== b.size) return true;
  for (const v of a) if (!b.has(v)) return true;
  return false;
}

/// AC-01/05: re-run the Rust poster over every LIVE commission_entry/shipment record. Pure given
/// its inputs (the wasm bridge call is deterministic) — no I/O, no writes. Empty-array result is
/// legitimate/no-op for a shipment (mirrors postShipment's own no-postable-lines no-op) but is
/// treated as un-derivable for a commission (AC-05's literal example: kind has no posting rule).
export function buildExpectedEntries(commissionEntries, shipments, chart, rules) {
  const expectedByEntryId = new Map();
  const attempts = new Map();

  for (const c of commissionEntries) {
    const key = `commission:${c.shipment_ref}`;
    let entries;
    try {
      entries = buildEntriesFromCommission(c, chart, rules);
    } catch (err) {
      attempts.set(key, { ok: false, reason: err.message });
      continue;
    }
    if (!entries.length) {
      attempts.set(key, { ok: false, reason: `no posting rule matched for kind "${c.kind}"` });
      continue;
    }
    attempts.set(key, { ok: true, reason: null });
    for (const entry of entries) expectedByEntryId.set(entry.entry_id, entry);
  }

  for (const s of shipments) {
    const key = `shipment:${s.shipment_ref}`;
    let entries;
    try {
      entries = buildEntriesFromShipment(s, chart, rules);
    } catch (err) {
      attempts.set(key, { ok: false, reason: err.message });
      continue;
    }
    attempts.set(key, { ok: true, reason: null }); // empty pnl_lines is a legitimate non-error state
    for (const entry of entries) expectedByEntryId.set(entry.entry_id, entry);
  }

  return { expectedByEntryId, attempts };
}

/// I/O: same chartOfAccounts x listLegs(year, code) cross-product as ledger-reconciler.js::reconcile,
/// but keeps account_code attached per leg (the persisted Leg carries none itself) and returns raw
/// legs, not sums — replaceLeg needs the exact leg + which account file it lives in.
export async function scanPersistedLegs(ledgerRepo, year) {
  const accounts = await ledgerRepo.chartOfAccounts();
  const byEntry  = new Map(); // entry_id -> [{acc_code, leg}]
  for (const account of accounts) {
    const legs = await ledgerRepo.listLegs(year, account.code);
    for (const leg of legs) {
      const arr = byEntry.get(leg.entry_id) || [];
      arr.push({ acc_code: account.code, leg });
      byEntry.set(leg.entry_id, arr);
    }
  }
  return byEntry;
}

/// AC-01/02/05/06/07: pure plan — no I/O, no writes. Classifies every PERSISTED entry_id into
/// exactly one bucket. This is the function the AC-04 spy test calls directly.
export function diffEntries(expectedByEntryId, persistedByEntryId, commissionEntries, shipments, attempts) {
  const replacements   = [];
  const flagged        = [];
  const orphans        = [];
  let unchanged_count   = 0;

  for (const [entry_id, persistedLegs] of persistedByEntryId) {
    const expected = expectedByEntryId.get(entry_id);
    if (!expected) {
      const { type, id } = persistedLegs[0].leg.source;
      const exists = type === 'shipment'
        ? shipments.some((s) => s.shipment_ref === id)
        : commissionEntries.some((c) => c.shipment_ref === id);
      if (exists) {
        const reason = attempts.get(`${type}:${id}`)?.reason ?? REASON_UNDERIVABLE_DEFAULT;
        flagged.push({ entry_id, source: { type, id }, reason });
      } else {
        orphans.push({ entry_id, source: { type, id }, reason: REASON_NO_LIVE_SOURCE });
      }
      continue;
    }

    const persistedIdx = new Set(persistedLegs.map((p) => p.leg.leg_idx));
    const expectedIdx  = new Set(expected.legs.map((e) => e.leg.leg_idx));
    if (setsDiffer(persistedIdx, expectedIdx)) {
      flagged.push({ entry_id, source: persistedLegs[0].leg.source, reason: REASON_UNRESOLVED_STRUCTURE });
      continue;
    }

    // Collect into locals first — an account-code change flags the WHOLE entry, discarding
    // any replacements already found for its other legs (design.md "break entry").
    let accountChangedLeg = null;
    const localReplacements = [];
    let localUnchanged = 0;
    for (const p of persistedLegs) {
      const e = expected.legs.find((x) => x.leg.leg_idx === p.leg.leg_idx);
      if (e.account_code !== p.acc_code) { accountChangedLeg = p; break; }
      const debitDiff  = Math.abs((e.leg.debit  || 0) - (p.leg.debit  || 0));
      const creditDiff = Math.abs((e.leg.credit || 0) - (p.leg.credit || 0));
      if (debitDiff > AMOUNT_EPSILON || creditDiff > AMOUNT_EPSILON) {
        localReplacements.push({
          entry_id, leg_idx: p.leg.leg_idx, acc_code: e.account_code,
          before: { debit: p.leg.debit, credit: p.leg.credit },
          after:  { debit: e.leg.debit, credit: e.leg.credit },
          full_leg: e.leg,
        });
      } else {
        localUnchanged++;
      }
    }
    if (accountChangedLeg) {
      flagged.push({ entry_id, source: accountChangedLeg.leg.source, reason: REASON_ACCOUNT_CHANGED });
      continue;
    }
    replacements.push(...localReplacements);
    unchanged_count += localUnchanged;
  }

  return { replacements, unchanged_count, flagged, orphans };
}

/// AC-04: READ-ONLY preview. Zero ledgerRepo writes — fetches, re-derives, scans, diffs, returns.
export async function planRepost(entityRepo, ledgerRepo, year = new Date().getFullYear()) {
  const [chart, rules, commissionEntries, shipments] = await Promise.all([
    ledgerRepo.chartOfAccounts(), ledgerRepo.postingRules(),
    entityRepo.list('commission_entry'), entityRepo.list('shipment'),
  ]);
  const { expectedByEntryId, attempts } = buildExpectedEntries(commissionEntries, shipments, chart, rules);
  const persistedByEntryId = await scanPersistedLegs(ledgerRepo, year);
  return diffEntries(expectedByEntryId, persistedByEntryId, commissionEntries, shipments, attempts);
}

/// AC-01/03/06: WRITE phase, only reached from an explicit manager apply action. Replays
/// plan.replacements through replaceLeg, then persists one audit record (always, even replaced:0).
export async function applyRepost(ledgerRepo, plan) {
  for (const r of plan.replacements) {
    const year = Number(r.full_leg.date.slice(0, 4));
    await ledgerRepo.replaceLeg(year, r.acc_code, r.full_leg);
  }

  const record = {
    run_at:         new Date().toISOString(),
    scanned:        plan.replacements.length + plan.unchanged_count + plan.flagged.length + plan.orphans.length,
    replaced:       plan.replacements.length,
    left_unchanged: plan.unchanged_count,
    flagged:        plan.flagged.length,
    orphans:        plan.orphans.length,
    changes:        plan.replacements.map(({ entry_id, leg_idx, acc_code, before, after }) => ({ entry_id, leg_idx, acc_code, before, after })),
  };
  await ledgerRepo.appendRepostRecord(record);
  return record;
}

/// Clears the orphans a plan found: entries whose source shipment/commission no longer exists, so
/// they document nothing and no reversal can be derived for them. Only `plan.orphans` is touched —
/// `flagged` entries still HAVE a live source and are a repost problem, never a delete one.
///
/// Per-orphan failures are collected rather than thrown: one locked account file must not strand
/// the rest, and the audit record has to say what actually happened.
/// `year` must be the one the plan was built for — planRepost scans a single year, so its orphan
/// list only means anything against that same year's account files.
export async function purgeOrphans(ledgerRepo, plan, year = new Date().getFullYear()) {
  const purged = [];
  const failed = [];
  for (const orphan of plan.orphans) {
    try {
      const removed = await ledgerRepo.removeEntry(year, orphan.entry_id);
      purged.push({ entry_id: orphan.entry_id, source: orphan.source, legs_removed: Number(removed) || 0 });
    } catch (err) {
      failed.push({ entry_id: orphan.entry_id, error: err.message });
    }
  }

  const record = {
    run_at:      new Date().toISOString(),
    action:      PURGE_ACTION,
    year,
    orphans_found: plan.orphans.length,
    purged:      purged.length,
    failed:      failed.length,
    entries:     purged,
    failures:    failed,
  };
  await ledgerRepo.appendRepostRecord(record);
  return record;
}

/// Manager-button entry point — plan then apply in one call. NEVER imported by boot/repo-init-steps.js.
export async function runRepost(entityRepo, ledgerRepo, year = new Date().getFullYear()) {
  const plan = await planRepost(entityRepo, ledgerRepo, year);
  return applyRepost(ledgerRepo, plan);
}
