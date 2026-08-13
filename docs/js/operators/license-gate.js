// F-17-03 — license verify-over-WASM + persist/load/clear + boot re-verification.
// Rust is the brain: JS never parses/validates the JWT, only passes it through to WASM
// and stores/loads the opaque string. VerifyResult shape mirrors the WASM contract exactly.

import { safeAwait, SAFE_AWAIT_DEFAULT_MS } from '../util/safe-await.js';

export const PREFS_META_KEY        = 'preferences';
export const PREFS_LICENSE_FIELD   = 'license';
export const WASM_READY_TIMEOUT_MS = SAFE_AWAIT_DEFAULT_MS;
const IDB_LICENSE_READ_TIMEOUT_MS  = SAFE_AWAIT_DEFAULT_MS;

// production store: read-modify-write STORE_META.preferences.license (merges, single writer).
// F-17-04 consumes load() read-only (license_status(jwt, now) needs the raw JWT string) —
// this lane remains the sole writer; the license is never mirrored to localStorage.
export function prefsLicenseStore(store) {
  return {
    async load() {
      const result = await safeAwait(
        store.cache_get_meta(PREFS_META_KEY),
        IDB_LICENSE_READ_TIMEOUT_MS, null, 'license-gate:prefsLicenseStore.load',
      );
      if (!result.ok) return null; // timeout/error — never throw on the empty-license case
      return result.value?.[PREFS_LICENSE_FIELD] ?? null;
    },
    async save(licenseStr) {
      const readResult = await safeAwait(
        store.cache_get_meta(PREFS_META_KEY),
        IDB_LICENSE_READ_TIMEOUT_MS, null, 'license-gate:prefsLicenseStore.save-read',
      );
      const prefs = (readResult.ok ? readResult.value : null) || { key: PREFS_META_KEY };
      const writeResult = await safeAwait(
        store.cache_put_meta(PREFS_META_KEY, { ...prefs, [PREFS_LICENSE_FIELD]: licenseStr }),
        IDB_LICENSE_READ_TIMEOUT_MS, null, 'license-gate:prefsLicenseStore.save-write',
      );
      if (!writeResult.ok) throw writeResult.error;
    },
    async clear() {
      const readResult = await safeAwait(
        store.cache_get_meta(PREFS_META_KEY),
        IDB_LICENSE_READ_TIMEOUT_MS, null, 'license-gate:prefsLicenseStore.clear-read',
      );
      const prefs = readResult.ok ? readResult.value : null;
      if (!prefs) return;
      const { [PREFS_LICENSE_FIELD]: _drop, ...rest } = prefs;
      const writeResult = await safeAwait(
        store.cache_put_meta(PREFS_META_KEY, rest),
        IDB_LICENSE_READ_TIMEOUT_MS, null, 'license-gate:prefsLicenseStore.clear-write',
      );
      if (!writeResult.ok) throw writeResult.error;
    },
  };
}

export class LicenseGate {
  constructor(store, wasmProvider = () => window.__vdg_wasm) {
    this._store       = store;
    this._wasmProvider = wasmProvider;
  }

  // AC-07/08/09: bounded wait for WASM readiness — rejects (never hangs) on timeout
  async ensureWasm(timeoutMs = WASM_READY_TIMEOUT_MS) {
    const result = await safeAwait(
      _waitForWasm(this._wasmProvider),
      timeoutMs,
      null,
      'license-gate:ensureWasm',
    );
    if (!result.ok) throw result.error;
    return result.value;
  }

  // F-17-10: WORKSPACE_ROOT is compiled into the wasm binary (license_check::WORKSPACE_ROOT via
  // env!) — the binary itself enforces the workspace binding, so JS just passes the JWT through.
  async verify(licenseStr, nowUnix = _nowUnix()) {
    const wasm = await this.ensureWasm();
    // wasm-bindgen maps the Rust i64 param to a JS BigInt — a plain Number throws
    return wasm.verify_license(licenseStr, BigInt(nowUnix));
  }

  // F-20-11: the lifecycle verdict — {state: active|grace|blocked|invalid, can_write,
  // days_past_exp, grace_days_left, payload, error_kind}. verify() above is pass/fail with
  // ExpiryPolicy::Reject; THIS is what the boot gate renders, so an expired-but-sound license
  // degrades to read-only grace instead of being refused outright.
  //
  // license_arm, not license_status: the same call stamps the verdict into the wasm write
  // guard (data_repo/write_guard.rs), so the repo's own put/delete enforce read-only — the
  // JS copy of the verdict is display only.
  async status(licenseStr, nowUnix = _nowUnix()) {
    const wasm = await this.ensureWasm();
    return wasm.license_arm(licenseStr, BigInt(nowUnix));
  }

  // AC-06 round-trip
  async save(licenseStr) { await this._store.save(licenseStr); }
  async load()            { return this._store.load(); }
  async clear()            { await this._store.clear(); }

  // AC-11: load persisted -> re-classify -> lifecycle status (or null when nothing is stored);
  // NEVER trusts stored blindly (a copied license.jwt must still fail WorkspaceMismatch on this
  // deployment). F-20-11: this is status(), not verify() — a cached license one day past exp
  // must boot into grace, not be thrown away and re-fetched into a hard refusal.
  async statusOfPersistedLicense(nowUnix = _nowUnix()) {
    const stored = await this.load();
    if (!stored) return null;
    return this.status(stored, nowUnix);
  }
}

function _nowUnix() { return Math.floor(Date.now() / 1000); }

// Resolves once WASM is available — either already loaded or via the boot-fired ready event.
function _waitForWasm(provider) {
  const existing = provider();
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve) => {
    window.addEventListener('vdg:wasm-ready', () => resolve(provider()), { once: true });
  });
}
