// sqlite-worker.js — the SQLite/OPFS engine, runs INSIDE a dedicated module Worker.
//
// WHY A WORKER (locked by CDP spike on github.io/Edge, 2026-08-06, re-confirmed live):
// the OPFS SAH Pool VFS needs FileSystemFileHandle.createSyncAccessHandle, which is exposed
// ONLY inside a Web Worker here (main thread → "NO-METHOD"). So the engine lives here; the main
// thread talks to it through sqlite-conn.js over postMessage. The worker's single message loop
// also serializes every statement for free — that is the structural cure for the IndexedDB
// concurrent-transaction wedge (a storm of parallel txns can no longer form).
//
// Module worker + static import of @sqlite.org/sqlite-wasm from jsdelivr (same CDN as the rest of
// the app; GitHub Pages has no CSP tag). The .wasm sibling resolves against this mjs URL → jsdelivr.
// Verified end-to-end on the deployed origin: load → installOpfsSAHPoolVfs → open → CRUD, ~310ms warm.

import sqlite3InitModule from 'https://cdn.jsdelivr.net/npm/@sqlite.org/sqlite-wasm@3.53.0-build1/dist/index.mjs';
import { SCHEMA, DB_PATH, VFS_NAME } from './sqlite-schema.js';

// One-time open, memoized. First message pays the cold cost (module fetch + wasm compile + VFS
// install); every later message reuses the same handle.
let _dbReady = null;
function ready() {
  if (_dbReady) return _dbReady;
  _dbReady = (async () => {
    const sqlite3 = await sqlite3InitModule();
    if (!sqlite3.installOpfsSAHPoolVfs) throw new Error('OPFS SAH Pool VFS unavailable in this browser');
    const poolUtil = await sqlite3.installOpfsSAHPoolVfs({ name: VFS_NAME });
    const db = new poolUtil.OpfsSAHPoolDb(DB_PATH);
    db.exec('PRAGMA journal_mode=MEMORY; PRAGMA foreign_keys=ON;');
    db.exec(SCHEMA);
    return db;
  })().catch((e) => { _dbReady = null; throw e; }); // let a later message retry a failed open
  return _dbReady;
}

// op dispatch — the four verbs the main-thread client sends. `batch` runs a list of statements in
// ONE transaction (atomic entity+outbox write); a JS closure can't cross postMessage, so the client
// ships the statements instead of a callback.
function runOp(db, msg) {
  switch (msg.op) {
    case 'init':        return null; // ready() already ran — just an open handshake
    case 'select':      return db.selectObjects(msg.sql, msg.bind || []);
    case 'selectValue': { const v = db.selectValue(msg.sql, msg.bind || []); return v === undefined ? null : v; }
    case 'exec':        db.exec({ sql: msg.sql, bind: msg.bind || [] }); return null;
    case 'batch':
      return db.transaction(() => {
        for (const s of msg.statements || []) db.exec({ sql: s.sql, bind: s.bind || [] });
        return null;
      });
    default: throw new Error('unknown sqlite op: ' + msg.op);
  }
}

self.onmessage = async (ev) => {
  const msg = ev.data || {};
  try {
    const db = await ready();
    const result = runOp(db, msg);
    self.postMessage({ id: msg.id, ok: true, result });
  } catch (e) {
    self.postMessage({ id: msg.id, ok: false, err: (e?.name || 'Error') + ': ' + (e?.message || String(e)) });
  }
};
