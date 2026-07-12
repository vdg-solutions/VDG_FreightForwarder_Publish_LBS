// F-15-12 — Dunning ledger: append-only JSONL per month

const DUNNING_LOG_PATH = '_shared/dunning-log';

// Month-key → {fileId, etag}
const _cache = new Map();

let _driveApi     = null;
let _rootFolderId = null;

export function initDunningLog(driveApi) {
  _driveApi = driveApi;
}

/**
 * Append a dunning event record (fire-and-forget).
 * @param {{ customer_id, stage, sent_at, channel, sent_by, template_id, billing_ids }} entry
 */
export function appendDunning(entry) {
  if (!_driveApi) return;
  _appendAsync(entry).catch((err) => {
    console.error('[dunning-log] append failed:', err); // DEV
  });
}

// ── private ────────────────────────────────────────────────────────────────────

async function _appendAsync(entry) {
  const now    = new Date();
  const month  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const record = {
    id:          `DUN-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ts:          now.toISOString(),
    customer_id: entry.customer_id || '',
    stage:       entry.stage       || '',
    sent_at:     entry.sent_at     || now.toISOString(),
    channel:     entry.channel     || 'mailto',
    sent_by:     entry.sent_by     || 'unknown',
    template_id: entry.template_id || '',
    billing_ids: entry.billing_ids || [],
  };

  const { serializeJsonlBundle, parseJsonlBundle } = await import('../auth/drive-api.js');
  const folderId = await _ensureFolder();
  const fileName = `${month}.jsonl`;
  const cacheKey = month;

  let fileId = null;
  let etag   = null;
  if (_cache.has(cacheKey)) {
    const c = _cache.get(cacheKey);
    fileId  = c.fileId;
    etag    = c.etag;
  }

  let existingContent = '';
  if (fileId) {
    const data = await _driveApi.getFile(fileId);
    if (data) { existingContent = data.content; etag = data.etag; }
  } else {
    // F-19-23 D-01: getOrCreateFile dedupes concurrent first-writes of the same month shard
    const { getOrCreateFile } = await import('../auth/drive-file-dedup.js');
    const file = await getOrCreateFile(_driveApi.driveFetch, _driveApi.uploadFile, folderId, fileName, '');
    fileId     = file.id;
    const data = await _driveApi.getFile(fileId);
    if (data) { existingContent = data.content; etag = data.etag; }
  }

  const existing = parseJsonlBundle(existingContent);
  existing.push(record);
  const content = serializeJsonlBundle(existing);

  const uploadTarget = fileId ?? folderId;
  const result       = await _driveApi.uploadFile(uploadTarget, fileName, content, fileId ? etag : null, { isUpdate: Boolean(fileId) });
  _cache.set(cacheKey, { fileId: result.id, etag: result.etag });
}

async function _ensureFolder() {
  if (_rootFolderId) return _rootFolderId;
  const { findWorkspaceRoot, findFolder, createFolder } = await import('../auth/drive-api.js');
  const { activeWorkspaceName } = await import('../operators/workspace-registry.js');
  const wsRoot = await findWorkspaceRoot(activeWorkspaceName());
  if (!wsRoot) throw new Error('Workspace root missing');

  let current = wsRoot;
  for (const part of DUNNING_LOG_PATH.split('/')) {
    let f = await findFolder(current, part);
    if (!f) f = await createFolder(current, part);
    current = f.id;
  }
  _rootFolderId = current;
  return current;
}
