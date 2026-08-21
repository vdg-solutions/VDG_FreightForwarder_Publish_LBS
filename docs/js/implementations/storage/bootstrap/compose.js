// compose.js — the storage module's composition root: every port in core_abstractions gets its
// adapter here, and ONE decision is made (which storage authority this page talks to):
//
//   drive  — Drive-as-database, the serverless deploy (GitHub Pages); the Google REST transport
//   server — vdg-server (SQLite), same origin or a tunneled API_BASE; the server shim transport
//
// The Drive-shaped tree helpers (drive-api.js), the workspace-root walk, sharing and the
// file/folder dedup are the same object under both transports — only driveFetch/driveFetchRaw
// and the workspace authority differ per backend. A third authority (gdrive-db, Firebase) is
// another transport + authority pair and one more branch in `composeStorage` — nothing above
// this module changes. `?mock=1` / localStorage vdg.driveMode=mock binds the localStorage mock.

import { bindBackend } from '../core_abstractions/backend.js';
import { bindServerSession } from '../core_abstractions/server-session.js';
import { bindPopupGuard } from '../core_abstractions/popup-guard.js';
import { bindProfileCache } from '../core_abstractions/profile-cache.js';
import { bindTokenAnchorFactory } from '../core_abstractions/token-anchor.js';
import { bindTokenAuthority } from '../core_abstractions/token.js';
import { bindOAuthProvider } from '../core_abstractions/oauth.js';
import { bindIdentityProvider } from '../core_abstractions/identity.js';
import { bindLocalStore } from '../core_abstractions/local-store.js';
import { bindFolderDedup } from '../core_abstractions/folder-dedup.js';
import { bindFileDedup } from '../core_abstractions/file-dedup.js';
import { bindBundleHealer } from '../core_abstractions/bundle-heal.js';
import { bindFolderResolver } from '../core_abstractions/folder-resolve.js';
import { bindGrantReader } from '../core_abstractions/grant-reader.js';
import { bindEventBus } from '../core_abstractions/events.js';
import { bindStorageApi } from '../core_abstractions/storage-api.js';
import { bindWorkspaceAuthority } from '../core_abstractions/workspace-authority.js';
import { bindUserDirectory } from '../core_abstractions/user-directory.js';

import { backend } from '../implementations/server/backend.js';
import { serverSession } from '../implementations/server/server-session.js';
import { createUser, listUsers, patchUser } from '../implementations/server/server-users.js';
import { serverTransport } from '../implementations/server/server-drive-shim.js';
import { serverWorkspaceAuthority } from '../implementations/server/server-role.js';
import { ServerIoPort } from '../implementations/server/server-io-adapters.js';
import { popupGuard } from '../implementations/drive/window-open-guard.js';
import { profileCache } from '../implementations/drive/profile-cache.js';
import { tokenAnchorFactory } from '../implementations/drive/token-anchor.js';
import { tokenAuthority } from '../implementations/drive/access-token.js';
import { identityProvider, oauthProvider } from '../implementations/drive/google-oauth.js';
import { localStoreClient } from '../implementations/local/store-client.js';
import { folderDedup } from '../implementations/drive/drive-folder-dedup.js';
import { fileDedup } from '../implementations/drive/drive-file-dedup.js';
import { bundleHealer } from '../implementations/drive/bundle-file-heal.js';
import { folderResolver } from '../implementations/drive/wasm-folder-resolve.js';
import { grantReader } from '../implementations/drive/grant-reader.js';
import { driveWorkspaceAuthority } from '../implementations/drive/drive-workspace-authority.js';
import { WasmIoPort } from '../implementations/drive/wasm-io-adapters.js';
import { driveTransport } from '../implementations/drive/drive-transport.js';
import { driveTree } from '../implementations/drive/drive-api.js';
import { workspaceRoot } from '../implementations/drive/workspace-root.js';
import { mockDrive } from '../implementations/drive/mock-drive-backend.js';

export const BACKEND_SERVER = 'server';
export const BACKEND_DRIVE  = 'drive';
const MOCK_MODE_KEY   = 'vdg.driveMode';
const MOCK_MODE_VALUE = 'mock';
const MOCK_QUERY_KEY  = 'mock';

// Static bindings: the adapters that do not depend on the backend. Done at module load so every
// later import in the boot (auth-gate, the role cache, the views) finds the ports bound.
bindBackend(backend);
bindServerSession(serverSession);
bindPopupGuard(popupGuard);
bindProfileCache(profileCache);
bindTokenAnchorFactory(tokenAnchorFactory);
bindTokenAuthority(tokenAuthority);
bindOAuthProvider(oauthProvider);
bindIdentityProvider(identityProvider);
bindLocalStore(localStoreClient);
bindFolderDedup(folderDedup);
bindFileDedup(fileDedup);
bindBundleHealer(bundleHealer);
bindFolderResolver(folderResolver);
bindGrantReader(grantReader);
bindEventBus({ dispatchAppEvent: (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail })) });
// F-46-03: user management is server-only by design (owner 2026-08-21) — no Drive-mode branch.
bindUserDirectory({ listUsers, createUser, patchUser });

/// `?mock=1` or localStorage vdg.driveMode=mock: the localStorage-backed Drive double.
export function isMockMode() {
  try {
    return new URLSearchParams(location.search).get(MOCK_QUERY_KEY) === '1'
      || localStorage.getItem(MOCK_MODE_KEY) === MOCK_MODE_VALUE;
  } catch { return false; /* no location/storage (worker, test) — the real transport */ }
}

/// The Drive-shaped tree api: the transport for THIS backend under the shared helpers.
function storageApiFor(transport) {
  return {
    driveFetch: transport.driveFetch,
    driveFetchRaw: transport.driveFetchRaw,
    findFolder: driveTree.findFolder,
    createFolder: driveTree.createFolder,
    getOrCreateFolder: driveTree.getOrCreateFolder,
    getOrCreateFolderPath: driveTree.getOrCreateFolderPath,
    listChildren: driveTree.listChildren,
    getFile: driveTree.getFile,
    uploadFile: driveTree.uploadFile,
    findWorkspaceRoot: workspaceRoot.findWorkspaceRoot,
    ownsWorkspaceRoot: workspaceRoot.ownsWorkspaceRoot,
    resetWorkspaceRootCache: workspaceRoot.resetWorkspaceRootCache,
    findSharedSubfolder: workspaceRoot.findSharedSubfolder,
    findSharedFilesByNamePrefix: workspaceRoot.findSharedFilesByNamePrefix,
    listChildFolder: workspaceRoot.listChildFolder,
    renameFolder: workspaceRoot.renameFolder,
    moveToParent: folderDedup.moveToParent,
    globalOwnerQuery: folderDedup.globalOwnerQuery,
    getOrCreateFile: fileDedup.getOrCreateFile,
  };
}

/// Decide once, bind once. Never throws — an unreachable API is simply the Drive backend.
export async function composeStorage() {
  const backendKind = await backend.detectBackend();
  const server = backend.isServerBackend();
  if (isMockMode()) bindStorageApi(mockDrive);
  else bindStorageApi(storageApiFor(server ? serverTransport : driveTransport));
  bindWorkspaceAuthority(server ? serverWorkspaceAuthority : driveWorkspaceAuthority);
  return backendKind;
}

/// The IoPort the wasm repo runs on: same contract either way, only where the bytes go differs.
export function createIoPort(driveApi, userEmail, forkPrefix) {
  return backend.isServerBackend()
    ? new ServerIoPort(driveApi, userEmail, forkPrefix)
    : new WasmIoPort(null, driveApi, userEmail);
}


