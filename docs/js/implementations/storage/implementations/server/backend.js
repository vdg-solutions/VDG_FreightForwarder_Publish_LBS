// backend.js — the ONE storage authority this page talks to: vdg-server. The client is
// server-only (2026-08-30) — it never falls back to Google Drive, in any mode, for any reason.
//
// No requests are built here anymore. Every freight-server call left for Rust on 2026-09-01
// (freight_http: /session, /users, /health; me_http: /me; the records API through
// charterdb-client). What remains is the shell's own half: where the session token LIVES
// (sessionStorage — http_io::session_token reads the same key), and the boot-time backend memo.

import { API_BASE } from '../../core_abstractions/workspace-config.js';

const BACKEND_SERVER = 'server';
// The page (github.io) and the API (workers.dev) are different SITES, so a session cookie would
// be third-party and dropped by InPrivate/Safari/strict tracking protection. The server-minted
// token therefore rides the X-Vdg-Session header, read back from here by Rust
// (http_io::session_token). sessionStorage on purpose: window-scoped, gone when the window
// closes — a localStorage copy outlived the tab and was readable by every tab on this origin.
const SESSION_TOKEN_KEY = 'vdg.session-token';
const BACKEND_KEY       = 'vdg.backend'; // sessionStorage: survives reload, not a new tab on another origin
const SERVER_HEALTH_EVENT = 'vdg:server-health';
const WASM_READY_EVENT    = 'vdg:wasm-ready';

let _backend = null;

/// There is exactly one backend, so this never decides WHICH authority to use — only whether it
/// is reachable yet. A build stamped with API_BASE skips the probe entirely (cross-origin server,
/// publish-time fact). A same-origin build (local vdg-server, or one not up yet) probes
/// /api/health for visibility only: the probe result never changes the backend, and an
/// unreachable server surfaces the same way any other failed server call does — nudged along here
/// via the same 'vdg:server-health' event the poll dispatches, so the topbar doesn't have to wait
/// for the first real request.
async function detectBackend() {
  if (_backend) return _backend;
  if (API_BASE) { _backend = BACKEND_SERVER; return _backend; } // stamped = server, unconditionally
  const remembered = _readRemembered();
  if (remembered) { _backend = remembered; return _backend; }
  _probeWhenWasmReady();
  _backend = BACKEND_SERVER; // the only backend — the probe never changes this
  try { sessionStorage.setItem(BACKEND_KEY, _backend); } catch { /* storage-less context */ }
  return _backend;
}

// The probe and its verdict are Rust's (freight_http::health_probe — resolves the event detail,
// or null for healthy); this only fires the event it hands back. composeStorage runs before the
// wasm module has resolved, so a visibility-only signal waits for vdg:wasm-ready rather than
// blocking boot on it.
function _probeWhenWasmReady() {
  if (typeof window === 'undefined') return;
  const fire = () => {
    window.__vdg_wasm.server_health_probe()
      .then((detail) => {
        if (detail) window.dispatchEvent(new CustomEvent(SERVER_HEALTH_EVENT, { detail }));
      })
      .catch((e) => { console.warn('[VDG] health probe failed:', e?.message || e); });
  };
  if (window.__vdg_wasm?.server_health_probe) { fire(); return; }
  window.addEventListener(WASM_READY_EVENT, fire, { once: true });
}

function _readRemembered() {
  try { return sessionStorage.getItem(BACKEND_KEY); } catch { return null; }
}

/// Test seam.
function _resetBackend() { _backend = null; try { sessionStorage.removeItem(BACKEND_KEY); } catch { /* none */ } }

/// Called by the sign-in flow with the token auth_session_open handed back.
async function adoptSessionToken(token) {
  rememberSessionToken(token);
}

/// Called by the sign-in flow with whatever POST /session returned; '' on sign-out.
function rememberSessionToken(token) {
  try {
    if (token) {
      sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
    }
    // Always, both ways: sign-in must not leave an older build's durable copy behind, and sign-out
    // must clear one even on a session that never read it.
    localStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {
    // storage-less context — the token does not persist and the next call re-authenticates
  }
}

/// What the storage bootstrap binds behind the backend port.
export const backend = { detectBackend, rememberSessionToken, adoptSessionToken, _resetBackend };
