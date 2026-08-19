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

const FOLDER_MIME       = 'application/vnd.google-apps.folder';
const ROOT_ALIAS        = 'root';
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
  if ((m = q.match(/'([^']+)' in parents/)))       out.parent = m[1];
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
    const res = await apiFetch('GET', `/ws/nodes/${encodeURIComponent(q.parent)}/children`);
    files = (res.files ?? []).map(toFile);
  } else if (q.ownedByMe || q.sharedWithMe) {
    // Owner-wide / shared-with-me name searches exist to FIND the workspace root. There is one
    // root and it is 'root'; whether it answers depends on the account, not on Drive's index.
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

async function fileGet(id, url) {
  const node = await apiFetch('GET', `/ws/nodes/${encodeURIComponent(id)}`);
  const me   = id === ROOT_ALIAS ? await _meCached() : null;
  const f = toFile(node);
  if (me) f.ownedByMe = me.is_owner === true;
  if (url.searchParams.get('alt') === 'media') return { media: node.content ?? '', etag: node.etag };
  return f;
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
      if (seg[1] === 'startPageToken') return ok(await apiFetch('GET', '/ws/changes/start'));
      return ok(await apiFetch('GET', `/ws/changes?pageToken=${encodeURIComponent(url.searchParams.get('pageToken') || '0')}`));
    }
    if (seg[0] !== 'files') return fail(HTTP_BAD_REQUEST, `unsupported: ${method} ${p}`);

    // /files (collection)
    if (seg.length === 1) {
      if (method === 'GET') return ok(await filesList(url));
      if (method === 'POST') {
        if (body instanceof FormData) {
          const { metadata, content } = await multipartParts(body);
          const parent = metadata.parents?.[0] ?? ROOT_ALIAS;
          const node = await apiFetch('POST', '/ws/nodes', { parentId: parent, name: metadata.name, content });
          return ok(toFile(node), { etag: node.etag });
        }
        const parent = body?.parents?.[0] ?? ROOT_ALIAS;
        const node = await apiFetch('POST', '/ws/nodes',
          { parentId: parent, name: body?.name, folder: body?.mimeType === FOLDER_MIME, content: '' });
        return ok(toFile(node), { etag: node.etag });
      }
    }

    const id = seg[1];
    // /files/:id/permissions[/:pid] — acknowledged; the server's ACL is the grant file.
    if (seg[2] === 'permissions') {
      if (method === 'GET')    return ok({ permissions: [] });
      if (method === 'POST')   return ok({ id: PERMISSION_ID, role: body?.role ?? 'reader', emailAddress: body?.emailAddress ?? '' });
      if (method === 'DELETE') return noContent();
    }
    // /files/:id
    if (method === 'GET') {
      const r = await fileGet(id, url);
      if ('media' in r) return { status: HTTP_OK, body: r.media, headers: { etag: r.etag } };
      return ok(r);
    }
    if (method === 'DELETE') { await apiFetch('DELETE', `/ws/nodes/${encodeURIComponent(id)}`); return noContent(); }
    if (method === 'PATCH') {
      if (body instanceof FormData) {
        const { content } = await multipartParts(body);
        const node = await apiFetch('PUT', `/ws/nodes/${encodeURIComponent(id)}/content`,
          { content, etag: extraHeaders['If-Match'] ?? '' });
        return ok(toFile(node), { etag: node.etag });
      }
      const patch = {};
      const addParent = url.searchParams.get('addParents');
      if (addParent) patch.parentId = addParent;
      if (body?.name !== undefined) patch.name = body.name;
      if (body?.trashed === true) patch.trashed = true;
      if (Object.keys(patch).length === 0) {
        // removeParents alone = detach; the server has single parents, so detach = trash.
        if (url.searchParams.get('removeParents')) patch.trashed = true;
        else return ok(await fileGet(id, url));
      }
      const node = await apiFetch('PATCH', `/ws/nodes/${encodeURIComponent(id)}`, patch);
      return node ? ok(toFile(node), { etag: node.etag }) : noContent();
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
