// backend.js — the ONE storage authority this page talks to: vdg-server. The client is
// server-only (2026-08-30) — it never falls back to Google Drive, in any mode, for any reason.
// API_BASE names the server origin (today a Cloudflare Worker) when stamped at publish; empty
// means same-origin (a local vdg-server run). A cross-origin API carries the session cookie with
// Auth is a bearer-style header, never a cookie — see CREDENTIALS_MODE below.

import { API_BASE } from '../../core_abstractions/workspace-config.js';

const HEALTH_PATH        = '/api/health';
const ME_PATH            = '/me';
const API_PREFIX         = '/api';
// 'omit', always. Auth rides the X-Vdg-Session HEADER (see apiFetch below), which the server
// reads FIRST (dispatch.rs: `from_header.or(from_cookie)`) — the cookie was only ever a second
// copy of a token that already lives in localStorage, so HttpOnly bought nothing an XSS could
// not read anyway. Meanwhile a cross-site cookie is exactly what browsers now refuse: Edge's
// Tracking Prevention blocked storage for this origin and the health probe hung its full 30s.
// The app is on github.io and the API on workers.dev BY DESIGN — a decentralised deployment puts
// the store on another site, and a header is the credential that survives that. Omitting
// credentials also deletes CSRF outright: nothing is sent ambiently, so nothing can be forged.
const CREDENTIALS_MODE   = 'omit';
const PROBE_TIMEOUT_MS   = 1500;
// Longer than the health probe on purpose: a timeout here does no harm (the fallback token simply
// stays), while a cold Durable Object answering /me in two seconds would otherwise be read as
// "this browser blocks the cookie" on every sign-in.
const COOKIE_PROBE_TIMEOUT_MS = 4000;
// Backstop past the AbortController deadline below — only fires if abort() itself fails to
// unblock a stuck fetch (browser bug territory), so this never races the real timeout.
const TRANSPORT_SAFE_AWAIT_MARGIN_MS = 5000;
const BACKEND_SERVER     = 'server';
const SESSION_TOKEN_HEADER = 'X-Vdg-Session';
// The page (github.io) and the API (workers.dev) are different SITES, so the session cookie is a
// third-party cookie: InPrivate, Safari and strict tracking protection drop it, and the user then
// loops on 401 after a SUCCESSFUL sign-in. Keep the same server-minted token in sessionStorage as
// a second delivery route — window-scoped, gone when the window closes, and unnecessary once the
// app and the API share one site.
//
// It is a FALLBACK, so it must exist only where it is actually needed. A token sitting in
// sessionStorage is readable by any script on the page, which is precisely what the HttpOnly
// cookie is not — so keeping a copy for a browser whose cookie works fine gives up that
// protection for nothing. adoptSessionToken() below settles that per browser, once, by asking.
const SESSION_TOKEN_KEY  = 'vdg.session-token';
const BACKEND_KEY        = 'vdg.backend'; // sessionStorage: survives reload, not a new tab on another origin

let _backend = null;

/// There is exactly one backend, so this never decides WHICH authority to use — only whether it
/// is reachable yet. A build stamped with API_BASE skips the probe entirely (cross-origin server,
/// publish-time fact). A same-origin build (local vdg-server, or one not up yet) probes /api/health
/// for visibility only: a failed/timed-out probe here used to switch the app into a Drive-direct
/// mode whose adapter no longer exists — a server hiccup then silently ran with the user's own
/// Google token, behind the server's back, no ACL check on the way in. An outage now reads as an
/// outage: the probe result never changes the backend, and an unreachable server surfaces the same
/// way any other failed server call does (apiFetch's ApiError, the sync engine's own
/// sync_health::is_unreachable()) — nudged along here via the same 'vdg:server-health' event
/// apiFetch already dispatches, so the topbar doesn't have to wait for the first real request.
async function detectBackend() {
  if (_backend) return _backend;
  if (API_BASE) { _backend = BACKEND_SERVER; return _backend; } // stamped = server, unconditionally
  const remembered = _readRemembered();
  if (remembered) { _backend = remembered; return _backend; }
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
  const { ok, value: res } = await safeAwait(
    fetch(`${API_BASE}${HEALTH_PATH}`, { signal: ctrl.signal, credentials: CREDENTIALS_MODE }),
    PROBE_TIMEOUT_MS + TRANSPORT_SAFE_AWAIT_MARGIN_MS,
    undefined,
    'detectBackend:health',
  );
  clearTimeout(timer);
  const body = ok && res.ok ? await res.json().catch(() => null) : null;
  if (!(body && body.ok === true) && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vdg:server-health', { detail: { unreachable: true } }));
  }
  _backend = BACKEND_SERVER; // the only backend — the probe never changes this
  try { sessionStorage.setItem(BACKEND_KEY, _backend); } catch { /* storage-less context */ }
  return _backend;
}

function _readRemembered() {
  try { return sessionStorage.getItem(BACKEND_KEY); } catch { return null; }
}

/// Test seam.
function _resetBackend() { _backend = null; try { sessionStorage.removeItem(BACKEND_KEY); } catch { /* none */ } }

import { ApiError } from '../../core_abstractions/api-error.js';
import { safeAwait } from '../../../kernel/core_abstractions/util/safe-await.js';

/// JSON in, JSON out, session token in a header. A non-2xx is an ApiError carrying the status the
/// server chose (401 sign-in, 403 acl, 404, 409, 412 CAS) for callers to branch on.
/// sessionStorage ONLY. The token used to be written to localStorage as well, which meant it
/// outlived the tab, survived a reboot, and was readable by every other tab on this origin — a
/// week-long credential in the most durable place the browser offers. sessionStorage dies with the
/// tab, so closing it ends the session on that machine whether or not anyone signed out.
function readSessionToken() {
  try {
    // A token written by an older build is still in localStorage; take it once so this change does
    // not sign anyone out, then delete it. Migration, not a fallback: the next read finds only
    // sessionStorage.
    const legacy = localStorage.getItem(SESSION_TOKEN_KEY);
    if (legacy) {
      localStorage.removeItem(SESSION_TOKEN_KEY);
      if (!sessionStorage.getItem(SESSION_TOKEN_KEY)) sessionStorage.setItem(SESSION_TOKEN_KEY, legacy);
    }
    return sessionStorage.getItem(SESSION_TOKEN_KEY) || '';
  } catch {
    return ''; // storage-less context (private mode, embedded webview) — no token is a valid answer
  }
}

/// Called by the sign-in flow with whatever POST /session returned.
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

const API_FETCH_TIMEOUT_MS = 30000;

// Wall-clock ISO-8601 w/ ms — same spelling as the Rust side's Clock::now_iso(), so a pasted
// dump interleaving both never looks like two clocks disagreeing.
function _nowIso() { return new Date().toISOString(); }

// Requests interleave (concurrent fetches resolve out of order) and DevTools timestamps don't
// survive copy-paste — this id + wall-clock + duration on both log lines is what lets a pasted
// dump be read back into request/response pairs. Per-tab counter: short and monotonic beats a UUID
// for something a human has to eyeball in a scrollback dump.
let _apiReqSeq = 0;

async function apiFetch(method, path, body = undefined, extraHeaders = {}) {
  const url = `${API_BASE}${API_PREFIX}${path}`;
  const opts = { method, credentials: CREDENTIALS_MODE, headers: { ...extraHeaders } };
  const token = readSessionToken();
  if (token) opts.headers[SESSION_TOKEN_HEADER] = token;
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error('fetch timeout (30s)')), API_FETCH_TIMEOUT_MS);
  opts.signal = ctrl.signal;
  const reqId = `r${++_apiReqSeq}`;
  const startedAtMs = Date.now();
  console.log(`[API][${reqId}][${_nowIso()}] Fetching ${method} ${url}...`);
  const { ok, value: res, error } = await safeAwait(
    fetch(url, opts),
    API_FETCH_TIMEOUT_MS + TRANSPORT_SAFE_AWAIT_MARGIN_MS,
    undefined,
    `apiFetch:${method}:${path}`,
  );
  clearTimeout(timer);
  if (!ok) {
    console.error(`[API][${reqId}][${_nowIso()} +${Date.now() - startedAtMs}ms] Fetch failed for ${method} ${url}:`, error);
    // status 0 — read_verdict::classify_status (Rust) reads this as UNDECIDABLE, never as a
    // negative answer. Do not turn a dead network into "there is nothing here".
    throw new ApiError(0, `server unreachable: ${error.message}`);
  }
  console.log(`[API][${reqId}][${_nowIso()} +${Date.now() - startedAtMs}ms] Response from ${method} ${url}:`, res.status);
  const backlogHeader = res.headers?.get('x-replication-backlog');
  const providerHeader = res.headers?.get('x-secondary-provider') || res.headers?.get('x-replication-provider');
  if (backlogHeader !== null && backlogHeader !== undefined) {
    const backlog_depth = parseInt(backlogHeader, 10);
    if (!Number.isNaN(backlog_depth) && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('vdg:server-health', {
        detail: { backlog_depth, provider: providerHeader || undefined },
      }));
    }
  }
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  if (path === '/health' && json && typeof window !== 'undefined') {
    const backlog_depth = json.mirror?.backlog_depth ?? json.replication_backlog ?? 0;
    const oldest_pending_age_ms = json.mirror?.oldest_pending_age_ms ?? null;
    const provider = json.mirror?.provider ?? json.secondary_provider ?? providerHeader ?? 'Google Drive';
    window.dispatchEvent(new CustomEvent('vdg:server-health', {
      detail: { backlog_depth, oldest_pending_age_ms, provider },
    }));
  }
  if (!res.ok) {
    throw new ApiError(res.status, json?.reason || json?.error?.message || `${res.status} ${res.statusText}`);
  }
  return json;
}

/// What the storage bootstrap binds behind the backend port.
export const backend = { detectBackend, apiFetch, rememberSessionToken, adoptSessionToken, _resetBackend };
