// Error-log access for the /manager/errors viewer.
//
// Reading is a store read: error_log is a kind (sync/error-log.js writes it with repo.put), so the
// viewer gets it from the local DB like every other kind — it used to walk the Drive folder tree
// itself and parse the monthly JSONL by hand, which put a view on the Drive path and made it blind
// to anything the delta tick had already fetched.
//
// Purging is the one operation with no store equivalent: it drops a whole month's bundle FILE.
// That is storage administration, so it lives here rather than in the view.

import { activeWorkspaceName } from '../workspace-registry.js';

const ERROR_LOG_KIND = 'error_log';
const ERROR_LOG_PATH = '_shared/error-log';
const BUNDLE_EXT     = '.jsonl';

/// Newest first. An unavailable store yields an empty log, not a thrown view.
export async function listErrorRecords(repo = null) {
  const store = repo || (typeof window !== 'undefined' ? window.__vdg_repo : null);
  if (!store?.list) return [];
  const rows = await store.list(ERROR_LOG_KIND);
  return (rows || []).slice().sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));
}

/// Deletes one month's bundle. Drive-level by necessity — see the header.
export async function purgeErrorMonth(driveApi, month) {
  const { findWorkspaceRoot, findFolder } = await import('../../auth/drive-api.js');
  const wsRoot = await findWorkspaceRoot(activeWorkspaceName());
  if (!wsRoot) return;

  let cur = wsRoot;
  for (const part of ERROR_LOG_PATH.split('/')) {
    const folder = await findFolder(cur, part);
    if (!folder) return;
    cur = folder.id;
  }

  const fileName = `${month}${BUNDLE_EXT}`;
  const q   = `name='${fileName}' and '${cur}' in parents and trashed=false`;
  const res = await driveApi.driveFetch('GET', `/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`);
  const file = res.files?.[0];
  if (!file) return;
  await driveApi.driveFetch('DELETE', `/files/${file.id}`);
}
