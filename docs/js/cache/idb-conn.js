// IndexedDB connection lifecycle — memoized open, wedge recovery, bounded concurrency.
//
// Split out of idb-cache.js (350-line cap, same reason idb-schema.js was split) because the
// "connection wedged" story needs real machinery: the connection itself, a gate that keeps the
// boot storm from forming, and a recovery path that turns a wedged connection back into a live one.

import { IDB_DB_NAME, IDB_DB_VERSION, applyUpgrade } from './idb-schema.js';

// A LOCAL IDB read/write is milliseconds. Past the backstop the connection is dead, not slow:
// this is a dead-connection detector, not a network-latency guess.
const OP_TIMEOUT_MS   = 5000;
const OPEN_TIMEOUT_MS = 5000;
// The deadlock trigger is CONCURRENT TRANSACTIONS, not writes specifically. v0.1.91 serialized
// every op and the wedge stopped; v0.1.92 made reads unbounded again to keep the grid responsive
// and the storm came back (reads AND writes timing out). So bound BOTH lanes instead of picking an
// extreme: writes stay strictly serial, reads get a small pool — enough that an open view renders
// without queueing behind a background write's retry, far short of the dozens that deadlock the
// per-origin task runner.
const READ_LANES = 4;
// After a close+reopen+retry still wedges, the origin is deadlocked at the browser level and no
// app-side retry can help. Fail fast for a cooldown instead of spending 15s per op — that spray is
// what pinned the sync overlay open and filled the console.
const BREAKER_COOLDOWN_MS = 30_000;

export class IdbUnavailableError extends Error {
  constructor(msg) { super(msg); this.name = 'IdbUnavailableError'; }
}

// ── connection ────────────────────────────────────────────────────────────────

// Single shared connection. 6 callers + the repo-init retry loop must NOT each open a fresh
// indexedDB connection: concurrent opens of the same DB jam each other (no success/error/blocked
// event fires), the open times out, repo-init retries and opens AGAIN -> worse jam. Memoize so
// exactly one open ever runs; reset on real failure so a later attempt can genuinely retry.
let _dbPromise = null;
let _liveDb    = null;   // the connection _dbPromise currently resolves to

// Drop the memoized (jammed) open so the next openVdgDb() genuinely re-opens. Clears the live
// handle too — leaving it set would keep liveDb() serving the connection we just declared dead.
export function resetVdgDbMemo() { _dbPromise = null; _liveDb = null; }

export function openVdgDb() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    let req;
    try {
      req = indexedDB.open(IDB_DB_NAME, IDB_DB_VERSION);
    } catch (err) {
      _dbPromise = null;
      reject(new IdbUnavailableError(err.message));
      return;
    }
    req.onupgradeneeded = applyUpgrade;
    req.onsuccess = (ev) => { _liveDb = ev.target.result; resolve(_liveDb); };
    req.onerror   = () => { _dbPromise = null; reject(new IdbUnavailableError(req.error?.message || 'IDB open failed')); };
    req.onblocked = () => { _dbPromise = null; reject(new IdbUnavailableError('IDB open blocked')); };
  });
  return _dbPromise;
}

// The handle a caller captured at boot (CachedEntityRepo._db, WasmIoPort.db, window.__vdg_db,
// cash-flow's module _db) is DEAD after a wedge reopen, and none of those holders ever re-read the
// memo. That is why dropping the memo healed nothing before: every later op re-wedged against the
// same corpse, 5s at a time, forever. Always prefer the module's current connection; the passed
// handle is the fallback so unit tests can still inject a mock db.
export function liveDb(db) { return _liveDb || db; }

// A wedged connection must be CLOSED, not merely forgotten — dropping the memo alone leaves the
// dead handle open and invites a second connection alongside it on an already-jammed runner.
//
// Deduped: the read lane can have several ops wedge at once, and letting each null the memo and
// call indexedDB.open() would fire concurrent opens — the exact jam the memo exists to prevent
// ("concurrent opens of the same DB jam each other; no success/error/blocked event fires").
// One recovery runs; every wedged op awaits it and then retries on the same fresh connection.
let _recovering = null;
function reopen(faulted) {
  if (_recovering) return _recovering;
  // Close BOTH the memoized connection and the handle the op actually faulted on — a caller can
  // still be holding a pre-reopen handle, and leaving it open keeps a dead connection on an
  // already-jammed runner.
  const dead = new Set([_liveDb, faulted].filter(Boolean));
  _liveDb    = null;
  _dbPromise = null;
  for (const db of dead) {
    try { db.close?.(); } catch { /* already dead — nothing to release */ }
  }
  // openVdgDb must be bounded here: on a deadlocked per-origin runner the open request fires
  // NEITHER success NOR error (that is the wedge symptom). Unbounded, this would pin every lane
  // slot forever and freeze all queued ops behind it.
  _recovering = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      _dbPromise = null;
      reject(new IdbUnavailableError('IDB reopen timed out — origin still wedged'));
    }, OPEN_TIMEOUT_MS);
    openVdgDb().then(
      (db) => {
        clearTimeout(timer);
        // liveDb() already shields every op routed through here, but re-point the global so any
        // direct window.__vdg_db reader added later starts from the healthy connection too.
        if (typeof window !== 'undefined') window.__vdg_db = db;
        resolve(db);
      },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
  // Clear the moment it settles so a LATER wedge can start a fresh recovery rather than replaying
  // this one's outcome. The catch sink keeps a rejected recovery from surfacing unhandled — every
  // real awaiter already handles it.
  const clear = () => { _recovering = null; };
  _recovering.then(clear, clear);
  _recovering.catch(() => {});
  return _recovering;
}

// ── circuit breaker ───────────────────────────────────────────────────────────

let _breakerUntil = 0;
const breakerOpen = () => Date.now() < _breakerUntil;
// Only a FAILED RECOVERY trips it: one wedge is survivable (that is what reopen is for), but a
// wedge that survives close+reopen is a browser-level deadlock the app cannot retry its way out of.
const tripBreaker = () => { _breakerUntil = Date.now() + BREAKER_COOLDOWN_MS; };
const clearBreaker = () => { _breakerUntil = 0; };

// ── concurrency lanes ─────────────────────────────────────────────────────────

function makeLane(limit) {
  let active = 0;
  const queue = [];
  const pump = () => {
    while (active < limit && queue.length) {
      const { task, resolve, reject } = queue.shift();
      active++;
      // Settles the CALLER's promise either way; the lane itself never rejects, so one failed op
      // can never poison the queue behind it (the old _idbChain.then(op, op) hazard).
      task().then(resolve, reject).finally(() => { active--; pump(); });
    }
  };
  return (task) => new Promise((resolve, reject) => { queue.push({ task, resolve, reject }); pump(); });
}

const _writeLane = makeLane(1);
const _readLane  = makeLane(READ_LANES);

// ── bounded op ────────────────────────────────────────────────────────────────

// executor is (db) => (resolve, reject): it takes the CURRENT handle, because recovery replaces it
// between the first attempt and the retry.
function runOnce(executor, db) {
  return new Promise((resolve, reject) => {
    if (!db) { reject(new IdbUnavailableError('no IDB connection')); return; }
    let settled = false;
    const done = (fn, arg) => { if (!settled) { settled = true; clearTimeout(timer); fn(arg); } };
    const timer = setTimeout(
      () => done(reject, new IdbUnavailableError('IDB op timed out — connection wedged')),
      OP_TIMEOUT_MS,
    );
    try { executor(db)((v) => done(resolve, v), (e) => done(reject, e)); }
    catch (err) { done(reject, err); }
  });
}

// Recoverable = the CONNECTION is bad, so a fresh one may work. A wedge (backstop fired) or a
// closed handle (InvalidStateError — db.transaction() on a closed connection throws synchronously)
// both qualify. A real data error (ConstraintError, QuotaExceededError…) does not: it would fail
// identically on any connection and must surface to the caller unchanged.
function isConnectionFault(err) {
  return err instanceof IdbUnavailableError || err?.name === 'InvalidStateError';
}

async function runWithRecovery(executor, db) {
  if (breakerOpen()) throw new IdbUnavailableError('IDB unavailable — connection wedged, cooling down');
  const attempted = liveDb(db);
  try {
    const value = await runOnce(executor, attempted);
    clearBreaker();
    return value;
  } catch (err) {
    if (!isConnectionFault(err)) throw err;
    let fresh;
    try {
      fresh = await reopen(attempted);
    } catch {
      tripBreaker();
      throw err;
    }
    try {
      const value = await runOnce(executor, fresh);
      clearBreaker();
      return value;
    } catch (retryErr) {
      tripBreaker();
      // Awaited writes surface through safeAwait, but a fire-and-forget write (background pull,
      // delta-poll cache write) has no caller to report it — never let that fail silently.
      console.warn('[idb] op failed after reopen:', retryErr?.message || retryErr); // DEV
      throw retryErr;
    }
  }
}

// Run one bounded, gated IDB op. `write: true` takes the serial lane; reads take the pooled lane.
export function boundedOp(executor, { write = false, db = null } = {}) {
  const lane = write ? _writeLane : _readLane;
  const run  = lane(() => runWithRecovery(executor, db));
  // Fire-and-forget writes (background pull, delta-poll cache writes) have no caller to await them,
  // so a failure would land as an unhandledRejection storm. Attaching a sink marks it handled; the
  // caller still gets the rejection because `run` — not the sink's derived promise — is returned,
  // and runWithRecovery already logged it.
  run.catch(() => {});
  return run;
}

// Test hook: drop the breaker + connection state so cases don't leak into each other.
export function __resetIdbGuards() {
  _breakerUntil = 0;
  _dbPromise    = null;
  _liveDb       = null;
  _recovering   = null;
}
