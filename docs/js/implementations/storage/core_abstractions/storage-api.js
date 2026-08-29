// storage-api.js — port: the leftover file-tree API a couple of pre-wasm callers still import
// directly. It used to front the Drive REST transport or vdg-server's server-drive-shim.js under
// the same tree helpers; both are gone now that CharterDB is the only backend. Operators import
// THIS, never an adapter.
//
// CharterDB has no folder tree: findWorkspaceRoot/findFolder/createFolder/getOrCreateFolder(Path)/
// listChildren/findSharedSubfolder/listChildFolder/renameFolder/moveToParent/globalOwnerQuery/
// ownsWorkspaceRoot/resetWorkspaceRootCache/driveFetchRaw/driveFetch/uploadFile/getOrCreateFile all
// threw "unsupported in native CharterDB mode" (or, after server-drive-shim.js's removal, plain
// "not a function") — every caller was a folder/ACL walk this redesign deleted (backup_export.rs's
// tree walk, the four user-access views' Drive ACL calls, the jobno-lease CAS counter which now
// speaks CharterDB directly from platform/flows.js). Deleted here too rather than left as dead
// re-exports nothing calls: a bound export nobody imports is not a smaller footprint, it is a
// second, silent invitation to call something that throws.

let _api = null;

/// The bootstrap binds an object here once — today it binds nothing (`{}`), because the Drive
/// REST transport this port fronted is gone. `getFile`/`findSharedFilesByNamePrefix` below still
/// resolve against whatever is bound, for the one remaining caller (the pre-wasm grant-file
/// reader) that has not been ported to a CharterDB record read.
export function bindStorageApi(api) { _api = api; }

/// The bound adapter, for callers that pass the whole api object around (`driveApi`).
export function storageApi() {
  if (!_api) throw new Error('storage/storage-api: no adapter bound (the storage bootstrap binds it)');
  return _api;
}

export const getFile = (...a) => storageApi().getFile(...a);
export const findSharedFilesByNamePrefix = (...a) => storageApi().findSharedFilesByNamePrefix(...a);

/// Test seam.
export function _resetStorageApi() { _api = null; }
