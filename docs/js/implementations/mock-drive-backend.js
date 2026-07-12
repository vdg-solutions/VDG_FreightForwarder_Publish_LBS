// MockDriveBackend — Drop-in for drive-api.js, localStorage-backed.
// Activate: localStorage.setItem('vdg.driveMode','mock') or URL ?mock=1

import { parseJsonlBundle, serializeJsonlBundle, DriveApiError, ConcurrencyError } from '../auth/drive-api.js';
import { classifyDriveError, DRIVE_ERROR_KIND_SCOPE_INSUFFICIENT, DRIVE_REASON_SCOPE_INSUFFICIENT } from '../auth/drive-error-classifier.js';
import { clearDriveScopeGrant } from '../auth/google-oauth.js';

export { parseJsonlBundle, serializeJsonlBundle, DriveApiError, ConcurrencyError };

const NS_FS          = 'vdg.mock-drive.fs.';
const NS_PERMS       = 'vdg.mock-drive.perms.';
const NS_INDEX       = 'vdg.mock-drive.index.';
const SEQ_KEY        = 'vdg.mock-drive.id-seq';
const FORCE429       = 'vdg.mock-drive.force-429';
const FORCE_SCOPE_403 = 'vdg.mock-drive.force-scope-403'; // F-24-19 test seam, parallel to FORCE429

// Hardcoded test identity (PM decision: PM email = manager, azureljas = sales)
const MOCK_MANAGER_EMAIL = 'clashclanbcbc@gmail.com';
const MOCK_SALES_PREFIX  = 'azureljas';
const MOCK_ROOT_NAME     = 'LBS';
const FOLDER_MIME        = 'application/vnd.google-apps.folder';

function nextId() {
  const seq = parseInt(localStorage.getItem(SEQ_KEY) || '0', 10) + 1;
  localStorage.setItem(SEQ_KEY, String(seq));
  return `mock-${seq}`;
}

function fsGet(id) {
  const raw = localStorage.getItem(NS_FS + id);
  return raw ? JSON.parse(raw) : null;
}

function fsSet(id, val) {
  localStorage.setItem(NS_FS + id, JSON.stringify(val));
}

function indexGet(parentId) {
  const raw = localStorage.getItem(NS_INDEX + parentId);
  return raw ? JSON.parse(raw) : [];
}

function indexAdd(parentId, childId) {
  const ids = indexGet(parentId);
  if (!ids.includes(childId)) {
    ids.push(childId);
    localStorage.setItem(NS_INDEX + parentId, JSON.stringify(ids));
  }
}

function _ensureMockRoot() {
  const existing = _findByName('root', MOCK_ROOT_NAME);
  if (existing) return existing.id;
  const id = nextId();
  fsSet(id, { name: MOCK_ROOT_NAME, parentId: 'root', content: null, etag: null, mimeType: FOLDER_MIME, createdAt: Date.now() });
  indexAdd('root', id);

  // Seed admin/ folder
  const adminId = nextId();
  fsSet(adminId, { name: 'admin', parentId: id, content: null, etag: null, mimeType: FOLDER_MIME, createdAt: Date.now() });
  indexAdd(id, adminId);

  // Seed users/<sales-prefix>/ folder
  const usersId = nextId();
  fsSet(usersId, { name: 'users', parentId: id, content: null, etag: null, mimeType: FOLDER_MIME, createdAt: Date.now() });
  indexAdd(id, usersId);

  const salesId = nextId();
  fsSet(salesId, { name: MOCK_SALES_PREFIX, parentId: usersId, content: null, etag: null, mimeType: FOLDER_MIME, createdAt: Date.now() });
  indexAdd(usersId, salesId);

  return id;
}

function _findByName(parentId, name) {
  const ids = indexGet(parentId);
  for (const id of ids) {
    const entry = fsGet(id);
    if (entry && entry.name === name) return { id, ...entry };
  }
  return null;
}

function _checkForce429() {
  if (localStorage.getItem(FORCE429) === '1') {
    localStorage.removeItem(FORCE429);
    throw new DriveApiError(429, 'mock forced 429');
  }
}

// F-24-19: reuses the REAL production classifier + clearDriveScopeGrant — gated behind the
// existing vdg.driveMode=mock opt-in, so this is a test seam, not a production mock (R-E).
function _checkForceScope403() {
  if (localStorage.getItem(FORCE_SCOPE_403) !== '1') return;
  localStorage.removeItem(FORCE_SCOPE_403);
  const err = new DriveApiError(403, `mock forced 403: reason=${DRIVE_REASON_SCOPE_INSUFFICIENT}`);
  err.driveErrorKind = classifyDriveError(err);
  if (err.driveErrorKind === DRIVE_ERROR_KIND_SCOPE_INSUFFICIENT) clearDriveScopeGrant();
  throw err;
}

// ── public API ────────────────────────────────────────────────────────────────

export async function getAccessToken() {
  return 'mock-token';
}

export async function driveFetch(method, path, body = undefined) {
  _checkForce429();
  // Route to internal handlers based on path
  const filesListRe = /\/files\?/;
  if (method === 'GET' && filesListRe.test(path)) {
    const qs     = path.split('?')[1] || '';
    const params = new URLSearchParams(qs);
    const q      = params.get('q') || '';
    return _handleFilesList(q);
  }
  if (method === 'POST' && path === '/files') {
    return _handleCreateFolder(body);
  }
  if (method === 'POST' && /\/files\/[^/]+\/permissions/.test(path)) {
    const fileId = path.match(/\/files\/([^/]+)\/permissions/)[1];
    return _handleCreatePermission(fileId, body);
  }
  return { files: [] };
}

export async function findFolder(parentId, name) {
  const entry = _findByName(parentId, name);
  if (!entry) return null;
  return { id: entry.id, name: entry.name };
}

export async function createFolder(parentId, name) {
  let entry = _findByName(parentId, name);
  if (!entry) {
    const id = nextId();
    fsSet(id, { name, parentId, content: null, etag: null, mimeType: FOLDER_MIME, createdAt: Date.now() });
    indexAdd(parentId, id);
    entry = { id, name };
  }
  return { id: entry.id, name: entry.name };
}

// F-24-13: mock has no owner/orphan concept (single-tenant localStorage fs) — `scoped`
// param accepted for signature parity with drive-api.js, always parent-keyed.
export async function getOrCreateFolder(parentId, name, _opts = {}) {
  _checkForceScope403();
  return createFolder(parentId, name);
}

export async function listChildren(parentId) {
  return indexGet(parentId).map((id) => {
    const e = fsGet(id);
    return e ? { id, name: e.name, mimeType: e.mimeType } : null;
  }).filter(Boolean);
}

export async function putPermission(fileId, email, role) {
  const raw  = localStorage.getItem(NS_PERMS + fileId);
  const list = raw ? JSON.parse(raw) : [];
  list.push({ email, role });
  localStorage.setItem(NS_PERMS + fileId, JSON.stringify(list));
  return { id: nextId(), email, role };
}

export async function getFile(fileId) {
  const entry = fsGet(fileId);
  if (!entry || entry.content === null) return null;
  return { content: entry.content, etag: entry.etag };
}

// D-01 fix: mirror drive-api.js — PATCH vs POST is decided by caller intent (isUpdate /
// known fileId), not by etag truthiness (a real file can come back with etag:null).
export async function uploadFile(parentOrFileId, name, content, etag = null, { isUpdate = false } = {}) {
  if (isUpdate || etag) {
    // PATCH — parentOrFileId is the fileId
    const entry = fsGet(parentOrFileId);
    if (!entry) throw new DriveApiError(404, 'mock file not found');
    if (etag && entry.etag && entry.etag !== etag) throw new DriveApiError(412, 'mock ETag mismatch');
    const newEtag = `mock-etag-${Date.now()}`;
    fsSet(parentOrFileId, { ...entry, content, etag: newEtag });
    return { id: parentOrFileId, etag: newEtag };
  }
  // POST — parentOrFileId is parentId
  const id      = nextId();
  const newEtag = `mock-etag-${Date.now()}`;
  fsSet(id, { name, parentId: parentOrFileId, content, etag: newEtag, mimeType: 'text/plain', createdAt: Date.now() });
  indexAdd(parentOrFileId, id);
  return { id, etag: newEtag };
}

// F-17-03: honour the real drive-api contract — required explicit name, null when falsy
// (no name means no registered workspace ⇒ NOT_PROVISIONED), before ensuring any mock root.
// Without this guard the mock backend would bypass the workspace gate entirely.
export async function findWorkspaceRoot(name) {
  if (!name) return null;
  return _ensureMockRoot();
}

export async function listChildFolder(parentId, name) {
  return findFolder(parentId, name);
}

// ── internal mock handlers ────────────────────────────────────────────────────

function _handleFilesList(q) {
  // Parse simple Drive query: name='X' and 'Y' in parents
  const nameMatch   = q.match(/name='([^']+)'/);
  const parentMatch = q.match(/'([^']+)' in parents/);
  if (!nameMatch || !parentMatch) return { files: [] };
  const name     = nameMatch[1];
  const parentId = parentMatch[1];
  const entry    = _findByName(parentId, name);
  return { files: entry ? [{ id: entry.id, name: entry.name }] : [] };
}

function _handleCreateFolder(body) {
  if (!body || body.mimeType !== FOLDER_MIME) return {};
  const parentId = body.parents?.[0] || 'root';
  const id       = nextId();
  fsSet(id, { name: body.name, parentId, content: null, etag: null, mimeType: FOLDER_MIME, createdAt: Date.now() });
  indexAdd(parentId, id);
  return { id, name: body.name, mimeType: FOLDER_MIME };
}

function _handleCreatePermission(fileId, body) {
  return putPermission(fileId, body.emailAddress, body.role);
}
