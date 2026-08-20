// platform/sync.js — extra platform methods the Rust sync use-cases import (js_sync.rs extern type).
// Capabilities of the machine only: a digest, a unique token, the host calendar, the kind_wma
// store. What gets hashed, what an id looks like and when a weight decays are decided in Rust.
import { safeAwait } from '../../implementations/kernel/core_abstractions/util/safe-await.js';
import { todayLocal } from '../../implementations/kernel/core_abstractions/util/today-local.js';

const WMA_STORE_TIMEOUT_MS = 2000; // non-critical background store; short timeout
const TOKEN_RADIX          = 36;
const TOKEN_START          = 2;    // skip the leading "0." of Math.random().toString(36)
const TOKEN_END            = 7;
const HEX_PAD              = 2;
const DJB2_SEED            = 5381;

// Non-secure context (plain HTTP): crypto.subtle is absent, so this is the fallback the entry is
// already tagged `hash_alg: djb2` for — a checksum, and verify_chain reports it as unverifiable.
function _djb2(text) {
  let h = DJB2_SEED;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h) ^ text.charCodeAt(i);
  return h >>> 0;
}

export const syncPlatform = {
  sync_sha256_hex: async (text) => {
    try {
      const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(HEX_PAD, '0')).join('');
    } catch {
      /* no WebCrypto here — the entry already carries hash_alg: djb2 */
      return _djb2(text).toString(16);
    }
  },
  sync_crypto_secure: () => typeof crypto !== 'undefined' && !!crypto.subtle,
  sync_token:         () => Math.random().toString(TOKEN_RADIX).slice(TOKEN_START, TOKEN_END),
  sync_today_local:   () => todayLocal(),

  sync_wma_get: async (key) => {
    const store = window.__vdg_store;
    if (!store) return null;
    const { ok, value } = await safeAwait(store.cache_get_wma(key), WMA_STORE_TIMEOUT_MS, null, 'wma:load');
    return ok ? (value ?? null) : null;
  },
  sync_wma_put: async (key, value) => {
    const store = window.__vdg_store;
    if (!store) return; // no store yet — WMA is best-effort, the form must not wait for it
    const { ok, error } = await safeAwait(store.cache_put_wma(key, value), WMA_STORE_TIMEOUT_MS, null, 'wma:save');
    if (!ok) throw new Error(error?.message || 'wma:save timed out');
  },
};
