// billing-publish-repo.js — E-37 (F-37-05). What publish hands to Accounting, and where it lives.
//
// The owner's question was "khi publish rồi thì kế toán mới được thấy?". That is a claim about
// ACCESS, and `publish_state: 'published'` on the envelope cannot make it true: Accounting is not
// in the reader set of `_shared/shipments` at all, so it sees nothing there whatever the flag says.
// Publishing therefore has to CREATE a record somewhere Accounting is granted.
//
// Where it cannot be: `_shared/billing`. Drive's writer role on a folder implies read of the whole
// folder, so making Sales a maintainer there would let every rep read every other rep's published
// revenue — the exact leak the storage split exists to prevent.
//
// So the snapshot lands in the REP'S OWN FORK, `users/{prefix}/billing_published`, and Accounting
// is granted READ on that ONE subfolder of each fork (protection_table.rs, `users/*/billing_published`).
// Reps hold nothing on each other's forks; Accounting holds nothing on the rest of anyone's.
//
// See backlog/wiki/shipment-collaboration-model.md §6.

import { emailPrefix } from '../../../kernel/core_abstractions/util/email-prefix.js';

export const KIND_BILLING_PUBLISHED = 'billing_published';
const USERS_DIR    = 'users';
const JSONL_SUFFIX = '.jsonl';

const g = () => globalThis.window || globalThis;

function ioPort() { return g().__vdg_io || null; }

function wasm() {
  const w = g().__vdg_wasm;
  if (!w?.shipment_billing_snapshot) {
    throw new Error('WASM bridge not ready — what Accounting may be shown is a contract, not a JS fallback');
  }
  return w;
}

function myPrefix() {
  return g().__vdg_current_user?.user_prefix
      || emailPrefix(g().__vdg_current_user?.email || '');
}

/** The fork a shipment's published snapshots belong to — the same one its revenue is in. */
export function publishPrefixFor(shipment) {
  const rep = shipment?.sales_rep_id || shipment?.sales_rep || '';
  return rep ? emailPrefix(String(rep)) : null;
}

/**
 * Publish: derive the snapshot in Rust and append it as a NEW REVISION.
 *
 * Never an overwrite. An amendment after Accounting has acted must not be able to change the
 * figures an invoice was already raised from — the earlier revision stays readable and the new one
 * says which it supersedes.
 *
 * Throws when the shipment carries no sell side, which is what it looks like when it was read
 * without access to the revenue fork. Publishing that would invoice zero, and a zero invoice is not
 * obviously wrong to anybody downstream.
 */
export async function publishBilling(repo, shipment, { publishedBy, publishedAt } = {}) {
  const prior = await readPublishedFor(repo, shipment);
  const snapshot = JSON.parse(wasm().shipment_billing_snapshot(
    JSON.stringify(shipment),
    JSON.stringify(prior),
    publishedAt || new Date().toISOString(),
    publishedBy || g().__vdg_current_user?.email || 'unknown',
  ));
  await repo.put(KIND_BILLING_PUBLISHED, snapshot.id, snapshot);
  return snapshot;
}

/** Every revision published for one shipment, oldest first. */
export async function readPublishedFor(repo, shipment) {
  const ref    = shipment?.shipment_ref;
  const prefix = publishPrefixFor(shipment);
  if (!ref) return [];
  const rows = (!prefix || prefix === myPrefix())
    ? await repo.list(KIND_BILLING_PUBLISHED, null).catch(() => [])
    : await readPublishedIn(prefix);
  return rows
    .filter((r) => !r._deleted && r.shipment_ref === ref)
    .sort((a, b) => (a.revision || 0) - (b.revision || 0));
}

/** The revision in force, or null when the shipment was never published. */
export async function currentRevision(repo, shipment) {
  const all = await readPublishedFor(repo, shipment);
  return all.length ? all[all.length - 1] : null;
}

/**
 * One fork's published snapshots, by explicit path — the kind route always resolves to the
 * SIGNED-IN user's fork, so Accounting reading it by kind would find its own (empty) folder and
 * report that nobody has published anything.
 *
 * A missing or unreadable folder yields []. For a reader who was never granted that fork, "no file"
 * is the correct answer; a caller that cannot tell an absence from a failure must not call this.
 */
export async function readPublishedIn(prefix) {
  const io = ioPort();
  if (!io || !prefix) return [];
  const dir = `${USERS_DIR}/${prefix}/${KIND_BILLING_PUBLISHED}`;
  const listing = await io.ws_list_dir(dir).catch(() => null);
  if (!listing?.files?.length) return [];

  const out = [];
  for (const file of listing.files) {
    if (!file.name.endsWith(JSONL_SUFFIX)) continue;
    const res = await io.ws_read_file(dir, file.name).catch(() => null);
    if (!res?.found) continue;
    for (const line of String(res.content).split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try { out.push(JSON.parse(trimmed)); }
      catch { /* a half-written line in an append-only bundle — the other rows are still good */ }
    }
  }
  return out;
}
