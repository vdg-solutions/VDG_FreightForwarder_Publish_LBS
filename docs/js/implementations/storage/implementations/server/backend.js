// backend.js — which storage authority this page is talking to.
//
// vdg-server is THE backend: GitHub Pages now serves the client-server build, whose API_BASE names
// the server origin (today a Cloudflare Worker). The Drive-direct flavour is frozen on branch
// `serverless` and is not what Pages ships — a stamped bundle must never fall back to it.
// API_BASE stamped at publish = server build, decided at publish time, not re-decided per boot.
// An unstamped bundle (only the frozen serverless flavour) still probes /api/health and lands on
// Drive. A cross-origin API carries the session cookie with credentials: 'include' (the server
// allows exactly the Pages origin, cookie SameSite=None).

import { API_BASE } from '../../core_abstractions/workspace-config.js';

const HEALTH_PATH        = '/api/health';
const API_PREFIX         = '/api';
const CREDENTIALS_MODE   = API_BASE ? 'include' : 'same-origin';
const PROBE_TIMEOUT_MS   = 1500;
const BACKEND_SERVER     = 'server';
const BACKEND_DRIVE      = 'drive';
const SESSION_TOKEN_HEADER = 'X-Vdg-Session';
// The page (github.io) and the API (workers.dev) are different SITES, so the session cookie is a
// third-party cookie: InPrivate, Safari and strict tracking protection drop it, and the user then
// loops on 401 after a SUCCESSFUL sign-in. Keep the same server-minted token in sessionStorage as
// a second delivery route — window-scoped, gone when the window closes, and unnecessary once the
// app and the API share one site.
const SESSION_TOKEN_KEY  = 'vdg.session-token';
const BACKEND_KEY        = 'vdg.backend'; // sessionStorage: survives reload, not a new tab on another origin

let _backend = null;

/// A build stamped with API_BASE IS a server build — that is a publish-time fact, not something
/// to re-decide per boot. Treating an unreachable /api as "drive" let a single failed probe
/// (a timeout, a 5xx) silently swap the storage authority mid-session: the browser then wrote
/// straight to Drive with the user's own token, behind the server's back — duplicate grant
/// files the server never saw, and no ACL check on the way in. An outage must read as an
/// outage. Only an unstamped build (the serverless flavour) may probe and land on Drive.
async function detectBackend() {
  if (_backend) return _backend;
  if (API_BASE) { _backend = BACKEND_SERVER; return _backend; } // stamped = server, unconditionally
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
  if (API_BASE) return true; // same publish-time fact, readable before detectBackend() has run
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
function readSessionToken() {
  try { return sessionStorage.getItem(SESSION_TOKEN_KEY) || ''; } catch { return ''; } /* storage-less context */
}

/// Called by the sign-in flow with whatever POST /session returned; '' on sign-out.
function rememberSessionToken(token) {
  try {
    if (token) sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    else sessionStorage.removeItem(SESSION_TOKEN_KEY);
  } catch { /* storage-less context — the cookie is still the primary carrier */ }
}

async function apiFetch(method, path, body = undefined) {
  const opts = { method, credentials: CREDENTIALS_MODE, headers: {} };
  const token = readSessionToken();
  if (token) opts.headers[SESSION_TOKEN_HEADER] = token;
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
export const backend = { detectBackend, isServerBackend, apiFetch, rememberSessionToken, _resetBackend };
