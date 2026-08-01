// repost-log.jsonl bundle + read/write helpers — extracted from ledger-drive-repo.js for the
// 350-line cap (F-29-24). Mirrors ledger-drive-repo.js's own _loadReconciliationLogBundle shape
// (folder -> find-or-none -> getFile -> cache etag); sibling-file split precedent:
// ledger-unbalanced-modal.js's extraction from ledger-viewer.js for the same reason.
import { parseJsonlBundle } from '../auth/drive-api.js';

const REPOST_LOG_FILE_NAME = 'repost-log.jsonl'; // lives in _shared/ledger/, alongside reconciliation-log.jsonl

/// Takes the owning LedgerDriveRepo instance so it can reuse its folder/file plumbing
/// (_ensureLedgerFolder, _findAccountFile, _api) and cache field (_repostLogFile) without
/// duplicating that logic here.
export async function loadRepostLogBundle(repo) {
  const folderId  = await repo._ensureLedgerFolder();
  const fileName  = REPOST_LOG_FILE_NAME;
  const fileEntry = repo._repostLogFile ?? await repo._findAccountFile(folderId, fileName);
  if (!fileEntry) return { items: [], fileId: null, etag: null, folderId, fileName };

  const data = await repo._api.getFile(fileEntry.id);
  if (!data) return { items: [], fileId: null, etag: null, folderId, fileName };

  const etag = data.etag || fileEntry.etag || null;
  repo._repostLogFile = { id: fileEntry.id, etag };
  return { items: parseJsonlBundle(data.content), fileId: fileEntry.id, etag, folderId, fileName };
}

/// F-29-24 AC-03: append one repost-run record. Always appends — no dedup, one row per run
/// including zero-op runs (mirrors appendReconciliationRecord).
export async function appendRepostRecord(repo, record) {
  return repo._appendJsonlLine({
    loadBundle:      () => loadRepostLogBundle(repo),
    findDup:         null,
    invalidateCache: () => { repo._repostLogFile = null; },
    cacheSet:        (result) => { repo._repostLogFile = { id: result.id, etag: result.etag }; },
  }, record);
}

/// F-29-24: most recent repost-log record by run_at, or null if none yet.
export async function getLastRepost(repo) {
  const { items } = await loadRepostLogBundle(repo);
  if (!items.length) return null;
  return items.reduce((latest, r) => (!latest || r.run_at > latest.run_at ? r : latest), null);
}
