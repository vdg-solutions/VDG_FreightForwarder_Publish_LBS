// F-24-13 — owner-wide folder dedup/reparent helpers, split out of drive-api.js (R-B 350-line
// cap). Takes `driveFetch` as a param instead of importing it, so this module has no import-
// cycle back to drive-api.js (which re-exports moveToParent as public surface).
//
// Root cause: F-20-02's getOrCreateFolder query used `'${parentId}' in parents`, which MISSES
// orphan folders (parents=[], original parent deleted) and alt-parent folders (parents point
// elsewhere) — Drive's "Drive của tôi" UI lists by ownership, not lineage, so those coexist
// silently. An owner-wide search + classify + reparent/delete pass reconciles them.

const FOLDER_MIME = 'application/vnd.google-apps.folder';

// F-34-03: under drive.file scope Google never exposes My Drive's real root, so a
// GET /files/root always 404s (F-24-16) — probing it is pure waste. Log the degrade
// once per boot, not once per findWorkspaceRoot caller (~20 call sites).
let _rootAliasNoticed = false;

// 'root' is a Drive API alias — files.list resolves it server-side but a file's own
// `parents` field always carries the real folder id, never the literal string. Owner-wide
// classification needs the real id to compare against.
// F-24-16 / F-34-03: /files/root is structurally unresolvable under drive.file scope —
// short-circuit straight to null with zero driveFetch calls. Dedupe then treats all
// matches as "unclassifiable" and picks the lowest-id as best-effort (unchanged).
export async function resolveRealParentId(driveFetch, parentId) {
  if (parentId !== 'root') return parentId;
  if (!_rootAliasNoticed) {
    _rootAliasNoticed = true;
    console.warn('[drive-folder-dedup] /files/root not visible under drive.file scope; degrading'); // DEV
  }
  return null;
}

export async function globalOwnerQuery(driveFetch, name) {
  const q = `name='${name}' and 'me' in owners and mimeType='${FOLDER_MIME}' and trashed=false`;
  return (await driveFetch('GET', `/files?q=${encodeURIComponent(q)}&fields=files(id,name,parents)&spaces=drive`)).files || [];
}

export async function moveToParent(driveFetch, fileId, newParentId, removeParents = []) {
  const removeArg = removeParents.length ? `&removeParents=${removeParents.join(',')}` : '';
  return driveFetch('PATCH', `/files/${fileId}?addParents=${newParentId}${removeArg}&fields=id,parents`, {});
}

function _classifyFolderKind(folder, realParentId) {
  if (folder.parents?.includes(realParentId)) return 'valid';
  if (!folder.parents || folder.parents.length === 0) return 'orphan';
  return 'alt-parent';
}

async function _deleteFolders(driveFetch, folders) {
  for (const f of folders) {
    try { await driveFetch('DELETE', `/files/${f.id}`); }
    catch (err) { console.warn('[drive-folder-dedup] delete failed:', err.message); } // DEV
  }
}

// Classify owner-wide matches into valid child / orphan / alt-parent, then: prefer a valid
// child; else reparent the lowest-id orphan; else reparent the lowest-id alt-parent; else
// signal "none" (null) so the caller decides create-vs-report-missing.
export async function dedupeGlobalOwnerFolders(driveFetch, found, parentIdLiteral) {
  if (found.length === 0) return null;

  const realParentId = await resolveRealParentId(driveFetch, parentIdLiteral);

  // F-24-16: real root id invisible under drive.file scope — can't classify, pick
  // lowest-id as best-effort (never delete anything since we can't prove ownership).
  if (realParentId === null) {
    const sorted = found.slice().sort((a, b) => a.id.localeCompare(b.id));
    return sorted[0];
  }

  const classified    = found.map((f) => ({ ...f, kind: _classifyFolderKind(f, realParentId) }));
  const valid         = classified.filter((f) => f.kind === 'valid');
  const orphans       = classified.filter((f) => f.kind === 'orphan');
  const altParents    = classified.filter((f) => f.kind === 'alt-parent');

  if (valid.length > 0) {
    const sorted = valid.slice().sort((a, b) => a.id.localeCompare(b.id));
    await _deleteFolders(driveFetch, [...sorted.slice(1), ...orphans, ...altParents]);
    return sorted[0];
  }
  if (orphans.length > 0) {
    const sorted = orphans.slice().sort((a, b) => a.id.localeCompare(b.id));
    const keeper = sorted[0];
    await moveToParent(driveFetch, keeper.id, realParentId, keeper.parents || []);
    await _deleteFolders(driveFetch, [...sorted.slice(1), ...altParents]);
    return { ...keeper, parents: [realParentId] };
  }
  if (altParents.length > 0) {
    const sorted = altParents.slice().sort((a, b) => a.id.localeCompare(b.id));
    const keeper = sorted[0];
    await moveToParent(driveFetch, keeper.id, realParentId, keeper.parents || []);
    await _deleteFolders(driveFetch, sorted.slice(1));
    return { ...keeper, parents: [realParentId] };
  }
  return null;
}
