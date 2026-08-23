// server-drive-shim.js — the Drive REST subset the app speaks, answered by vdg-server.
//
// Thirty-odd modules call driveApi (driveFetch / driveFetchRaw and the helpers on top of them)
// with a dozen distinct request shapes: files.list by `q`, files.get, multipart upload, PATCH
// (rename / move / trash), DELETE, permissions.*, about, changes. Rewriting each caller for the
// server would touch every business feature at once. This shim translates those shapes 1:1 onto
// /api/ws/* so the callers keep the contract they already have and the server becomes the store.
//
// Permissions are the one place the meaning changed rather than the wire: the server enforces
// access from the grant files it stores, so a putPermission is acknowledged and recorded nowhere —
// the grant the same flow publishes right after IS the permission.

import { apiFetch } from '../../core_abstractions/backend.js';
import { ApiError } from '../../core_abstractions/api-error.js';
import { DriveApiError } from '../../core_abstractions/drive-errors.js';
import { classifyDriveError } from '../../core_abstractions/drive-error-classifier.js';
import { BUILD_ROOT_ID } from '../../core_abstractions/workspace-config.js';

const FOLDER_MIME       = 'application/vnd.google-apps.folder';
const ROOT_ALIAS        = 'root';

// F-42-07 meets client-server: a bound build asks for its tenant's Drive folder id, but this
// server serves exactly ONE workspace (the license already matched it) — so the bound id IS the
// server's root. Without the alias every root lookup 404s and the app reads "Workspace root not
// found" while signed in as the owner.
function aliasId(id) { return BUILD_ROOT_ID && id === BUILD_ROOT_ID ? ROOT_ALIAS : id; }
const HTTP_OK           = 200;
const HTTP_NO_CONTENT   = 204;
const HTTP_NOT_FOUND    = 404;
const HTTP_BAD_REQUEST  = 400;
const SYNTHETIC_QUOTA   = '1099511627776'; // 1 TiB — the quota chip has nothing to warn about
const PERMISSION_ID     = 'server-acl';

let _me = null; // GET /me, cached per page — the owner answers the `'me' in owners` root query
async function _meCached() {
  if (!_me) _me = await apiFetch('GET', '/me');
  return _me;
}

class ShimResponse {
  constructor(status, body, headers = {}) {
    this.status     = status;
    this.ok         = status >= HTTP_OK && status < 300;
    this.statusText = String(status);
    this._body      = body;
    this._headers   = headers;
    this.headers    = { get: (k) => this._headers[String(k).toLowerCase()] ?? null };
  }
  async text() { return typeof this._body === 'string' ? this._body : JSON.stringify(this._body ?? ''); }
  async json() { return typeof this._body === 'string' ? JSON.parse(this._body) : this._body; }
}

/// Node (server) → file resource (Drive shape the callers read).
function toFile(n) {
  return {
    id: n.id, name: n.name, mimeType: n.mimeType ?? n.mime ?? '',
    parents: n.parentId ? [n.parentId] : (n.parent_id ? [n.parent_id] : []),
    version: String(n.version ?? 1), etag: n.etag ?? null,
    trashed: false, modifiedTime: '', createdTime: '',
  };
}

// ── q parsing ────────────────────────────────────────────────────────────────

function parseQ(q) {
  const out = { parent: null, name: null, nameContains: null, folderOnly: null, sharedWithMe: false, ownedByMe: false };
  let m;
  if ((m = q.match(/'([^']+)' in parents/)))       out.parent = aliasId(m[1]);
  if ((m = q.match(/name\s*=\s*'([^']*)'/)))       out.name = m[1];
  if ((m = q.match(/name contains '([^']*)'/)))    out.nameContains = m[1];
  if (q.includes(`mimeType='${FOLDER_MIME}'`))     out.folderOnly = true;
  if (q.includes(`mimeType!='${FOLDER_MIME}'`) || q.includes(`mimeType != '${FOLDER_MIME}'`)) out.folderOnly = false;
  if (q.includes('sharedWithMe'))                  out.sharedWithMe = true;
  if (q.includes("'me' in owners"))                out.ownedByMe = true;
  return out;
}

async function filesList(url) {
  const q = parseQ(url.searchParams.get('q') || '');
  let files = [];
  if (q.parent) {
    try {
      const res = await apiFetch('GET', `/records/${encodeURIComponent(q.parent)}`);
      files = (res?.records ?? []).map((r) => toFile({
        id: `${q.parent}/${r.id}`,
        name: r.id,
        version: r.version,
        etag: r.etag,
      }));
    } catch { files = []; }
  } else if (q.ownedByMe || q.sharedWithMe) {
    const me = await _meCached();
    const isWorkspace = !q.name || q.name === me.workspace;
    const reachable = q.ownedByMe ? me.is_owner : (!me.is_owner && ((me.roles ?? []).length > 0));
    if (isWorkspace && reachable) {
      files = [{ id: ROOT_ALIAS, name: me.workspace, mimeType: FOLDER_MIME, parents: [], version: '1',
                 trashed: false, ownedByMe: me.is_owner, createdTime: '', modifiedTime: '' }];
    }
  }
  if (q.name !== null)         files = files.filter((f) => f.name === q.name);
  if (q.nameContains !== null) files = files.filter((f) => f.name.includes(q.nameContains));
  if (q.folderOnly === true)   files = files.filter((f) => f.mimeType === FOLDER_MIME);
  if (q.folderOnly === false)  files = files.filter((f) => f.mimeType !== FOLDER_MIME);
  return { files };
}

function parseFileId(fileId) {
  const norm = String(fileId || '').replace(/\/+/g, '/');
  let col = 'root', id = norm;
  if (norm.includes('/')) {
    const idx = norm.lastIndexOf('/');
    col = norm.slice(0, idx);
    id = norm.slice(idx + 1);
  }
  return { col, id };
}

async function fileGet(rawId, url) {
  if (rawId === ROOT_ALIAS) {
    const me = await _meCached();
    return { id: ROOT_ALIAS, name: me.workspace, mimeType: FOLDER_MIME, parents: [], version: '1', trashed: false, ownedByMe: me.is_owner === true, createdTime: '', modifiedTime: '' };
  }
  const { col, id } = parseFileId(rawId);
  try {
    const res = await apiFetch('GET', `/records/${encodeURIComponent(col)}/${encodeURIComponent(id)}`);
    const node = res;
    const f = toFile({ id: rawId, name: node.id, version: node.version, etag: node.etag });
    if (url.searchParams.get('alt') === 'media') return { media: node.content ?? '', etag: node.etag };
    return f;
  } catch (err) {
    if (err instanceof ApiError && err.status === HTTP_NOT_FOUND) {
      if (id === 'state.json' || id === 'all.jsonl') {
        const content = id === 'state.json' ? '{}' : '';
        const f = toFile({ id: rawId, name: id, version: '1', etag: '' });
        if (url.searchParams.get('alt') === 'media') return { media: content, etag: '' };
        return f;
      }
    }
    throw err;
  }
}

async function multipartParts(form) {
  const metaBlob = form.get('metadata');
  const media    = form.get('media');
  const metadata = metaBlob ? JSON.parse(await metaBlob.text()) : {};
  const content  = media ? await media.text() : '';
  return { metadata, content };
}

// ── the dispatcher ───────────────────────────────────────────────────────────

/// Handle one Drive-shaped request. Returns { status, body, headers }.
export async function handle(method, path, body = undefined, extraHeaders = {}) {
  const url = new URL(path.startsWith('http') ? path : `https://drive.local${path}`);
  const p   = url.pathname.replace(/^\/(upload\/)?drive\/v3/, '');
  const seg = p.split('/').filter(Boolean); // e.g. ['files', id, 'permissions', pid]
  try {
    // /about
    if (seg[0] === 'about') {
      const me = await _meCached();
      return ok({ storageQuota: { limit: SYNTHETIC_QUOTA, usage: '0', usageInDrive: '0' }, user: { emailAddress: me.email } });
    }
    // /changes
    if (seg[0] === 'changes') {
      if (seg[1] === 'startPageToken') {
        const res = await apiFetch('GET', '/changes/start');
        return ok({ startPageToken: res?.next_cursor || '0' });
      }
      const since = url.searchParams.get('pageToken') || '0';
      const res = await apiFetch('GET', `/changes?since=${encodeURIComponent(since)}`);
      const changes = (res?.results ?? []).map((c) => ({
        file: { id: `${c.collection}/${c.id}`, name: c.id, version: String(c.version), parents: [c.collection] },
        removed: c.event === 'removed',
        fileId: `${c.collection}/${c.id}`,
        changeType: 'file',
        time: '',
      }));
      return ok({ newStartPageToken: res?.next_cursor || since, changes });
    }
    if (seg[0] !== 'files') return fail(HTTP_BAD_REQUEST, `unsupported: ${method} ${p}`);

    // /files (collection)
    if (seg.length === 1) {
      if (method === 'GET') return ok(await filesList(url));
      if (method === 'POST') {
        const me = await _meCached();
        if (body instanceof FormData) {
          const { metadata, content } = await multipartParts(body);
          const parent = decodeURIComponent(aliasId(metadata.parents?.[0] ?? ROOT_ALIAS));
          if (metadata.mimeType === FOLDER_MIME || ((parent === 'root' || parent === 'root/shared' || parent === 'root/_shared' || parent === 'root/admin') && !content)) {
            return ok(toFile({ id: `${parent}/${metadata.name}`, name: metadata.name, mimeType: FOLDER_MIME, version: '1', parentId: parent }));
          }
          const res = await apiFetch('POST', `/records/${encodeURIComponent(parent)}`, { id: metadata.name, content, owner: me.email });
          return ok(toFile({ id: `${parent}/${res.id}`, name: res.id, version: res.version }), { etag: res.etag });
        }
        const parent = decodeURIComponent(aliasId(body?.parents?.[0] ?? ROOT_ALIAS));
        const name = body?.name || 'file';
        
        if (body?.mimeType === FOLDER_MIME || (parent === 'root' && (name === 'shared' || name === '_shared' || name === 'admin')) || parent === 'root/_shared') {
          return ok(toFile({ id: `${parent}/${name}`, name, mimeType: FOLDER_MIME, version: '1', parentId: parent }));
        }

        try {
          const res = await apiFetch('POST', `/records/${encodeURIComponent(parent)}`, { id: name, content: '', owner: me.email });
          return ok(toFile({ id: `${parent}/${res.id}`, name: res.id, version: res.version }), { etag: res.etag });
        } catch (err) {
          if (err instanceof ApiError && err.status === 409) {
            return ok(toFile({ id: `${parent}/${name}`, name, version: '1', parentId: parent }));
          }
          throw err;
        }
      }
    }

    const rawId = aliasId(seg[1]);
    // /files/:id/permissions[/:pid] — acknowledged; the server's ACL is the grant file.
    if (seg[2] === 'permissions') {
      if (method === 'GET')    return ok({ permissions: [] });
      if (method === 'POST')   return ok({ id: PERMISSION_ID, role: body?.role ?? 'reader', emailAddress: body?.emailAddress ?? '' });
      if (method === 'DELETE') return noContent();
    }
    // /files/:id
    if (method === 'GET') {
      const r = await fileGet(rawId, url);
      if ('media' in r) return { status: HTTP_OK, body: r.media, headers: { etag: r.etag } };
      return ok(r);
    }
    if (method === 'DELETE') {
      const { col, id } = parseFileId(rawId);
      if (col === 'root' || id === 'shared' || id === '_shared' || id === 'admin' || !id) {
        return noContent();
      }
      try {
        await apiFetch('DELETE', `/records/${encodeURIComponent(col)}/${encodeURIComponent(id)}`);
      } catch (err) {
        if (err instanceof ApiError && err.status === HTTP_NOT_FOUND) {
          return noContent();
        }
        throw err;
      }
      return noContent();
    }
    if (method === 'PATCH' || method === 'PUT') {
      const { col, id } = parseFileId(rawId);
      if (body instanceof FormData) {
        const { content } = await multipartParts(body);
        const res = await apiFetch('PUT', `/records/${encodeURIComponent(col)}/${encodeURIComponent(id)}`,
          { content }, { 'If-Match': extraHeaders['If-Match'] ?? '' });
        return ok(toFile({ id: rawId, name: res.id, version: res.version }), { etag: res.etag });
      }
      if (body?.trashed === true) {
        if (col === 'root' && (id === 'shared' || id === '_shared' || id === 'admin')) {
          return noContent();
        }
        try {
          await apiFetch('DELETE', `/records/${encodeURIComponent(col)}/${encodeURIComponent(id)}`);
        } catch (err) {
          if (err instanceof ApiError && err.status === HTTP_NOT_FOUND) {
            // Ignore 404s for deletion since folders are pseudo-records
          } else {
            throw err;
          }
        }
        return noContent();
      }
      return ok(await fileGet(rawId, url));
    }
    return fail(HTTP_BAD_REQUEST, `unsupported: ${method} ${p}`);
  } catch (err) {
    if (err instanceof ApiError) {
      // Same envelope Drive sends, so classifyDriveError and every `err.status` branch behave.
      return { status: err.status, body: { error: { code: err.status, message: err.message, errors: [{ message: err.message, reason: err.status === HTTP_NOT_FOUND ? 'notFound' : 'forbidden' }] } }, headers: {} };
    }
    throw err;
  }
}

function ok(body, headers = {}) { return { status: HTTP_OK, body, headers }; }
function noContent() { return { status: HTTP_NO_CONTENT, body: '', headers: {} }; }
function fail(status, message) { return { status, body: { error: { code: status, message } }, headers: {} }; }

/// driveFetchRaw's shape: a Response-like.
export async function fetchRaw(method, path, body, extraHeaders) {
  const r = await handle(method, path, body, extraHeaders);
  return new ShimResponse(r.status, r.body, { 'content-type': typeof r.body === 'string' ? 'text/plain' : 'application/json', ...r.headers });
}

/// driveFetch's shape: JSON body, throws on non-2xx (the caller wraps into DriveApiError).
export async function fetchJson(method, path, body) {
  const r = await handle(method, path, body);
  return r;
}

/// Test seam.
export function _resetShim() { _me = null; }

const HTTP_UNAUTHORIZED = 401;

/// The server transport behind the storage-api port's driveFetch: the same request shape the tree
/// helpers send, answered by vdg-server. A non-2xx is the Drive-shaped error the callers branch on;
/// a 401 flips the app into reconnect state.
async function driveFetch(method, path, body = undefined) {
  const r = await handle(method, path, body);
  if (r.status >= 200 && r.status < 300) return r.body === '' ? {} : r.body;
  const error = new DriveApiError(r.status, `Drive API ${r.status}: ${JSON.stringify(r.body)}`);
  if (r.status === HTTP_UNAUTHORIZED) window.dispatchEvent(new CustomEvent('vdg:auth-needs-reconnect'));
  error.driveErrorKind = classifyDriveError(error);
  throw error;
}

/// driveFetchRaw over the server: the Response-shaped reply fetchRaw builds.
const driveFetchRaw = fetchRaw;

/// The transport object the storage bootstrap binds in server mode.
export const serverTransport = { driveFetch, driveFetchRaw };
