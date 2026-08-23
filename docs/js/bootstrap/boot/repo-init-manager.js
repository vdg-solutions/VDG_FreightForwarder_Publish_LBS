// repo-init-manager.js — the manager-only half of the deferred boot chain, split out of
// repo-init-steps.js at the 350-line cap. Everything here needs a workspace ROOT the caller
// already resolved a role for: orphan detection, ACL target folders, ledger/user seed,
// reconcile, cache warm. None of it is on the render path.

import { activeWorkspaceName } from '../../implementations/storage/core_abstractions/workspace-registry.js';
import { recallGrantAreas } from '../../implementations/storage/core_abstractions/grant-file.js';
import { isServerBackend } from '../../implementations/storage/core_abstractions/backend.js';

const ONBOARDING_ROUTE = '/onboarding';

export async function deferredManagerInit(user, driveApi, ledgerRepo, userRepo, repo) {
  const wsName   = activeWorkspaceName();
  // F-24-19: findWorkspaceRoot now distinguishes "genuinely absent" (null) from "Drive error"
  // (throws). Only a genuine null routes to onboarding — a transient failure must NOT, or a
  // dropped connection would bounce a provisioned manager into the onboarding loop.
  let wsRootId;
  try {
    wsRootId = await driveApi.findWorkspaceRoot(wsName);
  } catch (err) {
    console.warn('[repo-init] manager deferred init skipped (Drive transient):', err.message); // DEV
    return; // background — retries next boot; never onboarding on a transient error
  }
  if (!wsRootId) {
    // E-43: a null root is "no workspace" only for someone who would be able to SEE one. A Manager
    // who does not own the root holds no permission on it — `resolve_grants` never emits the root,
    // and granting it would inherit read into every table — so `files.get` answers 404 for them by
    // design. If their grant manifest names folders, the workspace demonstrably exists and they are
    // already provisioned into it; sending them to onboarding there offers to CREATE A SECOND
    // WORKSPACE in their own Drive, which is exactly how a duplicate "LBS" folder appeared.
    if (recallGrantAreas().length > 0) {
      console.warn('[repo-init] manager without root access — provisioned via manifest, skipping onboarding'); // DEV
      return;
    }
    location.hash = ONBOARDING_ROUTE;
    return;
  }

  // Orphan workspace detection — a Drive-only concern: it exists to catch the browser racing
  // itself into creating two "LBS" folders in the SIGNED-IN USER's own Drive. F-46-02: only the
  // server's account ever touches Drive now, and this build's root is the one workspace it is
  // licensed for (BUILD_ROOT_ID) — there is no second folder for globalOwnerQuery to find, so
  // under the server backend this check is a permanent false positive (verified live 2026-08-21:
  // exactly one LBS folder on Drive, owned by the server). Skip it there.
  if (!isServerBackend() && driveApi.globalOwnerQuery) {
    const { computeOrphanCount } = await import('../../implementations/ui/bootstrap/components/orphan-folder-banner.js');
    driveApi.globalOwnerQuery(driveApi.driveFetch, wsName)
      .then((allByName) => {
        const count = computeOrphanCount(allByName.length);
        if (count > 0) {
          window.dispatchEvent(new CustomEvent('vdg:orphan-workspace-detected', {
            detail: { count, canonicalId: wsRootId },
          }));
        }
      }).catch(() => {});
  }

  // ACL target folders
  if (!isServerBackend()) {
    await window.__vdg_wasm.governance_bootstrap_acl_folders({ root_id: wsRootId }).catch(() => {});
  }

  // Ledger + user seed
  ledgerRepo.ensureSeedFiles().catch(() => {});
  userRepo.ensureSeeded(user).catch(() => {});

  // Auto reconcile
  const { maybeAutoReconcile } = await import('../../implementations/ui/core_abstractions/ports/manager/ledger-reconciler.js');
  maybeAutoReconcile(ledgerRepo);

  // Pre-warm IDB cache
  const { prefetchDashboard } = await import('../../implementations/ui/core_abstractions/ports/cache/route-prefetch.js');
  const { ensureShipmentStateAliases } = await import('../../implementations/ui/core_abstractions/ports/flows/shipment-state-aliases.js');
  const WARM_KINDS = [
    'shipment', 'pnl_line', 'billing', 'approval_request', 'customers',
    'exception', 'quotation', 'commission_rules', 'user', // F-39-01: canonical user-master kind
  ];
  Promise.all(WARM_KINDS.map((k) => repo.list(k, null))).catch(() => {});
  // F-40-01: WARM_KINDS only does a bare list — never triggers the seed migration. Warm the
  // shipment-states alias seed directly, off the grid's mount path.
  ensureShipmentStateAliases(repo).catch(() => {});
  prefetchDashboard(repo).catch(() => {});
}
