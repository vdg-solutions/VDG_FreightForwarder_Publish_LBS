// drive-transport.js — the Google Drive REST transport: Bearer + fetch, bounded 429/503 backoff,
// the one-shot 401 recovery through the token anchor rule, 403 classification. Bound behind the
// storage-api port's driveFetch / driveFetchRaw by the storage bootstrap (the vdg-server shim is
// the other transport); the tree helpers in drive-api.js ride on the port, never on this file.

import { clearDriveScopeGrant } from '../../core_abstractions/oauth.js';
import { classifyDriveError, DRIVE_ERROR_KIND_SCOPE_INSUFFICIENT, DRIVE_ERROR_KIND_RATE_LIMITED }
  from '../../core_abstractions/drive-error-classifier.js';
import { getAccessToken, recoverFromUnauthorized } from '../../core_abstractions/token.js';
import { DriveApiError } from '../../core_abstractions/drive-errors.js';
import { DRIVE_API_BASE } from '../../core_abstractions/drive-endpoints.js';
const RATE_LIMIT_BASE_MS      = 1_000;
const RATE_LIMIT_MAX_ATTEMPTS = 3;

// The sharing limit refills over minutes, not milliseconds — a 1s backoff just burns the next
// attempt. 8s/16s/32s ≈ one minute of patience, which is what a grant fan-out needs to finish.
const SHARING_LIMIT_BASE_MS      = 8_000;
const SHARING_LIMIT_MAX_ATTEMPTS = 3;

// F-34-03 AC-04: 429 (rate-limit) + 503 (transient Drive unavailability) both back off and
// retry the same bounded way — a persistent 503 falls through to the existing !res.ok /
// non-ok-status handling and surfaces as a typed DriveApiError after the bound, never an
// unbounded stall.
const RETRYABLE_STATUSES = new Set([429, 503]);

const HTTP_UNAUTHORIZED   = 401;
const SESSION_EXPIRED_MSG = 'Drive session expired — reconnect required';

// Real 401 + failed recovery -> flip the app into reconnect state (topbar chip + auth-gate
// listen). Was left dangling when the old token-refresh module was retired — every failed
// re-mint threw ReferenceError instead of surfacing the reconnect chip.
function _dispatchNeedsReconnect() {
  window.dispatchEvent(new CustomEvent('vdg:auth-needs-reconnect'));
}

// Reactive 401 recovery through the TokenAnchor rule (owner model: "lúc 401 mới cần" — never
// proactive). Shared by BOTH fetch wrappers: every content read/write goes through driveFetchRaw,
// and it had no 401 branch at all — verified live on the deploy, where four metadata calls
// returned 200 and the first alt=media download 401'd. usedToken anchors the verdict: a 401
// earned by a token that is no longer current retries with the fresh one instead of declaring
// the session dead (the "expired seconds after reconnect" false red). The retry runs AFTER
// recovery settles, so a 403 coming back from it stays a 403.
async function _reauthThenRetry(attempt, usedToken, retry) {
  if (attempt !== 0) throw new DriveApiError(HTTP_UNAUTHORIZED, SESSION_EXPIRED_MSG); // one recovery per request
  try {
    await recoverFromUnauthorized(usedToken);
  } catch {
    _dispatchNeedsReconnect();   // AC-04: reconnect state, no reload
    throw new DriveApiError(HTTP_UNAUTHORIZED, SESSION_EXPIRED_MSG);
  }
  return retry();
}

// ── core fetch wrapper ────────────────────────────────────────────────────────

async function driveFetch(method, path, body = undefined, attempt = 0) {
  const token = await getAccessToken();
  const url   = path.startsWith('http') ? path : `${DRIVE_API_BASE}${path}`;
  const opts  = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {}),
  };

  // F-24-19: surface a transport failure as DriveApiError(0) so callers (and app.js's boot
  // catch) render a concrete retry screen instead of a raw fetch TypeError leaking upward.
  // status 0 = unreachable; classifyDriveError treats non-403 as null → transient handling.
  let res;
  try {
    res = await fetch(url, opts);
  } catch (netErr) {
    throw new DriveApiError(0, `Drive network error: ${netErr.message}`);
  }

  if (RETRYABLE_STATUSES.has(res.status) && attempt < RATE_LIMIT_MAX_ATTEMPTS) {
    await _sleep(RATE_LIMIT_BASE_MS * Math.pow(2, attempt));
    return driveFetch(method, path, body, attempt + 1);
  }

  if (res.status === HTTP_UNAUTHORIZED) {
    return _reauthThenRetry(attempt, token, () => driveFetch(method, path, body, attempt + 1));
  }

  if (!res.ok) {
    const text  = await res.text().catch(() => '');
    const error = new DriveApiError(res.status, `Drive API ${res.status}: ${text}`);
    if (res.status === 429) error.rateLimited = true;
    error.driveErrorKind = classifyDriveError(error);                                        // AC-04: tag every 403
    if (error.driveErrorKind === DRIVE_ERROR_KIND_SCOPE_INSUFFICIENT) clearDriveScopeGrant(); // AC-05
    // The sharing limit only becomes visible in the BODY, so it cannot join RETRYABLE_STATUSES
    // above — the status alone is 403, indistinguishable from a real permission denial.
    if (error.driveErrorKind === DRIVE_ERROR_KIND_RATE_LIMITED) {
      error.rateLimited = true;
      if (attempt < SHARING_LIMIT_MAX_ATTEMPTS) {
        await _sleep(SHARING_LIMIT_BASE_MS * Math.pow(2, attempt));
        return driveFetch(method, path, body, attempt + 1);
      }
    }
    throw error;
  }

  const ct = res.headers.get('Content-Type') || '';
  if (ct.includes('application/json')) return res.json();
  return { _raw: await res.text(), _headers: Object.fromEntries(res.headers) };
}

// driveFetch with ETag header support — returns full Response for header access
async function driveFetchRaw(method, path, body = undefined, extraHeaders = {}, attempt = 0) {
  const token = await getAccessToken();
  const url   = path.startsWith('http') ? path : `${DRIVE_API_BASE}${path}`;
  const opts  = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      ...extraHeaders,
    },
    ...(body ? { body } : {}),
  };

  const res = await fetch(url, opts);

  if (RETRYABLE_STATUSES.has(res.status) && attempt < RATE_LIMIT_MAX_ATTEMPTS) {
    await _sleep(RATE_LIMIT_BASE_MS * Math.pow(2, attempt));
    return driveFetchRaw(method, path, body, extraHeaders, attempt + 1);
  }

  // Content path — same one-shot re-mint as driveFetch. getFile/uploadFile used to hand the raw
  // 401 to the caller, so an expired token killed the read outright while a metadata call on the
  // same token healed itself.
  if (res.status === HTTP_UNAUTHORIZED) {
    return _reauthThenRetry(attempt, token, () => driveFetchRaw(method, path, body, extraHeaders, attempt + 1));
  }

  return res; // caller checks status — a persistent 503 falls through here and getFile's
              // !res.ok branch throws DriveApiError(503) after the bound
}


function _sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/// The Google REST transport the storage bootstrap binds behind the storage-api port in Drive mode.
export const driveTransport = { driveFetch, driveFetchRaw };
