// compose-ui/flows-admin.js — the admin half of the flows bindings: the licence gate, the user
// lifecycle, the workspace backup, ledger posting and the P&L commit. Split from flows.js at the
// obvious seam; composeFlows calls it.
import { bindLicenseGate } from '../../implementations/ui/core_abstractions/ports/flows/license.js';
import { bindBackupExporter } from '../../implementations/ui/core_abstractions/ports/flows/backup-exporter.js';
import { bindUserProvisioning } from '../../implementations/ui/core_abstractions/ports/flows/user-provisioning.js';
import { bindLedgerPoster } from '../../implementations/ui/core_abstractions/ports/flows/ledger-poster.js';
import { bindPnlCommit } from '../../implementations/ui/core_abstractions/ports/flows/pnl-commit-orchestrator.js';
import { t } from '../../implementations/kernel/core_abstractions/i18n/index.js';

const BACKUP_PROGRESS_EVENT = 'vdg:backup-progress';
const EMPTY = {};

/// The reply shape every write-side flows export answers with: throw what the view used to throw.
function unwrap(reply, pick) {
  if (!reply.ok) throw new Error(t(reply.error));
  return pick(reply);
}

export function composeFlowsAdmin(wasm) {
  bindLicenseGate({
    resolveLicenseState: () => wasm.flows_license_resolve(EMPTY),
    errorKindMessage: (kind, translate = t) => translate(wasm.flows_license_error_key({ error_kind: kind ?? null }).key),
  });

  bindBackupExporter({
    // The operator emits progress as an i18n KEY plus its arguments; the translation is the ui's.
    exportWorkspace: async (_repo, _driveApi, onProgress = () => {}) => {
      const relay = (e) => onProgress(e.detail.pct, t(e.detail.key, e.detail.args));
      window.addEventListener(BACKUP_PROGRESS_EVENT, relay);
      try {
        return unwrap(await wasm.flows_export_workspace(EMPTY), (r) => r.filename);
      } finally {
        window.removeEventListener(BACKUP_PROGRESS_EVENT, relay);
      }
    },
  });

  bindUserProvisioning({
    inviteSales: async (email, name, _driveApi, _repo, workspaceRootId) =>
      unwrap(
        await wasm.flows_invite_sales({ email, name: name ?? null, workspace_root_id: workspaceRootId ?? null }),
        (r) => r.user,
      ),
    promoteToManager: async (userId, _driveApi, _repo, adminFolderId) =>
      unwrap(
        await wasm.flows_promote_to_manager({ user_id: String(userId), admin_folder_id: adminFolderId ?? null }),
        (r) => r.user,
      ),
    disableUser: async (userId) =>
      unwrap(await wasm.flows_disable_user({ user_id: String(userId) }), (r) => r.user),
    editProfile: async (userId, fields) =>
      unwrap(await wasm.flows_edit_profile({ user_id: String(userId), fields: fields || {} }), (r) => r.user),
  });

  bindLedgerPoster({
    buildEntriesFromShipment: (shipment, chart, rules) =>
      unwrap(
        wasm.flows_build_entries_from_shipment({ source: shipment || {}, chart_of_accounts: chart || [], posting_rules: rules || {} }),
        (r) => r.entries,
      ),
    buildEntriesFromCommission: (commissionEntry, chart, rules) =>
      unwrap(
        wasm.flows_build_entries_from_commission({ source: commissionEntry || {}, chart_of_accounts: chart || [], posting_rules: rules || {} }),
        (r) => r.entries,
      ),
    buildReversalEntry: (legs, chart, actorId) =>
      unwrap(
        wasm.flows_build_reversal_entry({ legs: legs || [], chart_of_accounts: chart || [], actor_id: actorId ?? null }),
        (r) => r.entry,
      ),
    postShipment: async (shipment) =>
      unwrap(await wasm.flows_post_shipment({ shipment: shipment || {} }), (r) => ({ posted: r.posted, entryIds: r.entry_ids })),
    postCommission: async (commissionEntry) =>
      unwrap(await wasm.flows_post_commission({ commission_entry: commissionEntry || {} }), (r) => ({ posted: r.posted, entryIds: r.entry_ids })),
    postReversal: async (entryId, actorId) =>
      unwrap(
        await wasm.flows_post_reversal({ entry_id: String(entryId), actor_id: actorId ?? null }),
        (r) => ({ posted: r.posted, entryIds: r.entry_ids }),
      ),
  });

  bindPnlCommit({
    commitPnlReport: async (report) =>
      unwrap(await wasm.flows_commit_pnl_report({ report: report || {} }), (r) => ({
        created_shipments: r.created_shipments,
        created_lines:     r.created_lines,
        new_customers:     r.new_customers,
        new_carriers:      r.new_carriers,
      })),
    computeAndPersistSalesCommission: async (shipment, pnlLines) =>
      unwrap(
        await wasm.flows_sales_commission({ shipment: shipment || {}, pnl_lines: pnlLines || [] }),
        (r) => r.persisted,
      ),
    slugify: (text) => wasm.flows_slugify({ text: text ?? null }).slug,
  });
}
