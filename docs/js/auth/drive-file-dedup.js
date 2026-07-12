// F-19-23 D-01 — per-file getOrCreate dedupe for monthly log JSONL shards, split out of
// drive-api.js (R-B 350-line cap). Takes driveFetch/uploadFile as params instead of importing,
// mirrors drive-folder-dedup.js so there's no import-cycle back to drive-api.js.
//
// Root cause: dunning/audit/error log writers query-then-create on first write of the month
// (empty session cache); two concurrent first-writes both miss the by-name query and both
// POST, leaving duplicate same-name JSONL shards in the same folder (F-19-21 QA D-01).

export async function getOrCreateFile(driveFetch, uploadFile, parentId, name, initialContent) {
  const q = _query(parentId, name);
  const found = await _list(driveFetch, q);

  if (found.length === 0) {
    const created = await uploadFile(parentId, name, initialContent, null, { isUpdate: false });
    // re-list to catch a racer that created the same name meanwhile
    const after = await _list(driveFetch, q);
    return _dedupe(driveFetch, after, { id: created.id });
  }
  return _dedupe(driveFetch, found, found[0]);
}

function _query(parentId, name) {
  return `name='${name}' and '${parentId}' in parents and trashed=false`;
}

async function _list(driveFetch, q) {
  const res = await driveFetch('GET', `/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`);
  return res.files || [];
}

async function _dedupe(driveFetch, all, fallback) {
  if (all.length <= 1) return all[0] || fallback;
  const sorted = all.slice().sort((a, b) => a.id.localeCompare(b.id));
  for (const dup of sorted.slice(1)) {
    try { await driveFetch('DELETE', `/files/${dup.id}`); }
    catch (err) { console.warn('[drive-file-dedup] dedup delete failed:', err.message); } // DEV
  }
  return sorted[0];
}
