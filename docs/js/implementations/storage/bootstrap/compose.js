// compose.js — the storage module's composition root: every port in core_abstractions gets its
// adapter here, and ONE decision is made (which storage authority this page talks to):
//
//   server — vdg-server (SQLite), same origin or a tunneled API_BASE; the server shim transport

import { bindBackend } from '../core_abstractions/backend.js';
import { bindServerSession } from '../core_abstractions/server-session.js';
import { bindPopupGuard } from '../core_abstractions/popup-guard.js';
import { bindProfileCache } from '../core_abstractions/profile-cache.js';
import { bindTokenAnchorFactory } from '../core_abstractions/token-anchor.js';
import { bindTokenAuthority } from '../core_abstractions/token.js';
import { bindOAuthProvider } from '../core_abstractions/oauth.js';
import { bindIdentityProvider } from '../core_abstractions/identity.js';
import { bindLocalStore } from '../core_abstractions/local-store.js';
import { bindEventBus } from '../core_abstractions/events.js';
import { bindStorageApi } from '../core_abstractions/storage-api.js';
import { bindWorkspaceAuthority } from '../core_abstractions/workspace-authority.js';
import { bindUserDirectory } from '../core_abstractions/user-directory.js';

import { backend } from '../implementations/server/backend.js';
import { serverSession } from '../implementations/server/server-session.js';
import { createUser, listUsers, patchUser } from '../implementations/server/server-users.js';
import { serverWorkspaceAuthority } from '../implementations/server/server-role.js';
import { ServerIoPort } from '../implementations/server/server-io-adapters.js';
import { popupGuard } from '../implementations/auth/window-open-guard.js';
import { profileCache } from '../implementations/auth/profile-cache.js';
import { tokenAnchorFactory } from '../implementations/auth/token-anchor.js';
import { tokenAuthority } from '../implementations/auth/access-token.js';
import { identityProvider, oauthProvider } from '../implementations/auth/google-oauth.js';
import { localStoreClient } from '../implementations/local/store-client.js';

export const BACKEND_SERVER = 'server';
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

/// Decide once, bind once. Never throws — an unreachable API is simply the Drive backend.
export async function composeStorage() {
  const backendKind = await backend.detectBackend();
  // The Drive REST shim is gone: every live caller now speaks CharterDB directly (apiFetch, or
  // the ws_* record API through ServerIoPort). Nothing implements this port anymore — bound empty
  // so storageApi() still resolves for the handle repo-init-steps.js threads through unused, and
  // the workspace_call/governance_workspace_try op dispatchers keep answering "unknown op" per call
  // instead of the whole boot throwing at bind time.
  bindStorageApi({});
  bindWorkspaceAuthority(serverWorkspaceAuthority);
  return backendKind;
}

/// The IoPort the wasm repo runs on: same contract either way, only where the bytes go differs.
export function createIoPort(serverApi, userEmail, forkPrefix) {
  return new ServerIoPort(serverApi, userEmail, forkPrefix);
}



