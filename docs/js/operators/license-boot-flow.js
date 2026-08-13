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
// F-20-11: lifecycle states. GRACE boots read-only; BLOCKED is a hard stop with its own wording.
export const LICENSE_STATE_GRACE   = 'grace';
export const LICENSE_STATE_BLOCKED = 'blocked';

// license_status.state (Rust license_state.rs) → the boot state the caller renders.
// `payload`/`status` ride along so the gate can stamp can_write and the screen can say how
// many grace days remain. An `invalid` status carries error_kind for the existing screen.
function _stateFromStatus(status, raw = null) {
  if (!status) return { kind: LICENSE_STATE_INVALID, error_kind: null };
  switch (status.state) {
    case 'active':  return { kind: LICENSE_STATE_VALID,   payload: status.payload, status, raw };
    case 'grace':   return { kind: LICENSE_STATE_GRACE,   payload: status.payload, status, raw };
    case 'blocked': return { kind: LICENSE_STATE_BLOCKED, payload: status.payload, status, raw };
    default:        return { kind: LICENSE_STATE_INVALID, error_kind: status.error_kind ?? null };
  }
}

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
    // F-20-11: lifecycle classification, not pass/fail — expired-but-sound is grace, not refusal
    const status = await gate.status(raw);
    return { found: true, raw, status };
  } catch {
    // a status throw is a broken licence, not a network fault — INVALID, never NETWORK
    return { found: true, raw, status: null };
  }
}

// Cache-first, fetch-only-on-cache-miss-or-cache-fail (design §2, the crux). A cache hit never
// triggers a fetch — a valid cached JWT boots even if /license.jwt is unreachable. Only on
// cache-miss/cache-fail does a bounded fetch run.
export async function resolveLicenseState({ gate }) {
  // F-20-11: classify the cached copy (AC-06). Active AND grace both boot from cache — a license
  // one day past exp used to fail this re-verify, get re-fetched and refused outright, which is
  // exactly the "no grace day ever ran" defect. Blocked/invalid cache falls through to the fetch:
  // the bundle may carry a renewed license.
  const cached = await gate.statusOfPersistedLicense();
  if (cached && (cached.state === 'active' || cached.state === 'grace')) {
    return _stateFromStatus(cached);
  }

  const fetchResult = await safeAwait(
    fetchAndVerify(gate), LICENSE_FETCH_TIMEOUT_MS, null, 'license-boot-flow:resolveLicenseState',
  );
  if (!fetchResult.ok) return { kind: LICENSE_STATE_NETWORK }; // AC-07

  const fetched = fetchResult.value;
  if (!fetched.found) return { kind: LICENSE_STATE_MISSING }; // AC-02
  const state = _stateFromStatus(fetched.status, fetched.raw); // AC-03/04/05 + grace/blocked
  if (state.kind !== LICENSE_STATE_VALID && state.kind !== LICENSE_STATE_GRACE) return state;

  // AC-06 — write-through cache only. The license verdict already stands (classified over
  // WASM from the fetch above); persisting the raw string locally is an optimization
  // for the next offline boot. A store hiccup here (old tab holding the OPFS engine — every
  // cache op times out) must NEVER kill a good verdict: QC 2026-08-08 froze the whole boot
  // at "Đang kiểm tra giấy phép" on exactly this throw.
  try { await gate.save(fetched.raw); }
  catch { console.warn('[license-boot] license cache-save failed — continuing, verdict already good'); }
  return state;
}
