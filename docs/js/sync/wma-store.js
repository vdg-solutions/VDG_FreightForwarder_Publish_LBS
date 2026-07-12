// wma-store.js — IDB read/write for STORE_KIND_WMA per (rep_id, row_idx) (F-15-63)

import { idbGet, idbPut, STORE_KIND_WMA } from '../cache/idb-cache.js';
import { safeAwait } from '../util/safe-await.js';
import { defaultWmaState } from './wma-engine.js';

const WMA_IDB_TIMEOUT_MS = 2000; // non-critical background store; short timeout

/**
 * loadKindWmaState — fetch WMA state from IDB; returns default state if not found or DB absent.
 * @param {IDBDatabase} db
 * @param {string} repId
 * @param {number} rowIdx
 * @returns {Promise<{kind_weights:object, total_observations:number, last_decay_ts:string}>}
 */
export async function loadKindWmaState(db, repId, rowIdx) {
  if (!db) return defaultWmaState();
  const key = `${repId}::${rowIdx}`;
  const { ok, value } = await safeAwait(
    idbGet(db, STORE_KIND_WMA, key),
    WMA_IDB_TIMEOUT_MS,
    null,
    'wma:load',
  );
  if (!ok || !value) return defaultWmaState();
  // strip internal storage key before returning
  const { key: _k, ...state } = value;
  return state;
}

/**
 * saveKindWmaState — persist WMA state to IDB. Fire-and-forget errors are swallowed
 * with a console warning; WMA is best-effort and must not block the UI.
 * @param {IDBDatabase} db
 * @param {string} repId
 * @param {number} rowIdx
 * @param {object} state
 */
export async function saveKindWmaState(db, repId, rowIdx, state) {
  if (!db) return;
  const key = `${repId}::${rowIdx}`;
  const { ok, error } = await safeAwait(
    idbPut(db, STORE_KIND_WMA, { ...state, key }),
    WMA_IDB_TIMEOUT_MS,
    null,
    'wma:save',
  );
  if (!ok) console.warn('[wma] save failed:', error?.message); // DEV
}
