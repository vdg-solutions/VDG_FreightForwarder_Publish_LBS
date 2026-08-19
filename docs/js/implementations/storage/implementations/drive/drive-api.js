// drive-api.js — the Drive-shaped tree helpers (folders by name, idempotent create, children, a
// file's bytes with its etag, multipart create/update). They ride on the storage-api port's
// transport (driveFetch / driveFetchRaw), so the same helpers serve the Drive REST transport and
// vdg-server's shim; the bootstrap binds this object behind the port.

import { driveFetch, driveFetchRaw } from '../../core_abstractions/storage-api.js';
import { globalOwnerQuery, dedupeGlobalOwnerFolders } from '../../core_abstractions/folder-dedup.js';
import { rememberFolder, recallFolder } from '../../core_abstractions/folder-memo.js';
import { DriveApiError } from '../../core_abstractions/drive-errors.js';
import { FOLDER_MIME } from '../../core_abstractions/storage-layout.js';
import { DRIVE_API_BASE, DRIVE_UPLOAD_BASE } from '../../core_abstractions/drive-endpoints.js';

// ── folder helpers ────────────────────────────────────────────────────────────

// F-42-03: folder ids learned from Drive's own create/query responses, remembered until the
// files.list index catches up — see drive-folder-memo.js for why a query miss cannot be trusted.
async function findFolder(parentId, name) {
  const q   = `name='${name}' and '${parentId}' in parents and mimeType='${FOLDER_MIME}' and trashed=false`;
  const res = await driveFetch('GET', `/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`);
  const hit = res.files?.[0] ?? null;
  if (hit) { rememberFolder(parentId, name, hit.id); return hit; }
  const remembered = recallFolder(parentId, name);
  return remembered ? { id: remembered, name } : null;
}

async function createFolder(parentId, name) {
  const folder = await driveFetch('POST', '/files', {
    name,
    mimeType: FOLDER_MIME,
    parents:  [parentId],
  });
  rememberFolder(parentId, name, folder?.id);
  return folder;
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
async function getOrCreateFolder(parentId, name, { scoped = true } = {}) {
  if (!scoped) {
    const found  = await globalOwnerQuery(driveFetch, name);
    const winner = await dedupeGlobalOwnerFolders(driveFetch, found, parentId);
    return winner ?? createFolder(parentId, name);
  }

  const q = `name='${name}' and '${parentId}' in parents and mimeType='${FOLDER_MIME}' and trashed=false`;
  const found = (await driveFetch('GET', `/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`)).files || [];
  if (found.length === 0) {
    // F-42-03: an empty result is not proof of absence while the index lags. Creating anyway
    // would make the DUPLICATE this function exists to prevent.
    const remembered = recallFolder(parentId, name);
    if (remembered) return { id: remembered, name };
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

// F-24-07 partial: some ACL paths (e.g. users/{user_prefix}) don't exist yet the first time a
// user is added — create every missing segment under parentId so assignRole's folder lookup
// (resolvePathToFolderId) doesn't throw "ACL path not found".
async function getOrCreateFolderPath(parentId, path) {
  let current = parentId;
  for (const segment of path.split('/').filter(Boolean)) {
    current = (await getOrCreateFolder(current, segment)).id;
  }
  return current;
}

async function listChildren(parentId) {
  const q   = `'${parentId}' in parents and trashed=false`;
  const res = await driveFetch('GET', `/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType)&spaces=drive`);
  return res.files || [];
}

// ── file read/write ───────────────────────────────────────────────────────────

async function getFile(fileId) {
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
async function uploadFile(parentId, name, content, etag = null, { isUpdate = false } = {}) {
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

/// The tree helpers the storage bootstrap binds behind the storage-api port.
export const driveTree = { findFolder, createFolder, getOrCreateFolder, getOrCreateFolderPath, listChildren, getFile, uploadFile };
