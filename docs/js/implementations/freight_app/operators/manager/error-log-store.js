// Error-log access for the /manager/errors viewer.
//
// Reading is a store read: error_log is a kind (sync/error-log.js writes it with repo.put), so the
// viewer gets it from the local DB like every other kind — it used to walk the Drive folder tree
// itself and parse the monthly JSONL by hand, which put a view on the Drive path and made it blind
// to anything the delta tick had already fetched.
//
// Purging is the one operation with no store equivalent: it drops a whole month's bundle FILE.
// That is storage administration, so it lives here rather than in the view.

import { activeWorkspaceName } from '../../../storage/core_abstractions/workspace-registry.js';

const ERROR_LOG_KIND  = 'error_log';
const ERROR_LOG_PATH  = '_shared/error-log';
const BUNDLE_EXT      = '.jsonl';
const KEEP_MONTHS     = 6;
const MONTH_BUNDLE_RE = /^\d{4}-\d{2}\.jsonl$/;
const MONTH_KEY_LEN   = 7;                        // 'YYYY-MM'

/// Newest first. An unavailable store yields an empty log, not a thrown view.
export async function listErrorRecords(repo = null) {
  const store = repo || (typeof window !== 'undefined' ? window.__vdg_repo : null);
  if (!store?.list) return [];
  const rows = await store.list(ERROR_LOG_KIND);
  return (rows || []).slice().sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));
}

/// Deletes one month's bundle. Drive-level by necessity — see the header.
export async function purgeErrorMonth(driveApi, month) {
  const folderId = await errorLogFolder();
  if (!folderId) return;

  const fileName = `${month}${BUNDLE_EXT}`;
  const q   = `name='${fileName}' and '${folderId}' in parents and trashed=false`;
  const res = await driveApi.driveFetch('GET', `/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`);
  const file = res.files?.[0];
  if (!file) return;
  await driveApi.driveFetch('DELETE', `/files/${file.id}`);
}

/// Resolves `_shared/error-log`, or null when the workspace or the folder is not there yet.
export async function errorLogFolder() {
  const { findWorkspaceRoot, findFolder } = await import('../../../storage/core_abstractions/storage-api.js');
  const wsRoot = await findWorkspaceRoot(activeWorkspaceName());
  if (!wsRoot) return null;

  let cur = wsRoot;
  for (const part of ERROR_LOG_PATH.split('/')) {
    const folder = await findFolder(cur, part);
    if (!folder) return null;
    cur = folder.id;
  }
  return cur;
}

/// Month bundles that fall outside the retention window, newest-kept-first. Pure, so the cutoff
/// is testable without a Drive. A name that is not `YYYY-MM.jsonl` is not a month bundle and
/// never expires here — whatever else lives in the folder is somebody else's to reason about.
export function expiredErrorMonths(names, now = new Date(), keep = KEEP_MONTHS) {
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (keep - 1), 1));
  const oldestKept = `${cutoff.getUTCFullYear()}-${String(cutoff.getUTCMonth() + 1).padStart(2, '0')}`;
  return names.filter((n) => MONTH_BUNDLE_RE.test(n) && n.slice(0, MONTH_KEY_LEN) < oldestKept);
}

/// Drops expired month bundles from an already-resolved folder. Returns what it dropped.
///
/// The log had a per-session write cap and no expiry at all, so it only ever grew — 477 KB of it
/// by 2026-08 — and the one way to shrink it was a manager opening the errors view and pressing
/// purge per month, which is a cleanup nobody performs. Bundles are TRASHED, not deleted: Drive
/// empties its own trash after 30 days, so the window closes itself and a wrong cutoff stays
/// recoverable until it does.
export async function pruneErrorFolder(driveApi, folderId, now = new Date()) {
  const q   = `'${folderId}' in parents and trashed=false`;
  const res = await driveApi.driveFetch(
    'GET', `/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive&pageSize=1000`);
  const files   = res.files ?? [];
  const expired = new Set(expiredErrorMonths(files.map((f) => f.name), now));

  const dropped = [];
  for (const file of files) {
    if (!expired.has(file.name)) continue;
    await driveApi.driveFetch('PATCH', `/files/${file.id}`, { trashed: true });
    dropped.push(file.name);
  }
  return dropped;
}

/// Boot entry point: resolve the folder, then prune it. A workspace without an error-log folder
/// has nothing to prune, which is a result and not a failure.
export async function pruneErrorLog(driveApi, now = new Date()) {
  const folderId = await errorLogFolder();
  if (!folderId) return [];
  return pruneErrorFolder(driveApi, folderId, now);
}
