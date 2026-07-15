// Drive REST client + JSONL codec + workspace constants

import { clearDriveScopeGrant } from './google-oauth.js';
import { globalOwnerQuery, dedupeGlobalOwnerFolders, moveToParent } from './drive-folder-dedup.js';
import { classifyDriveError, DRIVE_ERROR_KIND_SCOPE_INSUFFICIENT } from './drive-error-classifier.js';

// F-24-14: globalOwnerQuery re-exported so boot can re-count owner-owned folders after
// findWorkspaceRoot resolves, to detect duplicates the F-24-13 auto-heal couldn't safely delete.
export { moveToParent, globalOwnerQuery };

// F-17-03: findWorkspaceRoot/listChildFolder/renameFolder/WORKSPACE_NAME moved to
// workspace-root.js (350-line cap) — re-exported here so `driveApi.findWorkspaceRoot`
// keeps resolving for every existing caller.
export { findWorkspaceRoot, listChildFolder, renameFolder, WORKSPACE_NAME } from './workspace-root.js';

const DRIVE_API_BASE          = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE       = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_MIME             = 'application/vnd.google-apps.folder';
const RATE_LIMIT_BASE_MS      = 1_000;
const RATE_LIMIT_MAX_ATTEMPTS = 3;
const ACCESS_TOKEN_KEY        = 'vdg.auth.access_token';
const ACCESS_TOKEN_EXP_KEY    = 'vdg.auth.access_token_exp';
const TOKEN_EXPIRY_BUFFER_MS  = 60_000; // refresh 60s before expiry
const SILENT_REFRESH_TIMEOUT_MS = 10_000;   // AC-03 — GIS prompt:'' can no-op forever; bound it

// single-flight guard — prevents multiple reloads on concurrent 401s
let _reauthInflight = false;

export { FOLDER_MIME };

export class DriveApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name   = 'DriveApiError';
    this.status = status;
  }
}

export class ConcurrencyError extends Error {
  constructor(kind, id, attempts) {
    super(`Concurrency conflict: ${kind}/${id} after ${attempts} attempts`);
    this.name     = 'ConcurrencyError';
    this.kind     = kind;
    this.id       = id;
    this.attempts = attempts;
  }
}

// ── token management ──────────────────────────────────────────────────────────

export async function getAccessToken() {
  const exp   = parseInt(localStorage.getItem(ACCESS_TOKEN_EXP_KEY) || '0', 10);
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (token && Date.now() + TOKEN_EXPIRY_BUFFER_MS < exp) return token;

  // Silent refresh — first-time consent already granted at sign-in
  try {
    return await refreshAccessTokenSilently();
  } catch (err) {
    _dispatchNeedsReconnect();          // was signOut()+vdg:auth-expired — no blind sign-out
    throw err;
  }
}

function _dispatchNeedsReconnect() { window.dispatchEvent(new CustomEvent('vdg:auth-needs-reconnect')); }

// AC-03 — consolidated GIS token request, shared by silent + interactive paths. A settled
// latch races the callback against timeoutMs (0 = unbounded) so a non-settling GIS callback
// can never hang the caller (kills the banned silent-await).
function _requestAccessToken(prompt, timeoutMs) {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) { reject(new Error('GIS oauth2 not loaded')); return; }
    let settled = false;
    const timer = timeoutMs
      ? setTimeout(() => { if (!settled) { settled = true; reject(new Error('silent-refresh-timeout')); } }, timeoutMs)
      : null;
    const done = (fn, arg) => { if (!settled) { settled = true; if (timer) clearTimeout(timer); fn(arg); } };
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: window.__vdg_google_client_id || '566948941006-ju52hf1hvpiv8gv3qu6slt58c7utgicf.apps.googleusercontent.com',
      scope:     'https://www.googleapis.com/auth/drive.file',
      callback:  (resp) => {
        if (resp.error) { done(reject, new Error(resp.error)); return; }
        const expMs = Date.now() + (resp.expires_in || 3600) * 1000;
        localStorage.setItem(ACCESS_TOKEN_KEY,     resp.access_token);
        localStorage.setItem(ACCESS_TOKEN_EXP_KEY, String(expMs));
        done(resolve, resp.access_token);
      },
    });
    client.requestAccessToken({ prompt });
  });
}

function _silentRefresh() { return _requestAccessToken('', SILENT_REFRESH_TIMEOUT_MS); }          // AC-03 bounded
export function refreshAccessTokenSilently() { return _silentRefresh(); }                          // scheduler + getAccessToken + 401
export function reconnectDriveInteractive()  { return _requestAccessToken('consent', 0); }         // AC-06 interactive

// ── core fetch wrapper ────────────────────────────────────────────────────────

export async function driveFetch(method, path, body = undefined, attempt = 0) {
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

  if (res.status === 429 && attempt < RATE_LIMIT_MAX_ATTEMPTS) {
    await _sleep(RATE_LIMIT_BASE_MS * Math.pow(2, attempt));
    return driveFetch(method, path, body, attempt + 1);
  }

  if (res.status === 401) {
    if (attempt === 0 && !_reauthInflight) {
      _reauthInflight = true;
      try {
        await refreshAccessTokenSilently();               // ONE silent refresh
        return await driveFetch(method, path, body, attempt + 1);   // retry SAME request once
      } catch (reauthErr) {
        _dispatchNeedsReconnect();                        // AC-04: reconnect state, no reload
        throw new DriveApiError(401, 'Drive session expired — reconnect required');
      } finally {
        _reauthInflight = false;
      }
    }
    throw new DriveApiError(401, 'Drive session expired — reconnect required');   // concurrent / already-retried
  }

  if (!res.ok) {
    const text  = await res.text().catch(() => '');
    const error = new DriveApiError(res.status, `Drive API ${res.status}: ${text}`);
    if (res.status === 429) error.rateLimited = true;
    error.driveErrorKind = classifyDriveError(error);                                        // AC-04: tag every 403
    if (error.driveErrorKind === DRIVE_ERROR_KIND_SCOPE_INSUFFICIENT) clearDriveScopeGrant(); // AC-05
    throw error;
  }

  const ct = res.headers.get('Content-Type') || '';
  if (ct.includes('application/json')) return res.json();
  return { _raw: await res.text(), _headers: Object.fromEntries(res.headers) };
}

// driveFetch with ETag header support — returns full Response for header access
export async function driveFetchRaw(method, path, body = undefined, extraHeaders = {}, attempt = 0) {
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

  if (res.status === 429 && attempt < RATE_LIMIT_MAX_ATTEMPTS) {
    await _sleep(RATE_LIMIT_BASE_MS * Math.pow(2, attempt));
    return driveFetchRaw(method, path, body, extraHeaders, attempt + 1);
  }

  return res; // caller checks status
}

// ── folder helpers ────────────────────────────────────────────────────────────

export async function findFolder(parentId, name) {
  const q   = `name='${name}' and '${parentId}' in parents and mimeType='${FOLDER_MIME}' and trashed=false`;
  const res = await driveFetch('GET', `/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`);
  return res.files?.[0] ?? null;
}

export async function createFolder(parentId, name) {
  return driveFetch('POST', '/files', {
    name,
    mimeType: FOLDER_MIME,
    parents:  [parentId],
  });
}

// F-15-19 AC-1 + F-20-02 — Drive REST has no conditional-create so duplicate names
// can accumulate. Enforce idempotency: (1) list all matches, (2) if >1 keep the
// lowest-id folder and delete the rest, (3) if 0 create + re-list to catch racers.
//
// F-24-13: 'parentId' in parents' query MISSES orphan (parents=[]) and alt-parent
// (parents pointing elsewhere) folders — Drive's "Drive của tôi" UI lists by
// ownership, not lineage, so a folder can drift off the expected parent and still
// silently coexist. `scoped: false` switches to an owner-wide search + reparent/
// dedup pass; only the workspace-root lookup needs this (nested folders keep the
// cheap parent-scoped query since same-name siblings under other users are expected).
export async function getOrCreateFolder(parentId, name, { scoped = true } = {}) {
  if (!scoped) {
    const found  = await globalOwnerQuery(driveFetch, name);
    const winner = await dedupeGlobalOwnerFolders(driveFetch, found, parentId);
    return winner ?? createFolder(parentId, name);
  }

  const q = `name='${name}' and '${parentId}' in parents and mimeType='${FOLDER_MIME}' and trashed=false`;
  const found = (await driveFetch('GET', `/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`)).files || [];
  if (found.length === 0) {
    const created = await createFolder(parentId, name);
    const after = (await driveFetch('GET', `/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`)).files || [];
    return _dedupeSameNameFolders(after, created);
  }
  return _dedupeSameNameFolders(found, found[0]);
}

async function _dedupeSameNameFolders(all, fallback) {
  if (all.length <= 1) return all[0] || fallback;
  const sorted = all.slice().sort((a, b) => a.id.localeCompare(b.id));
  for (const dup of sorted.slice(1)) {
    try { await driveFetch('DELETE', `/files/${dup.id}`); }
    catch (err) { console.warn('[drive-api] dedup delete failed:', err.message); } // DEV
  }
  return sorted[0];
}

// F-24-07 partial: some ACL paths (e.g. users/{sales_prefix}) don't exist yet the first time a
// SalesRep is added — create every missing segment under parentId so assignRole's folder lookup
// (resolvePathToFolderId) doesn't throw "ACL path not found".
export async function getOrCreateFolderPath(parentId, path) {
  let current = parentId;
  for (const segment of path.split('/').filter(Boolean)) {
    current = (await getOrCreateFolder(current, segment)).id;
  }
  return current;
}

export async function listChildren(parentId) {
  const q   = `'${parentId}' in parents and trashed=false`;
  const res = await driveFetch('GET', `/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType)&spaces=drive`);
  return res.files || [];
}

export async function putPermission(fileId, email, role) {
  return driveFetch('POST', `/files/${fileId}/permissions`, {
    type:         'user',
    role,
    emailAddress: email,
  });
}

export async function listPermissions(fileId) {
  const res = await driveFetch('GET', `/files/${fileId}/permissions?fields=permissions(id,emailAddress,role)&spaces=drive`);
  return res.permissions || [];
}

export async function deletePermission(fileId, permissionId) {
  await driveFetch('DELETE', `/files/${fileId}/permissions/${permissionId}`);
}

// ── file read/write ───────────────────────────────────────────────────────────

export async function getFile(fileId) {
  const res = await driveFetchRaw('GET', `${DRIVE_API_BASE}/files/${fileId}?alt=media`);
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new DriveApiError(res.status, `getFile ${res.status}: ${text}`);
  }
  const content = await res.text();
  const etag    = res.headers.get('ETag') || res.headers.get('etag') || null;
  return { content, etag };
}

// D-01 fix (F-23-06 rework): PATCH-vs-POST is decided by caller intent (isUpdate / a known
// fileId), never by etag truthiness alone. A file can legitimately have no ETag on a Drive
// files.get response (confirmed live for reconciliation-log.jsonl) — treating that as "create
// new" makes uploadFile POST with the existing fileId as parent, which Drive rejects with
// 403 "parent not folder". etag now only controls the If-Match header, not the HTTP method.
export async function uploadFile(parentId, name, content, etag = null, { isUpdate = false } = {}) {
  const updating = isUpdate || Boolean(etag);
  const metadata = JSON.stringify({ name, parents: updating ? undefined : [parentId] });
  const blob     = new Blob([content], { type: 'text/plain' });
  const form     = new FormData();
  form.append('metadata', new Blob([metadata], { type: 'application/json' }));
  form.append('media',    blob);

  if (updating) {
    // PATCH existing — parentId is actually the fileId here; If-Match only when caller has
    // a real etag to CAS against (single-writer callers like the reconciliation log pass none).
    const res = await driveFetchRaw(
      'PATCH',
      `${DRIVE_UPLOAD_BASE}/files/${parentId}?uploadType=multipart`,
      form,
      etag ? { 'If-Match': etag } : {},
    );
    if (!res.ok) {
      const text  = await res.text().catch(() => '');
      throw new DriveApiError(res.status, `uploadFile PATCH ${res.status}: ${text}`);
    }
    const data    = await res.json();
    const newEtag = res.headers.get('ETag') || res.headers.get('etag') || `etag-${Date.now()}`;
    return { id: data.id, etag: newEtag };
  }

  // POST new file
  const res = await driveFetchRaw(
    'POST',
    `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart`,
    form,
    {},
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new DriveApiError(res.status, `uploadFile POST ${res.status}: ${text}`);
  }
  const data    = await res.json();
  const newEtag = res.headers.get('ETag') || res.headers.get('etag') || `etag-${Date.now()}`;
  return { id: data.id, etag: newEtag };
}

// ── JSONL codec (pure — no DOM/Drive deps) ────────────────────────────────────

export function parseJsonlBundle(text) {
  if (!text) return [];
  return text.split('\n')
    .filter((l) => l.trim())
    .reduce((acc, line) => {
      try { acc.push(JSON.parse(line)); }
      catch { console.warn('[drive-api] malformed JSONL line skipped:', line.slice(0, 80)); } // DEV
      return acc;
    }, []);
}

export function serializeJsonlBundle(entities) {
  return entities.map((e) => JSON.stringify(e)).join('\n') + '\n';
}

// ── utils ─────────────────────────────────────────────────────────────────────

function _sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
