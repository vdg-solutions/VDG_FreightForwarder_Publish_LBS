// store-client.js — MAIN-THREAD client for the SQLite/OPFS engine (replaces the IndexedDB stack).
//
// The engine + ALL storage logic run in Rust/wasm inside store-worker.js (a dedicated module
// Worker) because the OPFS SAH Pool VFS needs createSyncAccessHandle, which is worker-only — and
// those handles are EXCLUSIVE per context: with one engine per tab, only the FIRST tab gets the
// database; every later tab dies at install (NoModificationAllowedError — 2-tab CDP repro) and
// looks like a blank machine (login screen again, views timing out, "đang đồng bộ" forever).
// (SharedWorker routing is not an option — Chromium's SharedWorkerGlobalScope has no nested
// Worker, CDP-proven "Worker is not defined".)
//
// So tabs share ONE engine by leader election: the tab holding the 'vdg-sqlite-leader' Web Lock
// spawns the engine worker; every other tab relays its ops to the leader over a BroadcastChannel.
// The lock releases when the leader tab closes and the next waiter takes over (sahpool handles are
// freed with the dead tab, so the new leader's install succeeds). This module stays a thin async
// client: correlate requests by rid, bound each op so a dead engine rejects instead of hanging,
// and expose the store surface the Rust IO port (StoreIoPort) + window.__vdg_store consumers call. There is NO SQL here — every
// query lives in Rust (data_repo/sqlite_store.rs). The worker's single message loop serializes every
// statement → the IndexedDB concurrent-transaction wedge class is gone by construction.
//
// Drive stays the source of truth (JSONL bundles); SQLite is the local materialized cache + query
// engine. See backlog/wiki/sqlite-opfs-migration.md.

// First op pays the cold cost (module fetch + wasm compile + VFS install); give it room. Every later
// op is a local SQL call in Rust — milliseconds — so a short backstop is a dead-worker detector.
const INIT_TIMEOUT_MS = 20_000;
const OP_TIMEOUT_MS    = 5_000;

export class SqliteUnavailableError extends Error {
  constructor(msg) { super(msg); this.name = 'SqliteUnavailableError'; }
}

const BUS_NAME    = 'vdg-sqlite-bus';
const LEADER_LOCK = 'vdg-sqlite-leader';
const RID_SEP     = '|'; // engine rid = `${tabId}|${localRid}` so concurrent tabs never collide

let _bus      = null;              // BroadcastChannel to the other tabs; null until first op
let _tabId    = null;
let _isLeader = false;             // this tab holds the Web Lock and owns the engine worker
let _engine   = null;              // dedicated engine worker (leader only)
let _ready    = null;              // open handshake promise; null until first ensureReady()
let _seq      = 0;
const _pending = new Map();        // local rid -> { resolve, reject, timer, msg }
let _injected  = null;             // test seam: a fake store (no worker) so unit tests run without OPFS

// rid = request-correlation id, deliberately NOT `id`: an op's payload carries the entity `id`
// (put/get/delete), so a bare `id` field would clobber the correlation key and every such op
// would hang unmatched. rid namespaces the transport apart from the payload.
function _deliver(payload) {
  const { rid, ok, result, err } = payload || {};
  const p = _pending.get(rid);
  if (!p) return;
  _pending.delete(rid);
  clearTimeout(p.timer);
  if (ok) p.resolve(result);
  else    p.reject(new SqliteUnavailableError(err || 'sqlite worker error'));
}

function _spawnEngine() {
  _engine = new Worker(new URL('./store-worker.js', import.meta.url), { type: 'module' });
  _engine.onmessage = (ev) => {
    const { rid, ok, result, err } = ev.data || {};
    const sep  = String(rid).indexOf(RID_SEP);
    const tab  = String(rid).slice(0, sep);
    const orig = Number(String(rid).slice(sep + 1));
    const payload = { rid: orig, ok, result, err };
    if (tab === _tabId) _deliver(payload);
    else _bus.postMessage({ t: 'res', tab, m: payload });
  };
  // An engine crash must fail every local in-flight op and drop the handle so the next call
  // respawns (leadership is kept — the lock is still held). Remote tabs' in-flight ops settle
  // via their own client-side timers.
  _engine.onerror = (e) => {
    const dead = new SqliteUnavailableError('sqlite worker crashed: ' + (e?.message || 'unknown'));
    for (const [, p] of _pending) { clearTimeout(p.timer); p.reject(dead); }
    _pending.clear();
    _engine = null;
    _ready  = null;
  };
}

function _forwardToEngine(tab, msg) {
  if (!_engine) _spawnEngine();
  _engine.postMessage({ ...msg, rid: `${tab}${RID_SEP}${msg.rid}` });
}

function _dispatch(msg) {
  if (_isLeader) _forwardToEngine(_tabId, msg);
  else _bus.postMessage({ t: 'req', tab: _tabId, m: msg });
}

// Ops sent before any leader existed were dropped on the bus — re-dispatch everything still
// in flight once a leader (this tab or another) announces. Double delivery is safe: puts are
// idempotent upserts, reads are pure.
function _resendPending() {
  for (const [, p] of _pending) _dispatch(p.msg);
}

function ensureTransport() {
  if (_bus) return;
  _tabId = 't' + Math.random().toString(36).slice(2, 10);
  _bus = new BroadcastChannel(BUS_NAME);
  _bus.onmessage = (ev) => {
    const m = ev.data || {};
    if (m.t === 'req' && _isLeader)            _forwardToEngine(m.tab, m.m);
    else if (m.t === 'res' && m.tab === _tabId) _deliver(m.m);
    else if (m.t === 'leader' && !_isLeader)    _resendPending();
  };
  if (navigator.locks?.request) {
    // Held for the tab's whole life; on tab close the next waiter is granted and takes over
    // (the dead tab's sahpool handles are freed with it, so the new leader's install succeeds).
    navigator.locks.request(LEADER_LOCK, () => {
      _isLeader = true;
      _resendPending();                    // flush ops queued before the election settled
      _bus.postMessage({ t: 'leader' });
      return new Promise(() => { /* hold leadership until the tab dies */ });
    }).catch(() => { /* Web Locks failure — degrade to per-tab engine below */ _isLeader = true; });
  } else {
    _isLeader = true; // no Web Locks API — single-engine guarantee unavailable, per-tab engine
  }
}

function send(op, extra, timeoutMs) {
  ensureTransport();
  const rid = ++_seq;
  // rid first, then op/extra: extra may carry an entity `id` — it must never overwrite `rid`.
  const msg = { rid, op, ...extra };
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      _pending.delete(rid);
      reject(new SqliteUnavailableError(op + ' timed out — sqlite worker unresponsive'));
    }, timeoutMs);
    _pending.set(rid, { resolve, reject, timer, msg });
    _dispatch(msg);
  });
}

// One open handshake, shared by every caller. A failed open clears the memo so a later op retries.
function ensureReady() {
  ensureTransport();
  if (!_ready) _ready = send('init', {}, INIT_TIMEOUT_MS).catch((e) => { _ready = null; throw e; });
  return _ready;
}

async function op(name, extra) {
  await ensureReady();
  return send(name, extra, OP_TIMEOUT_MS);
}

// ── store surface — thin transport to the Rust worker; the Rust side owns all SQL + schema ────────
// Method names are the Rust IO-port contract (idb_*) + the on-demand consumer contract; identical to
// the old JS store's signatures so StoreIoPort and window.__vdg_store callers are untouched.
export const sqliteStore = {
  cache_get:  (kind, id)       => (_injected ? _injected.cache_get(kind, id)       : op('get',    { kind, id })),
  cache_list: (kind)           => (_injected ? _injected.cache_list(kind)          : op('list',   { kind })),
  cache_put:  (kind, id, body) => (_injected ? _injected.cache_put(kind, id, body) : op('put',    { kind, id, body })),
  cache_delete: (kind, id)     => (_injected ? _injected.cache_delete(kind, id)    : op('delete', { kind, id })),
  cache_get_meta: (key)        => (_injected ? _injected.cache_get_meta(key)       : op('getMeta',    { key })),
  cache_put_meta: (key, body)  => (_injected ? _injected.cache_put_meta(key, body) : op('putMeta',    { key, body })),
  cache_delete_meta: (key)     => (_injected ? _injected.cache_delete_meta(key)    : op('deleteMeta', { key })),
  cache_get_wma: (key)         => (_injected ? _injected.cache_get_wma(key)        : op('getWma',     { key })),
  cache_put_wma: (key, body)   => (_injected ? _injected.cache_put_wma(key, body)  : op('putWma',     { key, body })),
  cache_list_notifications: () => (_injected ? _injected.cache_list_notifications() : op('listNotifications', {})),
  cache_put_notification: (n)  => (_injected ? _injected.cache_put_notification(n) : op('putNotification', { body: n })),
};

// auth-gate cold-boot entity count (was sqlSelectValue('SELECT count(*) …')). Rust owns the query.
export function sqlCountEntities() {
  return _injected ? _injected.count_entities() : op('countEntities', {});
}

// Drop the engine + memo so the next call respawns (mirrors resetVdgDbMemo). Leadership (the Web
// Lock) is kept — only the engine worker restarts.
export function resetVdgSqliteMemo() {
  if (_engine) { try { _engine.terminate(); } catch { /* already gone */ } }
  _engine = null;
  _ready  = null;
  for (const [, p] of _pending) { clearTimeout(p.timer); p.reject(new SqliteUnavailableError('sqlite reset')); }
  _pending.clear();
}

// Test seam: inject a synchronous fake store (no worker) so unit tests run without OPFS.
export function _setSqliteStore(fake) { _injected = fake; }
