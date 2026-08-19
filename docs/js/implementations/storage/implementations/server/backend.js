// backend.js — which storage authority this page is talking to.
//
// Two backends exist: Google Drive (the serverless build on GitHub Pages) and vdg-server (the
// client-server build). The bundle is the same; the difference is discovered ONCE at boot by asking
// the API origin whether /api/health is there. API_BASE (stamped at publish) names that origin —
// empty means this page's own origin (vdg-server serving its bundle, or a bare static host where
// the probe finds nothing and Drive is selected). GitHub Pages and a bare Caddy answer 404, so the
// probe cannot mistake them for a server. A cross-origin API carries the session cookie with
// credentials: 'include' (the server allows exactly the Pages origin, cookie SameSite=None).

import { API_BASE } from '../../core_abstractions/workspace-config.js';

const HEALTH_PATH        = '/api/health';
const API_PREFIX         = '/api';
const CREDENTIALS_MODE   = API_BASE ? 'include' : 'same-origin';
const PROBE_TIMEOUT_MS   = 1500;
const BACKEND_SERVER     = 'server';
const BACKEND_DRIVE      = 'drive';
const BACKEND_KEY        = 'vdg.backend'; // sessionStorage: survives reload, not a new tab on another origin

let _backend = null;

/// Ask once, remember for the session. Never throws — an unreachable /api is simply "drive".
async function detectBackend() {
  if (_backend) return _backend;
  const remembered = _readRemembered();
  if (remembered) { _backend = remembered; return _backend; }
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
  try {
    const res  = await fetch(`${API_BASE}${HEALTH_PATH}`, { signal: ctrl.signal, credentials: CREDENTIALS_MODE });
    const body = res.ok ? await res.json().catch(() => null) : null;
    _backend = body && body.ok === true ? BACKEND_SERVER : BACKEND_DRIVE;
  } catch {
    _backend = BACKEND_DRIVE; // no /api on this origin — the serverless build
  } finally {
    clearTimeout(timer);
  }
  try { sessionStorage.setItem(BACKEND_KEY, _backend); } catch { /* storage-less context */ }
  return _backend;
}

/// Sync read after detectBackend() has run (requireAuth awaits it before anything else).
function isServerBackend() {
  return (_backend ?? _readRemembered()) === BACKEND_SERVER;
}

function _readRemembered() {
  try { return sessionStorage.getItem(BACKEND_KEY); } catch { return null; }
}

/// Test seam.
function _resetBackend() { _backend = null; try { sessionStorage.removeItem(BACKEND_KEY); } catch { /* none */ } }

import { ApiError } from '../../core_abstractions/api-error.js';

/// JSON in, JSON out, session cookie along. A non-2xx is an ApiError carrying the status the
/// server chose (401 sign-in, 403 acl, 404, 409, 412 CAS) — the same numbers the Drive-era
/// callers already branch on.
async function apiFetch(method, path, body = undefined) {
  const opts = { method, credentials: CREDENTIALS_MODE, headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(`${API_BASE}${API_PREFIX}${path}`, opts);
  } catch (err) {
    throw new ApiError(0, `server unreachable: ${err.message}`);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  if (!res.ok) {
    throw new ApiError(res.status, json?.error?.message || `${res.status} ${res.statusText}`);
  }
  return json;
}

/// What the storage bootstrap binds behind the backend port.
export const backend = { detectBackend, isServerBackend, apiFetch, _resetBackend };
