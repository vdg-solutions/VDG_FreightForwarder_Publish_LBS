// wma-store.js — SQLite read/write for the kind_wma store per (rep_id, row_idx) (F-15-63)

import { safeAwait } from '../../../kernel/core_abstractions/util/safe-await.js';
import { defaultWmaState } from '../../core_abstractions/wma-engine.js';

const WMA_IDB_TIMEOUT_MS = 2000; // non-critical background store; short timeout

/**
 * loadKindWmaState — fetch WMA state from the store; default state if not found or store absent.
 * @param {object} store  the sqlite store transport (cache_get_wma / cache_put_wma → Rust)
 * @param {string} repId
 * @param {number} rowIdx
 * @returns {Promise<{kind_weights:object, total_observations:number, last_decay_ts:string}>}
 */
export async function loadKindWmaState(store, repId, rowIdx) {
  if (!store) return defaultWmaState();
  const key = `${repId}::${rowIdx}`;
  const { ok, value } = await safeAwait(
    store.cache_get_wma(key),
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
 * saveKindWmaState — persist WMA state. Fire-and-forget errors are swallowed with a console
 * warning; WMA is best-effort and must not block the UI.
 * @param {object} store  the sqlite store transport
 * @param {string} repId
 * @param {number} rowIdx
 * @param {object} state
 */
export async function saveKindWmaState(store, repId, rowIdx, state) {
  if (!store) return;
  const key = `${repId}::${rowIdx}`;
  const { ok, error } = await safeAwait(
    store.cache_put_wma(key, { ...state, key }),
    WMA_IDB_TIMEOUT_MS,
    null,
    'wma:save',
  );
  if (!ok) console.warn('[wma] save failed:', error?.message); // DEV
}
