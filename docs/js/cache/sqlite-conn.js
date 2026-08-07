// sqlite-conn.js — MAIN-THREAD client for the SQLite/OPFS engine (replaces the IndexedDB stack).
//
// The engine itself runs in sqlite-worker.js (a dedicated module Worker) because the OPFS SAH Pool
// VFS needs createSyncAccessHandle, which is worker-only on github.io/Edge (CDP-verified 2026-08-06).
// This module is a thin async client: it spawns the worker, correlates requests by id over
// postMessage, and bounds each op so a dead worker rejects instead of hanging. The worker's single
// message loop serializes every statement → the IndexedDB concurrent-transaction wedge class is
// gone by construction.
//
// Drive stays the source of truth (JSONL bundles); SQLite is the local materialized cache + query
// engine. See backlog/wiki/sqlite-opfs-migration.md.

// First op pays the cold cost (CDN module fetch + wasm compile + VFS install); give it room. Every
// later op is a local SQL call — milliseconds — so a short backstop is a dead-worker detector.
const INIT_TIMEOUT_MS = 20_000;
const OP_TIMEOUT_MS    = 5_000;

export class SqliteUnavailableError extends Error {
  constructor(msg) { super(msg); this.name = 'SqliteUnavailableError'; }
}

let _worker  = null;
let _ready   = null;               // open handshake promise; null until first ensureReady()
let _seq     = 0;
const _pending = new Map();        // id -> { resolve, reject, timer }
let _injected = null;              // test seam: a fake engine { select, selectValue, exec, batch }

function ensureWorker() {
  if (_worker) return _worker;
  _worker = new Worker(new URL('./sqlite-worker.js', import.meta.url), { type: 'module' });
  _worker.onmessage = (ev) => {
    const { id, ok, result, err } = ev.data || {};
    const p = _pending.get(id);
    if (!p) return;
    _pending.delete(id);
    clearTimeout(p.timer);
    if (ok) p.resolve(result);
    else    p.reject(new SqliteUnavailableError(err || 'sqlite worker error'));
  };
  // A worker crash must fail every in-flight op and drop the handle so the next call respawns —
  // never leave a caller awaiting a promise the dead worker can no longer settle.
  _worker.onerror = (e) => {
    const dead = new SqliteUnavailableError('sqlite worker crashed: ' + (e?.message || 'unknown'));
    for (const [, p] of _pending) { clearTimeout(p.timer); p.reject(dead); }
    _pending.clear();
    _worker = null;
    _ready  = null;
  };
  return _worker;
}

function send(op, sql, bind, statements, timeoutMs) {
  const w  = ensureWorker();
  const id = ++_seq;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      _pending.delete(id);
      reject(new SqliteUnavailableError(op + ' timed out — sqlite worker unresponsive'));
    }, timeoutMs);
    _pending.set(id, { resolve, reject, timer });
    w.postMessage({ id, op, sql, bind, statements });
  });
}

// One open handshake, shared by every caller. A failed open clears the memo so a later op retries.
function ensureReady() {
  ensureWorker();
  if (!_ready) _ready = send('init', null, null, null, INIT_TIMEOUT_MS).catch((e) => { _ready = null; throw e; });
  return _ready;
}

async function op(name, sql, bind, statements) {
  if (_injected) return _injected[name](sql, bind, statements);
  await ensureReady();
  return send(name, sql, bind, statements, OP_TIMEOUT_MS);
}

// ── Query surface (mirrors the old idbGet/idbPut helpers, in SQL) ────────────────────────────────

// Rows as plain objects: SELECT ... → [{col: val, ...}, ...]
export function sqlSelect(sql, bind = [])      { return op('select', sql, bind); }
// A single scalar, or null: SELECT one_col ... LIMIT 1
export function sqlSelectValue(sql, bind = []) { return op('selectValue', sql, bind); }
// INSERT / UPDATE / DELETE — bind is a positional array or a named-param object.
export function sqlExec(sql, bind = [])        { return op('exec', sql, bind); }
// Atomic multi-statement write (entity + outbox): [{ sql, bind }, ...] run in ONE transaction.
// Replaces the scaffold's sqlTransaction(fn) — a closure can't cross the worker boundary.
export function sqlBatch(statements)           { return op('batch', null, null, statements); }

// Drop the worker + memo so the next call respawns (mirrors resetVdgDbMemo).
export function resetVdgSqliteMemo() {
  if (_worker) { try { _worker.terminate(); } catch { /* already gone */ } }
  _worker = null;
  _ready  = null;
  for (const [, p] of _pending) { clearTimeout(p.timer); p.reject(new SqliteUnavailableError('sqlite reset')); }
  _pending.clear();
}

// Test seam: inject a synchronous fake engine (no worker) so unit tests run without OPFS.
export function _setSqliteEngine(fake) { _injected = fake; }
