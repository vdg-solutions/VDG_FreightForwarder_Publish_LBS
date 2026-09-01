// platform/governance.js — extra platform methods the Rust governance use-cases import
// (js_governance.rs extern type). Raw passthrough, no decisions: the workspace tree with its ERROR
// detail intact, the staff table, the two audit trails, and the ledger's balances.
import { storageApi } from '../../implementations/storage/core_abstractions/storage-api.js';
import { activeWorkspaceName } from '../../implementations/storage/core_abstractions/workspace-registry.js';
import { fxRateRepo } from '../../implementations/ui/core_abstractions/ports/storage/fx-rate-repo.js';

const UNKNOWN_OP_MESSAGE = 'unknown workspace op';

function userRepo()   { return window.__vdg_user_repo || null; }
function ledgerRepo() { return window.__vdg_ledger_repo || null; }

// This file's own header says "raw passthrough, no decisions" — `userRepo()?.get(...) ?? null`
// broke that promise twice over. A repo that is not mounted YET, and a read that came back with
// nothing, both produced `null`, and `resolve_principal` reads a null grant as a decided "this
// account holds no roles". That is the same collapse that locked every non-Manager out of the app
// through the HTTP layer (CDB-API-08's 404), arriving by a second route that has nothing to do
// with a status code: a boot-order race.
//
// Throwing is the honest answer. Rust already separates the two — `ResolvePrincipal::resolve`
// keeps the roles it holds on `Err(_)` and only republishes on a value — so an unmounted repo
// must reach it as a failure, never as an empty answer.
const REPO_NOT_MOUNTED = 'user repo not mounted yet';
function requireUserRepo() {
  const repo = userRepo();
  if (!repo) throw new Error(REPO_NOT_MOUNTED);
  return repo;
}

/// The status and the rate-limit flag travel with the error instead of being flattened to a
/// string, so a caller can tell a retryable Drive 429 apart from a real failure.
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

  governance_users_list:   async ()       => await requireUserRepo().list(),
  governance_users_get:    async (email)  => await requireUserRepo().get(email),
  governance_users_upsert: async (record) => await requireUserRepo().upsert(record),
  governance_users_remove: async (email)  => { await requireUserRepo().remove(email); },
  // H4-e: the raw, restorable grant shape (no Users-screen role/workspace/created_at/active
  // projection) — the workspace backup export's own reach (UserStoreRepo.listRaw()).
  governance_users_list_raw: async ()     => await requireUserRepo().listRaw(),

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

  // F1: reuses the same fx-rates domain island the FX admin screen and the sales-new P&L form
  // resolve through — period close asks for a number the same way a P&L line does.
  governance_fx_closing_rate: async (date, pair, direction) => fxRateRepo.getRate(date, pair, direction),
};
