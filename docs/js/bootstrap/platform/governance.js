// platform/governance.js — extra platform methods the Rust governance use-cases import
// (js_governance.rs extern type). Raw passthrough, no decisions: the staff table, the two audit
// trails, and the ledger's balances.
import { activeWorkspaceName } from '../../implementations/storage/core_abstractions/workspace-registry.js';
import { fxRateRepo } from '../../implementations/ui/core_abstractions/ports/storage/fx-rate-repo.js';

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

export const governancePlatform = {
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
