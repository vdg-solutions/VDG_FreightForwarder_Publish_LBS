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
// query lives in Rust (store/implementations/sqlite/store.rs). The worker's single message loop serializes every
// statement → the IndexedDB concurrent-transaction wedge class is gone by construction.
//
// CharterDB (vdg-server) stays the source of truth; SQLite is the local materialized cache + query
// engine. See backlog/wiki/archive/sqlite-opfs-migration.md (archived), client-server-pivot.md.

// First op pays the cold cost (module fetch + wasm compile + VFS install); give it room. Every later
// op is a local SQL call in Rust — milliseconds — so a short backstop is a dead-worker detector.
const INIT_TIMEOUT_MS = 20_000;
const OP_TIMEOUT_MS    = 5_000;

export class SqliteUnavailableError extends Error {
  constructor(msg) { super(msg); this.name = 'SqliteUnavailableError'; }
}

// OPFS sahpool handles are exclusive per context. sahpool-genuine-conflict is Rust's own
// classification (sahpool_lock_policy.rs): the retry budget was exhausted with NO Web Locks
// exclusivity guarantee, so a live second tab is a real possibility — the only case this message
// is honest. A raw NoModificationAllowedError is kept as a belt-and-suspenders match for whatever
// slips past Rust unclassified (a browser DOMException surfacing untranslated).
const LOCKED_ERR_RE = /sahpool-genuine-conflict|NoModificationAllowedError/i;
let _lockedAnnounced = false;
function _announceLockedIf(errMsg) {
  if (_lockedAnnounced || !errMsg || !LOCKED_ERR_RE.test(String(errMsg))) return;
  _lockedAnnounced = true;
  window.dispatchEvent(new CustomEvent('vdg:store-locked', { detail: { kind: 'genuine-conflict', reason: String(errMsg) } }));
}

const BUS_NAME    = 'vdg-sqlite-bus';
const LEADER_LOCK = 'vdg-sqlite-leader';
const RID_SEP     = '|'; // engine rid = `${tabId}|${localRid}` so concurrent tabs never collide

// #18: the bus, the leader lock and the database are all per-account. They used to be origin-wide,
// so two accounts open in one browser shared ONE engine over ONE database — account B read account
// A's cached rows, and B's ops were relayed to a leader tab signed in as A.
const SCOPE_MAX_LEN = 64;
let _scope = null;

export function storeScopeKey(email) {
  return String(email || '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SCOPE_MAX_LEN);
}

// Called as soon as an identity is established, before any store op. First call wins; a genuine
// account switch happens only across a reload (signOut reloads), so a differing key mid-life is a
// wiring bug and must fail loudly rather than serve another account's data.
function setStoreScope(email) {
  const key = storeScopeKey(email);
  if (!key) throw new SqliteUnavailableError('store scope requires a signed-in account');
  if (_scope && _scope !== key) {
    throw new SqliteUnavailableError(`store scope changed (${_scope} → ${key}) — reload required`);
  }
  _scope = key;
}

// #19: a leader tab that Chrome froze or discarded still HOLDS the Web Lock and never drains the
// BroadcastChannel, so followers starve on pure timeouts with no error text — LOCKED_ERR_RE can't
// classify silence, and boot degrades into the timeout storm QC hit. After a couple of unanswered
// ops, steal the lock: either this tab heals the store, or its sahpool install fails with a real
// NoModificationAllowedError that DOES classify.
const LEADER_STEAL_AFTER_TIMEOUTS = 2;
let _followerTimeouts = 0;
let _stealAttempted   = false;

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
  _followerTimeouts = 0; // the leader is answering
  if (ok) p.resolve(result);
  else {
    _announceLockedIf(err);
    p.reject(new SqliteUnavailableError(err || 'sqlite worker error'));
  }
}

function _spawnEngine() {
  // store-worker.js lives at a fixed path from the app root — use an absolute URL so this
  // works after esbuild bundles store-client.js into js/bootstrap/app.js (where import.meta.url
  // would make ./store-worker.js resolve to js/bootstrap/store-worker.js → 404).
  const workerUrl = new URL('js/implementations/storage/implementations/local/store-worker.js', document.baseURI);
  _engine = new Worker(workerUrl, { type: 'module' });
  _engine.onmessage = (ev) => {
    // fatal = worker-side unhandled error forwarded via postMessage (has real err string)
    if (ev.data?.fatal) {
      console.error('[store-client worker fatal]', ev.data.err);
      const dead = new SqliteUnavailableError('sqlite worker crashed: ' + ev.data.err);
      for (const [, p] of _pending) { clearTimeout(p.timer); p.reject(dead); }
      _pending.clear();
      _announceLockedIf(ev.data.err);
      try { _engine.terminate(); } catch { /* already gone */ }
      _engine = null;
      _ready  = null;
      return;
    }
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
    console.error('[store-client worker onerror]', e);
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

function _lockName() { return `${LEADER_LOCK}:${_scope}`; }

// The one fact Rust needs but cannot observe itself: did Web Locks grant this tab sole
// leadership? When it did, Web Locks guarantees no OTHER live document holds the same lock, so a
// sahpool install failure after Rust's retry budget is exhausted is a dead context's handles,
// never a live tab (sahpool_lock_policy.rs::next_sahpool_step). Computed once — the API's presence
// doesn't change mid-session.
const HAS_LOCKS_API = typeof navigator !== 'undefined' && typeof navigator.locks?.request === 'function';

function _becomeLeader() {
  _isLeader = true;
  _resendPending();                      // flush ops queued before the election settled
  _bus.postMessage({ t: 'leader' });
  return new Promise(() => { /* hold leadership until the tab dies */ });
}

// Ask a healthy engine to release its OPFS handles (sqlite_release) and close itself, instead of
// a hard engine.terminate() that would leave those handles for the browser's own worker-teardown
// GC — the actual defect behind an ordinary reload bricking the app (store-worker.js's 'release'
// handler). Used both when this tab loses a lock steal (the new leader gets the handles promptly
// instead of racing our GC) and on pagehide (below).
function _releaseEngine() {
  if (!_engine) return;
  try { _engine.postMessage({ op: 'release' }); } catch { /* already gone */ }
  _engine = null;
  _ready  = null;
}

// A plain reload leaves the OLD document's engine worker (and its OPFS sahpool handles) to the
// browser's own teardown GC unless something releases them first — that gap, not a live second
// tab, is what a routine F5 bricked (repo-init-ok observed at 62533ms against a ~1s clean boot).
// pagehide fires reliably before the new document's worker tries to install the same pool.
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('pagehide', _releaseEngine);
}

function ensureTransport() {
  if (_bus) return;
  if (!_scope) throw new SqliteUnavailableError('store scope not set — the local database is per-account');
  _tabId = 't' + Math.random().toString(36).slice(2, 10);
  _bus = new BroadcastChannel(`${BUS_NAME}:${_scope}`);
  _bus.onmessage = (ev) => {
    const m = ev.data || {};
    if (m.t === 'req' && _isLeader)            _forwardToEngine(m.tab, m.m);
    else if (m.t === 'res' && m.tab === _tabId) _deliver(m.m);
    else if (m.t === 'leader' && !_isLeader)    _resendPending();
  };
  if (navigator.locks?.request) {
    // Held for the tab's whole life; on tab close the next waiter is granted and takes over
    // (the dead tab's sahpool handles are freed with it, so the new leader's install succeeds).
    navigator.locks.request(_lockName(), _becomeLeader).catch((err) => {
      // AbortError = another tab's liveness failover stole it (#19). Stay a follower and release
      // the engine so its sahpool handles are freed for the new leader; anything else is a
      // genuine Web Locks failure, where a per-tab engine is the only way to stay usable.
      if (err?.name === 'AbortError') { _isLeader = false; _releaseEngine(); return; }
      _isLeader = true;
    });
  } else {
    _isLeader = true; // no Web Locks API — single-engine guarantee unavailable, per-tab engine
  }
}

function _onOpTimeout() {
  if (_isLeader || _stealAttempted) return; // our own engine failing is covered by _engine.onerror
  if (++_followerTimeouts < LEADER_STEAL_AFTER_TIMEOUTS) return;
  _stealAttempted = true;
  if (!navigator.locks?.request) return;
  navigator.locks.request(_lockName(), { steal: true }, _becomeLeader)
    .catch((err) => { _announceLockedIf(err?.message); });
}

function send(op, extra, timeoutMs) {
  ensureTransport();
  const rid = ++_seq;
  // rid first, then op/extra: extra may carry an entity `id` — it must never overwrite `rid`.
  // scope/hasLockExclusivity last so no payload key can shadow either.
  const msg = { rid, op, ...extra, scope: _scope, hasLockExclusivity: HAS_LOCKS_API };
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      _pending.delete(rid);
      _onOpTimeout();
      reject(new SqliteUnavailableError(op + ' timed out — sqlite worker unresponsive'));
    }, timeoutMs);
    _pending.set(rid, { resolve, reject, timer, msg });
    _dispatch(msg);
  });
}

// Rust's durability verdict for the local store ({kind, mode, cause?} — durability_verdict.rs,
// relayed verbatim as the 'init' op's result). Kept on window so the topbar reads it even when it
// mounts after init resolved, and re-announced whenever the engine (re)opens — a respawn can land
// in a different mode.
const STORE_DURABILITY_EVENT = 'vdg:store-durability';
function _announceDurability(verdict) {
  if (!verdict || typeof window === 'undefined') return;
  window.__vdg_storeDurability = verdict;
  window.dispatchEvent(new CustomEvent(STORE_DURABILITY_EVENT, { detail: verdict }));
}

// One open handshake, shared by every caller. A failed open clears the memo so a later op retries.
function ensureReady() {
  ensureTransport();
  if (!_ready) {
    _ready = send('init', {}, INIT_TIMEOUT_MS)
      .then((verdict) => { _announceDurability(verdict); return verdict; })
      .catch((e) => { _ready = null; throw e; });
  }
  return _ready;
}

async function op(name, extra) {
  await ensureReady();
  return send(name, extra, OP_TIMEOUT_MS);
}

// ── store surface — thin transport to the Rust worker; the Rust side owns all SQL + schema ────────
// Method names are the Rust IO-port contract (cache_*) + the on-demand consumer contract; identical
// to the old JS store's signatures so StoreIoPort and window.__vdg_store callers are untouched.
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
function sqlCountEntities() {
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

/// What the storage bootstrap binds behind the local-store port: the cache_* surface plus scope/count.
export const localStoreClient = { ...sqliteStore, setStoreScope, sqlCountEntities };
