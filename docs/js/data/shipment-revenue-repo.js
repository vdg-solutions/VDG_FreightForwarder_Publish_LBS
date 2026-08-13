// shipment-revenue-repo.js — E-37 (F-37-01). The half of a shipment that CS may not read.
//
// The sell side, commission and sales share live in the REP'S OWN FORK, and that placement IS the
// wall: CS holds no permission on any fork, so for them the file does not exist rather than being
// hidden. See backlog/wiki/shipment-collaboration-model.md §5.
//
// Two read paths, because Drive addresses folders and the repo addresses KINDS:
//   own fork  -> repo.get/list('shipment_revenue'), which brings the whole cache + sync machinery
//   any fork  -> an explicit path read, users/{prefix}/shipment_revenue/*.jsonl
// The second exists because the kind route always resolves to the SIGNED-IN user's fork. Without
// it a manager opening a rep's job looks for the revenue in their own fork, finds none, and the
// screen reports a shipment that made no money — the failure mode being indistinguishable from a
// real zero.

import { emailPrefix } from '../util/email-prefix.js';

// Role-token shape ('__MANAGER__' and kin, sales-rep-i18n.js SENTINEL_SHAPE) — kept as a shape
// test, not an import: this is the data layer and sales-rep-i18n pulls the whole i18n runtime.
const ROLE_SENTINEL_SHAPE = /^__.+__$/;

export const KIND_SHIPMENT_REVENUE = 'shipment_revenue';
const USERS_DIR    = 'users';
const JSONL_SUFFIX = '.jsonl';

// Referencing a bare `window` throws where it does not exist (node, the service worker), and
// these are the modules a background sync would reach first. `globalThis` is always there.
const g = () => globalThis.window || globalThis;

function ioPort() { return g().__vdg_io || null; }

/** The fork a shipment's revenue belongs to. Null when the job has no rep assigned yet — CS opens
 *  the job before the sales rep is named, and that is a normal state, not an error.
 *
 *  The '__MANAGER__' sentinel is a ROLE token, not a fork name (E-40 live find: a manager-created
 *  job carried it into sales_rep_id, and the write guard read it as somebody else's fork —
 *  `users/__manager__/` — refusing the manager's own save). Null here means "the record names no
 *  concrete rep fork": the writer's own session decides, which for the manager typing the figures
 *  is exactly their fork, and a reader with no such record still gets the correct empty answer. */
export function revenuePrefixFor(shipment) {
  const rep = shipment?.sales_rep_id || shipment?.sales_rep || '';
  if (!rep || ROLE_SENTINEL_SHAPE.test(String(rep))) return null;
  return emailPrefix(String(rep));
}

/**
 * The fork a write BY KIND actually lands in.
 *
 * The io port is asked first because it is the thing that decides: `_resolveFolder` builds
 * `users/{prefix}` from the port's own `userEmail`. `__vdg_current_user` is a boot-populated mirror
 * of it and can be absent or stale, and comparing against a mirror is how a check ends up
 * disagreeing with the write it was meant to guard.
 */
function myPrefix() {
  const port = ioPort();
  return emailPrefix(port?.userEmail || '')
      || g().__vdg_current_user?.user_prefix
      || emailPrefix(g().__vdg_current_user?.email || '');
}

function wasm() {
  const w = g().__vdg_wasm;
  if (!w?.shipment_has_revenue) {
    throw new Error('WASM bridge not ready — what counts as revenue is a contract, not a JS fallback');
  }
  return w;
}

/**
 * Write the revenue half — into the fork it BELONGS to, which is the one named by `sales_rep_id`
 * and not the one whose owner happens to be typing.
 *
 * F-37-05, from the owner: **CS is the person who initialises a job.** So this runs under CS more
 * often than under the rep, and a write by kind always lands in the SIGNED-IN user's fork. Left
 * alone it would drop a revenue record into CS's own fork — the wrong fork (the rep looks in theirs
 * and finds nothing, and reads it as a job that earned nothing) and a hole in the wall (revenue
 * sitting exactly where CS can read it).
 *
 * Three cases, and none of them is "write it anyway":
 *   - nothing to write (a CS create has an EMPTY revenue half) -> skip; there is nothing to lose
 *   - it is our own fork -> write
 *   - somebody else's fork, with real figures in it -> THROW
 *
 * The last one is loud on purpose. Writing another fork needs the cross-fork bundle protocol, and
 * until that exists, failing while somebody is watching beats a sell figure silently landing in the
 * wrong folder. A Manager editing a rep's sell side hits this; that is a known limit, not a
 * surprise.
 */
export async function writeRevenue(repo, shipmentRef, revenue, targetPrefix = null) {
  if (!wasm().shipment_has_revenue(JSON.stringify(revenue))) {
    return { written: false, reason: 'nothing-to-write' };
  }
  const mine = myPrefix();
  // No identity to compare against is UNDECIDABLE, not "somebody else". Refusing here would block
  // every write in a context that has no signed-in user, and the write is going to this session's
  // own fork by construction anyway — the port builds the path from its own userEmail.
  if (mine && targetPrefix && targetPrefix !== mine) {
    throw new Error(
      `revenue for ${shipmentRef} belongs to ${targetPrefix}, not ${mine} — writing another fork ` +
      'is not supported yet, and writing it here would hide the money in the wrong folder');
  }
  await repo.put(KIND_SHIPMENT_REVENUE, shipmentRef, { ...revenue, id: shipmentRef });
  return { written: true };
}

export async function deleteRevenue(repo, shipmentRef) {
  await repo.delete(KIND_SHIPMENT_REVENUE, shipmentRef);
}

/**
 * One shipment's revenue record, or null when this reader holds no such file.
 * Null is an ANSWER for CS, not a failure — see readAllRevenueIn's note on error handling.
 */
export async function readRevenue(repo, shipmentRef, prefix) {
  if (!prefix || prefix === myPrefix()) {
    return await repo.get(KIND_SHIPMENT_REVENUE, shipmentRef).catch(() => null);
  }
  const rows = await readAllRevenueIn(prefix);
  return rows.find((r) => r.shipment_ref === shipmentRef || r.id === shipmentRef) || null;
}

/**
 * Every revenue record in one fork, read by explicit path.
 *
 * A missing folder or an unreadable one yields [] — for a reader who was never granted that fork,
 * "no file" is the correct answer and the caller renders a shipment with no revenue panel. The
 * caller must NOT call this when it cannot tell an absence from a failure; that distinction is
 * auth/undecidable.js's job and it belongs at the fetch, not here.
 */
export async function readAllRevenueIn(prefix) {
  const io = ioPort();
  if (!io || !prefix) return [];

  const hit = _forkScans.get(prefix);
  if (hit && Date.now() - hit.at < FORK_SCAN_TTL_MS) return hit.rows;

  const dir = `${USERS_DIR}/${prefix}/${KIND_SHIPMENT_REVENUE}`;
  const listing = await io.ws_list_dir(dir).catch(() => null);
  if (!listing?.files?.length) {
    // An empty answer costs the same listing as a full one, so it is cached too — otherwise a
    // rep with no revenue yet is the WORST case rather than the cheapest.
    _forkScans.set(prefix, { at: Date.now(), rows: [] });
    return [];
  }

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
  _forkScans.set(prefix, { at: Date.now(), rows: out });
  return out;
}

/**
 * A fork's revenue is read as a SET — one directory listing plus one read per bundle — because
 * that is how it is stored. Answering ONE ref that way costs the whole fork, and a loop of saves
 * pays it per record while the fork grows underneath: replaying 50 legacy shipments took a single
 * save to 278 directory listings, 16 seconds and half a gigabyte of heap.
 *
 * So a scan is remembered briefly. The set is remote-owned by construction — this session cannot
 * write another fork (writeRevenue throws on one), so nothing local can invalidate it, and the
 * delta tick is what makes it move. The window is short enough that a screen opened after somebody
 * else's edit still reads it.
 */
const FORK_SCAN_TTL_MS = 5000;
const _forkScans = new Map(); // prefix -> { at, rows }

/** Drops the remembered scans. For the delta path, and for tests that must not inherit one. */
export function clearForkScanCache(prefix = null) {
  if (prefix) _forkScans.delete(prefix);
  else _forkScans.clear();
}

/**
 * Revenue for many shipments at once, keyed by shipment_ref.
 * Groups by fork first so each fork's bundles are read ONCE, not once per shipment — a team report
 * over a few hundred jobs would otherwise fan out into a few hundred Drive round trips.
 */
export async function readRevenueFor(repo, shipments) {
  const byPrefix = new Map();
  for (const s of shipments) {
    const prefix = revenuePrefixFor(s);
    if (!prefix) continue;
    if (!byPrefix.has(prefix)) byPrefix.set(prefix, []);
    byPrefix.get(prefix).push(s);
  }

  const out = new Map();
  const mine = myPrefix();
  for (const [prefix, group] of byPrefix) {
    if (prefix === mine) {
      for (const s of group) {
        const rec = await repo.get(KIND_SHIPMENT_REVENUE, s.shipment_ref).catch(() => null);
        if (rec) out.set(s.shipment_ref, rec);
      }
      continue;
    }
    for (const rec of await readAllRevenueIn(prefix)) {
      const ref = rec.shipment_ref || rec.id;
      if (ref) out.set(ref, rec);
    }
  }
  return out;
}
