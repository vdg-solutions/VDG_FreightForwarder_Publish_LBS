// shipment-repo.js — E-37 (F-37-01). One shipment, two records, one API.
//
// A shipment is stored as an envelope in `_shared/shipments` (everyone on the job) and a revenue
// record in the rep's own fork (CS holds nothing there). Callers should not have to know that:
// they ask for a shipment and get whatever the two folders they can actually read add up to.
//
// Which fields belong to which half is decided in Rust (boundary/shipment_split.rs) and reached
// through `shipment_split` / `shipment_join`. A JS-side copy of that list would drift the moment a
// field is added, and the drift would write a sell figure into the folder CS reads.

import { readRevenue, readRevenueFor, revenuePrefixFor, writeRevenue, deleteRevenue }
  from './shipment-revenue-repo.js';
import { recordShipmentChange } from '../sync/shipment-audit.js';
import { assertWritable } from './write-gate.js';

export const KIND_SHIPMENT = 'shipment';

// F-37-02 ops. `state` is separate from `update` because the two are answerable by different
// people: a state change is the FSM acting, an update is somebody typing.
export const OP_SAVE   = 'save';
export const OP_STATE  = 'state';
export const OP_DELETE = 'delete';

function wasm() {
  const w = (globalThis.window || globalThis).__vdg_wasm;
  if (!w?.shipment_split) throw new Error('WASM bridge not ready — shipment split is a contract, not a JS fallback');
  return w;
}

/** Split and write both halves. Throws if a P&L line has no `line_id` — a half that cannot be
 *  rejoined would read as a shipment that earned nothing, so it must not be written at all. */
export async function putShipment(repo, shipment) {
  const ref = shipment.shipment_ref;
  await assertWritable(repo, shipment.etd, KIND_SHIPMENT);
  const before = await priorVersion(() => getShipment(repo, ref));
  const { envelope, revenue } = JSON.parse(wasm().shipment_split(JSON.stringify(shipment)));
  await repo.put(KIND_SHIPMENT, ref, envelope);
  // The revenue half belongs to the REP'S fork, not to whoever is typing — CS initialises most
  // jobs, and a write by kind would land it in theirs. See writeRevenue.
  await writeRevenue(repo, ref, revenue, revenuePrefixFor(shipment));
  auditAgainst(before, shipment, OP_SAVE);
  return { envelope, revenue };
}

/**
 * Write ONLY the operational half — for the updates that change a shipment's state, job no or
 * routing and have no business with money (FSM ingest, the state migrator, void).
 *
 * It still splits, and throws the split away: a caller holding a JOINED shipment would otherwise
 * write the sell figures straight into the folder CS reads. And it deliberately does not touch the
 * revenue record — a state change must never be able to blank a rep's numbers, which is exactly
 * what `putShipment` on an envelope-shaped record would do.
 *
 * Deliberately NOT period-gated (F-20-10): this path is the FSM, the state migrator and void —
 * machinery, not somebody typing. Void of a locked-period shipment is governed by the ledger
 * reversal flow, and blocking migrators on old periods would wedge boot.
 */
export async function putEnvelope(repo, ref, shipmentLike) {
  const before = await priorVersion(() => repo.get(KIND_SHIPMENT, ref));
  const { envelope } = JSON.parse(wasm().shipment_split(JSON.stringify(shipmentLike)));
  await repo.put(KIND_SHIPMENT, ref, envelope);
  // Envelope against envelope: the revenue half of both sides is empty, so this records the state
  // change without claiming the rep's numbers were wiped.
  auditAgainst(before, envelope, OP_STATE);
  return envelope;
}

/** The operational half as stored, with no revenue lookup — for callers that only read routing,
 *  state or job numbers and should not pay a cross-fork read to do it. */
export async function getEnvelope(repo, ref) {
  return repo.get(KIND_SHIPMENT, ref);
}

export async function listEnvelopes(repo, predicate = null) {
  return repo.list(KIND_SHIPMENT, predicate);
}

export async function deleteShipment(repo, ref) {
  // The gate needs the doomed record's own ETD — the caller only hands a ref.
  const doomed = await repo.get(KIND_SHIPMENT, ref).catch(() => null);
  await assertWritable(repo, doomed?.etd, KIND_SHIPMENT);
  const before = await priorVersion(() => getShipment(repo, ref));
  await repo.delete(KIND_SHIPMENT, ref);
  await deleteRevenue(repo, ref).catch(() => { /* the envelope is gone; an orphan half is cleaned by repost */ });
  auditAgainst(before, null, OP_DELETE);
}

/**
 * The version being overwritten, or UNREADABLE.
 *
 * A failed read is not "there was nothing here". Handing null to the differ would write a history
 * saying this user created every field of a job that already existed — a blame trail whose worst
 * failure is being confidently wrong. Absence and inability to tell are different answers, and
 * only the first one is history.
 */
const UNREADABLE = Symbol('prior version unreadable');

async function priorVersion(read) {
  try { return (await read()) || null; }
  catch { return UNREADABLE; }
}

function auditAgainst(before, after, op) {
  if (before === UNREADABLE) {
    console.warn('[shipment-repo] prior version unreadable — change not recorded'); // DEV
    return;
  }
  recordShipmentChange({ before, after, op });
}

/** One shipment, rejoined with whatever revenue this reader can see. A reader with no access to
 *  the rep's fork gets the envelope alone — that is the CS view, and it is a valid shipment. */
export async function getShipment(repo, ref) {
  const envelope = await repo.get(KIND_SHIPMENT, ref);
  if (!envelope) return null;
  const revenue = await readRevenue(repo, ref, revenuePrefixFor(envelope));
  return joinOne(envelope, revenue);
}

export async function listShipments(repo, predicate = null) {
  const envelopes = await repo.list(KIND_SHIPMENT, predicate);
  return joinMany(await readRevenueFor(repo, envelopes), envelopes);
}

/** Exposed for callers that already hold envelopes (grid refresh, delta events). */
export async function joinLoaded(repo, envelopes) {
  return joinMany(await readRevenueFor(repo, envelopes), envelopes);
}

function joinMany(revenueByRef, envelopes) {
  return envelopes.map((env) => joinOne(env, revenueByRef.get(env.shipment_ref) || null));
}

/**
 * Marks whether the sell side of this record was actually READ.
 *
 * F-37-06: the screens are built from what the reader could see, not from their role. Without this
 * flag a CS row is indistinguishable from a rep's row whose margin happens to be zero, and every
 * derived figure — the Lãi/lỗ column above all — quietly computes cost-with-no-revenue and reports
 * that every job lost money. It is a read RECEIPT, not a permission: absent means "nothing came
 * back", which is the same thing whether the folder was never granted or the job truly has no
 * sell side yet.
 */
export const REVENUE_SEEN = '_revenue_seen';

/**
 * NON-ENUMERABLE on purpose. It must not survive `JSON.stringify`, a spread, or `structuredClone`,
 * because it is not part of the record: if it were, the splitter would copy it into the envelope
 * and persist it to `_shared/shipments`, and the blame differ would report `_revenue_seen` as a
 * field somebody changed every time a reader with different access saved the job.
 */
function stampReceipt(record, seen) {
  Object.defineProperty(record, REVENUE_SEEN, { value: seen, enumerable: false, configurable: true });
  return record;
}

/** True when at least one row in a list carries a sell side this reader could read. */
export function anyRevenueVisible(rows) {
  return (rows || []).some((r) => r?.[REVENUE_SEEN]);
}

function joinOne(envelope, revenue) {
  // No revenue record is the CS read, and `join(envelope, None)` returns the envelope byte for
  // byte — so returning it here is the SAME answer, not a JS stand-in for the Rust rule. It
  // matters because it keeps the bridge off the path that has nothing to join: a reader who was
  // never granted the fork should not need wasm to be told there is nothing there.
  if (!revenue) return stampReceipt({ ...envelope }, false);
  return stampReceipt(
    JSON.parse(wasm().shipment_join(JSON.stringify(envelope), JSON.stringify(revenue))), true);
}
