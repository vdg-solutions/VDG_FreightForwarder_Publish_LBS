// license-boot-flow.js — pure fetch+WASM licence resolution, no DOM. Rust stays the brain
// (WORKSPACE_ROOT is compiled into the wasm binary, F-17-10) — this module just fetches the
// bundled license.jwt and interprets verify_license's result into a state the boot layer renders.

import { safeAwait, SAFE_AWAIT_DEFAULT_MS } from '../util/safe-await.js';

export const LICENSE_FETCH_TIMEOUT_MS = SAFE_AWAIT_DEFAULT_MS;
export const LICENSE_URL              = 'license.jwt';
const HTTP_STATUS_NOT_FOUND           = 404;

export const LICENSE_STATE_VALID   = 'valid';
export const LICENSE_STATE_MISSING = 'missing';
export const LICENSE_STATE_INVALID = 'invalid';
export const LICENSE_STATE_NETWORK = 'network';

// { found:false } | { found:true, valid, error_kind, payload, raw }
// A 404 means "this build has no bundled licence" (AC-02/MISSING) — any other non-2xx (5xx,
// auth-proxy failure, etc.) or a network exception is NOT the same thing and must surface as
// NETWORK (AC-07), so it throws here and lets the caller's safeAwait catch it as a failed fetch.
// A throw from gate.verify() is a separate axis — the fetch itself succeeded, so it is never
// NETWORK; it's caught below and mapped to INVALID instead.
async function fetchAndVerify(gate) {
  const res = await fetch(LICENSE_URL);
  if (res.status === HTTP_STATUS_NOT_FOUND) return { found: false };
  if (!res.ok) throw new Error(`license fetch failed: ${res.status}`);

  const raw = await res.text();
  if (!raw) return { found: false };

  try {
    const result = await gate.verify(raw);
    return {
      found: true,
      valid: Boolean(result.valid),
      error_kind: result.error_kind ?? null,
      payload: result.payload ?? null,
      raw,
    };
  } catch {
    // a verify throw is a broken licence, not a network fault — INVALID, never NETWORK
    return { found: true, valid: false, error_kind: null };
  }
}

// Cache-first, fetch-only-on-cache-miss-or-cache-fail (design §2, the crux). A cache hit never
// triggers a fetch — a valid cached JWT boots even if /license.jwt is unreachable. Only on
// cache-miss/cache-fail does a bounded fetch run.
export async function resolveLicenseState({ gate }) {
  const reverify = await gate.reverifyPersistedLicense(); // re-verifies over real WASM — AC-06
  if (reverify.ok) return { kind: LICENSE_STATE_VALID, payload: reverify.payload };

  const fetchResult = await safeAwait(
    fetchAndVerify(gate), LICENSE_FETCH_TIMEOUT_MS, null, 'license-boot-flow:resolveLicenseState',
  );
  if (!fetchResult.ok) return { kind: LICENSE_STATE_NETWORK }; // AC-07

  const fetched = fetchResult.value;
  if (!fetched.found) return { kind: LICENSE_STATE_MISSING }; // AC-02
  if (!fetched.valid) return { kind: LICENSE_STATE_INVALID, error_kind: fetched.error_kind }; // AC-03/04/05

  await gate.save(fetched.raw); // AC-06
  return { kind: LICENSE_STATE_VALID, payload: fetched.payload };
}
