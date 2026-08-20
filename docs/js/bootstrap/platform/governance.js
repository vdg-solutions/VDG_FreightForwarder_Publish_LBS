// platform/governance.js — extra platform methods the Rust governance use-cases import
// (js_governance.rs extern type). Raw passthrough, no decisions: the workspace tree with its ERROR
// detail intact, the staff roster, the two audit trails, the ledger's balances, and the local
// membership evidence a first-run decision rests on.
import { storageApi } from '../../implementations/storage/core_abstractions/storage-api.js';
import { activeWorkspaceName } from '../../implementations/storage/core_abstractions/workspace-registry.js';
import { recallGrantAreas } from '../../implementations/storage/core_abstractions/grant-file.js';

import { readCachedIdentityNow } from './auth.js';

const UNKNOWN_OP_MESSAGE = 'unknown workspace op';

function userRepo()   { return window.__vdg_user_repo || null; }
function ledgerRepo() { return window.__vdg_ledger_repo || null; }

/// The Drive cascade cannot tell a tolerable 403 (drive.file scope, sharing burst) from a real
/// denial once the error has been flattened to a string — so the status and the rate-limit flag
/// travel with it instead of being thrown away.
async function workspaceTry(op, args) {
  const api = storageApi();
  if (typeof api[op] !== 'function') {
    return { ok: false, error: { message: `${UNKNOWN_OP_MESSAGE}: ${op}` } };
  }
  try {
    const value = await api[op](...(Array.isArray(args) ? args : [args]));
    return { ok: true, value: value ?? null };
  } catch (err) {
    return {
      ok: false,
      error: {
        message: err?.message ?? String(err),
        status: err?.status ?? null,
        rate_limited: err?.rateLimited === true,
      },
    };
  }
}

export const governancePlatform = {
  governance_workspace_try: workspaceTry,
  governance_workspace_name: async () => activeWorkspaceName() || '',
  governance_workspace_root: async () => {
    const found = await workspaceTry('findWorkspaceRoot', [activeWorkspaceName()]);
    return found.ok ? found.value : null;
  },

  governance_users_list:   async ()       => (await userRepo()?.list()) ?? [],
  governance_users_get:    async (email)  => (await userRepo()?.get(email)) ?? null,
  governance_users_upsert: async (record) => (await userRepo()?.upsert(record)) ?? record,
  governance_users_remove: async (email)  => { await userRepo()?.remove(email); },

  governance_audit_append: async (kind, subject, action, detail) => {
    window.__vdg_audit_log?.append(kind, subject, action, detail);
  },
  governance_user_audit_write: async (action, email, before, after, driveOps) => {
    window.__vdg_user_audit_log?.write(action, email, before, after, driveOps);
  },

  governance_ledger_accounts: async () => (await ledgerRepo()?.chartOfAccounts()) ?? [],
  governance_ledger_balance:  async (account, asOf) => {
    const repo = ledgerRepo();
    if (!repo) throw new Error('ledger repo not ready');
    return repo.getBalance(account, asOf);
  },

  governance_membership_evidence: async () => {
    const cached = readCachedIdentityNow();
    return { grant_area_count: recallGrantAreas().length, cached_role: cached?.role ?? null };
  },

  // Drive's file index is eventually consistent; a path lookup waits before it believes a miss.
  governance_sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};
