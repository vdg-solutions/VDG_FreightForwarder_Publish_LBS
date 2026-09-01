// compose.js — the storage module's composition root: every port in core_abstractions gets its
// adapter here. There is exactly one storage authority: vdg-server (SQLite), same origin or a
// tunneled API_BASE.

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
import { bindWorkspaceAuthority } from '../core_abstractions/workspace-authority.js';
import { bindUserDirectory } from '../core_abstractions/user-directory.js';
import { SharedIoPort } from '../core_abstractions/io-port-shared.js';

import { backend } from '../implementations/server/backend.js';
import { serverSession } from '../implementations/server/server-session.js';
import { createUser, listUsers, patchUser } from '../implementations/server/server-users.js';
import { serverWorkspaceAuthority } from '../implementations/server/server-role.js';
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

/// `?mock=1` or localStorage vdg.driveMode=mock: seeds a fake session for CDP/regression runs
/// (client/tests/local/seed, client/tests/regression) — the key predates the server split and is
/// unrelated to Google Drive today; left named as the test scripts already key on it.
export function isMockMode() {
  try {
    return new URLSearchParams(location.search).get(MOCK_QUERY_KEY) === '1'
      || localStorage.getItem(MOCK_MODE_KEY) === MOCK_MODE_VALUE;
  } catch { return false; /* no location/storage (worker, test) — the real transport */ }
}

/// Probe once, bind once. Never throws — an unreachable API is reported as an outage
/// (backend.js's own vdg:server-health dispatch), never a switch to a different backend.
export async function composeStorage() {
  const backendKind = await backend.detectBackend();
  bindWorkspaceAuthority(serverWorkspaceAuthority);
  return backendKind;
}

/// The IoPort the wasm repo runs on. Only the LOCAL half lives in JS (cache tier, event bus,
/// author identity, ledger repo — io-port-shared.js); every network method of the port is
/// implemented in Rust (js_io.rs overrides them onto http_io), so the old ServerIoPort — a
/// complete second copy of the wire contract — is gone rather than kept in step.
export function createIoPort(userEmail) {
  return new SharedIoPort(userEmail);
}



