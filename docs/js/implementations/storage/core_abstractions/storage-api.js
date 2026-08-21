// storage-api.js — port: the file-tree API the app's operators may drive directly (a workspace
// root, folders by name, a file's bytes with its etag, create-or-update, sharing). It is
// Drive-shaped because that is the contract every store above the IoPort was written against;
// the storage bootstrap binds the object — the Drive REST transport or vdg-server's shim under
// the same tree helpers. Operators import THIS, never an adapter.

let _api = null;

/// The bootstrap registers { driveFetch, driveFetchRaw, findFolder, createFolder, getOrCreateFolder,
/// getOrCreateFolderPath, listChildren, getFile, uploadFile, findWorkspaceRoot, ownsWorkspaceRoot,
/// resetWorkspaceRootCache, findSharedSubfolder, findSharedFilesByNamePrefix, listChildFolder,
/// renameFolder, moveToParent, globalOwnerQuery, getOrCreateFile } once.
export function bindStorageApi(api) { _api = api; }

/// The bound adapter, for callers that pass the whole api object around (`driveApi`).
export function storageApi() {
  if (!_api) throw new Error('storage/storage-api: no adapter bound (the storage bootstrap binds it)');
  return _api;
}

export const driveFetch = (...a) => storageApi().driveFetch(...a);
export const driveFetchRaw = (...a) => storageApi().driveFetchRaw(...a);
export const findFolder = (...a) => storageApi().findFolder(...a);
export const createFolder = (...a) => storageApi().createFolder(...a);
export const getOrCreateFolder = (...a) => storageApi().getOrCreateFolder(...a);
export const getOrCreateFolderPath = (...a) => storageApi().getOrCreateFolderPath(...a);
export const listChildren = (...a) => storageApi().listChildren(...a);
export const getFile = (...a) => storageApi().getFile(...a);
export const uploadFile = (...a) => storageApi().uploadFile(...a);
export const findWorkspaceRoot = (...a) => storageApi().findWorkspaceRoot(...a);
export const findSharedSubfolder = (...a) => storageApi().findSharedSubfolder(...a);
export const findSharedFilesByNamePrefix = (...a) => storageApi().findSharedFilesByNamePrefix(...a);
export const listChildFolder = (...a) => storageApi().listChildFolder(...a);
export const renameFolder = (...a) => storageApi().renameFolder(...a);
export const moveToParent = (...a) => storageApi().moveToParent(...a);
export const globalOwnerQuery = (...a) => storageApi().globalOwnerQuery(...a);
export const getOrCreateFile = (...a) => storageApi().getOrCreateFile(...a);
export const ownsWorkspaceRoot = (...a) => storageApi().ownsWorkspaceRoot(...a);
export const resetWorkspaceRootCache = (...a) => storageApi().resetWorkspaceRootCache(...a);

/// Test seam.
export function _resetStorageApi() { _api = null; }
