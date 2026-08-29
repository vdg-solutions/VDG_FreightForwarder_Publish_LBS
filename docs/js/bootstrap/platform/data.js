// platform/data.js — extra platform methods the Rust data use-cases import (js_data.rs extern type).
//
// A shipment lives in TWO folders and only one of them is reachable by kind: the kind route always
// resolves to the SIGNED-IN user's fork, so a manager opening a rep's job has to read
// `users/{prefix}/…` by PATH. That path read is the adapter's whole job here — which folder, and
// what counts as revenue, are decided in Rust.

// The two audit trails, by kind. They are named here rather than imported because this is the
// adapter that talks to the browser's audit log object; the routing decision is Rust's.
const AUDIT_STORE_REVENUE = 'revenue_audit_log';
const JSONL_SUFFIX = '.jsonl';

// dir -> { at, bodies }. Remembering a scan is an I/O concern: the SET is remote-owned (this
// session cannot write another fork), so nothing local can invalidate it, and Rust says how long
// a scan may be reused — 0 means read through.
const _scans = new Map();

function ioPort() {
  return window.__vdg_io || null;
}

// A caught ws_list_dir/ws_read_file failure must not collapse to "this fork holds nothing" the way
// `.catch(() => null)` used to — a manager/CS reading a REP's fork is exactly the read Cedar's
// per-role policy can now 403 (an answer: no such fork for this reader) or fail for real reasons
// (401/429/5xx/transport: cannot tell). The rule is decided once, in Rust, by status — see
// freight::core_abstractions::read_verdict — never re-derived here from the error's shape.
function isAnsweredStatus(status) {
  const wasm = window.__vdg_wasm;
  if (!wasm?.governance_classify_read_status) return false; // cannot ask — undecidable by default
  return wasm.governance_classify_read_status({ status: status ?? null }).decided;
}

async function readForkBundles(dir) {
  const io = ioPort();
  if (!io) return [];
  let listing;
  try {
    listing = await io.ws_list_dir(dir);
  } catch (err) {
    if (isAnsweredStatus(err?.status)) return []; // never granted this fork — a real absence
    throw err; // cannot tell — must not read as "this rep's job earned nothing"
  }
  if (!listing?.files?.length) return [];
  const bodies = [];
  for (const file of listing.files) {
    if (!file.name.endsWith(JSONL_SUFFIX)) continue;
    // F-58-02 follow-up: this is one ws_read_file per bundle file in the fork — the same
    // per-record fan-out shape the 2026-08-25 incident was made of, just reachable from a foreign-
    // fork scan instead of a mis-read cursor. This loop never re-enters Rust between files, so it
    // cannot go through SyncDeltaOperator's rate_gate() the normal way; network_rate_check
    // (wasm_repo_sync.rs) checks in against that SAME shared budget instead of a second one.
    // Optional-chained: pre-boot, __vdg_repo is not wired yet and there is nothing to guard.
    try {
      window.__vdg_repo?.network_rate_check();
    } catch {
      break; // budget spent — stop asking rather than keep fanning out
    }
    let res;
    try {
      res = await io.ws_read_file(dir, file.name);
    } catch (err) {
      if (isAnsweredStatus(err?.status)) continue; // this file's own refusal, not a fork-wide signal
      throw err;
    }
    if (!res?.found) continue;
    bodies.push(String(res.content));
  }
  return bodies;
}

export const dataPlatform = {
  /// Every *.jsonl body in one fork folder. A folder this reader was never granted (403/404)
  /// yields [] — "no file" is the correct answer. A folder that could not be READ (401/429/5xx/
  /// transport) throws instead of yielding [] — see readForkBundles/isAnsweredStatus above.
  data_fork_read_jsonl: async (dir, ttlMs) => {
    const hit = _scans.get(dir);
    if (ttlMs > 0 && hit && Date.now() - hit.at < ttlMs) return hit.bodies;
    const bodies = await readForkBundles(dir);
    // An empty answer costs the same listing as a full one, so it is remembered too — otherwise a
    // rep with no revenue yet is the WORST case rather than the cheapest.
    if (ttlMs > 0) _scans.set(dir, { at: Date.now(), bodies });
    return bodies;
  },

  data_clear_fork_scan: async (prefix) => {
    if (!prefix) { _scans.clear(); return; }
    for (const dir of [..._scans.keys()]) {
      if (dir.startsWith(`users/${prefix}/`)) _scans.delete(dir);
    }
  },

  /// The identity the fork paths are actually built from — `_resolveFolder` builds `users/{prefix}`
  /// from the io port's own userEmail, and a mirror of it can be stale.
  data_io_user_email: async () => ioPort()?.userEmail || '',

  /// The licence claim the boot gate stamped; null when it has not run.
  data_license_status: async () => window.__vdg_license_status ?? null,

  /// Append one shipment change list to the trail its readers already hold.
  data_audit_append: async (store, kind, entityId, op, body, changes) => {
    const log = window.__vdg_audit_log;
    if (!log) return false;
    if (store === AUDIT_STORE_REVENUE) log.appendRevenue(kind, entityId, op, body, changes);
    else log.append(kind, entityId, op, body, changes);
    return true;
  },
};
