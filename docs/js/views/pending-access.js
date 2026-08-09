// pending-access.js — #15: ReadOnly/not-provisioned landing screen.
// Before this, every role fell through to the manager dashboard shell ('/dashboard' had no
// ROUTE_ROLE_MAP entry) — QC read it as "everyone is a manager". Data was blocked; the shell
// was not. This screen says the actual state: signed in, no role granted yet.
//
// #17: it also owns first-run workspace creation, which boot used to do silently for ANY
// not-provisioned account — forking a private workspace per employee. Creating the company
// workspace is an explicit manager action now, and it is offered ONLY when no workspace root
// is visible at all; when one exists, this account is simply waiting to be invited.

import { t } from '../i18n/index.js';
import { navigate } from '../router.js';
import { activeWorkspaceName } from '../operators/workspace-registry.js';
import { runFirstRunProvision } from '../boot/license-boot-gate.js';
import { clearRoleCache } from '../auth/auth-gate.js';
import { currentUserRole, normalizeRole, homeRouteForRole, ROLE_READ_ONLY } from '../operators/manager/route-guard.js';

// users.jsonl role resolution is async (repo-init-steps step: userRepo.get(email).then) — a
// provisioned user can land here during the race, so poll and leave as soon as a role shows up.
const ROLE_POLL_MS = 3000;

export function render(root) {
  root.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <div class="text-3xl">⏳</div>
      <div id="pending-title" class="text-xl font-semibold text-slate-700">${t('pending_access.title')}</div>
      <div id="pending-body" class="text-sm text-slate-500 max-w-md">${t('pending_access.body')}</div>
      <div class="text-xs text-slate-400">${window.__vdg_current_user?.email || ''}</div>
      <div class="flex gap-2 mt-2">
        <button id="pending-retry" class="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">${t('retry')}</button>
        <button id="pending-signout" class="px-4 py-2 bg-slate-200 text-slate-700 rounded text-sm hover:bg-slate-300">${t('sign_out')}</button>
      </div>
      <div id="pending-create-slot" class="mt-2"></div>
      <div id="pending-error" class="text-xs text-red-600"></div>
    </div>`;

  const exitIfGranted = () => {
    const role = normalizeRole(currentUserRole());
    if (role === ROLE_READ_ONLY) return false;
    navigate(homeRouteForRole(role));
    return true;
  };

  const timer = setInterval(() => {
    // Stop polling once the view is unmounted (root detached by the next navigation).
    if (!root.isConnected || exitIfGranted()) clearInterval(timer);
  }, ROLE_POLL_MS);

  root.querySelector('#pending-retry').addEventListener('click', () => {
    if (!exitIfGranted()) location.reload();
  });
  root.querySelector('#pending-signout').addEventListener('click', () => {
    window.__vdg_auth?.signOut?.();
    location.reload();
  });

  _offerCreateIfGreenfield(root);
}

// A visible root (owned OR shared) means the company workspace exists and this account is only
// waiting on an invite — never offer to create a second one, that is the #17 fork. A Drive error
// is NOT "absent": leave the waiting copy up rather than inviting a duplicate workspace.
async function _offerCreateIfGreenfield(root) {
  const driveApi = window.__vdg_drive_api;
  if (!driveApi) return;
  let existingRoot;
  try {
    existingRoot = await driveApi.findWorkspaceRoot(activeWorkspaceName());
  } catch (err) {
    console.warn('[pending-access] workspace probe failed:', err.message); // DEV
    return;
  }
  if (existingRoot || !root.isConnected) return;

  root.querySelector('#pending-title').textContent = t('pending_access.no_workspace_title');
  root.querySelector('#pending-body').textContent  = t('pending_access.no_workspace_body');

  const slot = root.querySelector('#pending-create-slot');
  slot.innerHTML = `<button id="pending-create"
    class="px-4 py-2 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700">${t('pending_access.create_workspace')}</button>`;

  slot.querySelector('#pending-create').addEventListener('click', async (ev) => {
    const btn = ev.currentTarget;
    btn.disabled = true;
    btn.textContent = t('pending_access.creating');
    try {
      await runFirstRunProvision(driveApi, activeWorkspaceName());
      // The NOT_PROVISIONED role was cached before the root existed and would otherwise survive
      // ROLE_CACHE_TTL_MS, bouncing the new manager straight back to this screen.
      clearRoleCache();
      location.reload();
    } catch (err) {
      btn.disabled = false;
      btn.textContent = t('pending_access.create_workspace');
      root.querySelector('#pending-error').textContent = `${t('pending_access.create_failed')}: ${err.message}`;
    }
  });
}
