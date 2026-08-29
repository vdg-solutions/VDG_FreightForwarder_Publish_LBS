// pending-access.js — #15: ReadOnly/not-provisioned landing screen.
// Before this, every role fell through to the manager dashboard shell ('/dashboard' had no
// ROUTE_ROLE_MAP entry) — QC read it as "everyone is a manager". Data was blocked; the shell
// was not. This screen says the actual state: signed in, no role granted yet.
//
// #17's first-run workspace creation is gone: CharterDB has no workspace-root folder to find or
// create (findWorkspaceRoot threw "unsupported in native CharterDB mode" on every build this
// screen ships in), so there is nothing left to greenfield-offer here. A company's workspace
// exists the moment its licence does; a not-provisioned account is always just waiting on a
// grant, never looking at an empty Drive.

import { t } from '../../../kernel/core_abstractions/i18n/index.js';
import { navigate } from '../router.js';
import { clearRoleCache } from '../../../ui/core_abstractions/ports/auth/auth-gate.js';
import { ROLE_READ_ONLY } from '../../../ui/core_abstractions/roles.js';
import { currentUserRole, currentUserEmail, normalizeRole, homeRouteForRole } from '../../core_abstractions/ports/governance/route-guard.js';

// staff-table role resolution is async (repo-init-steps step: userRepo.get(email).then) — a
// provisioned user can land here during the race, so poll and leave as soon as a role shows up.
const ROLE_POLL_MS = 3000;

export function render(root) {
  root.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <div class="text-3xl">⏳</div>
      <div id="pending-title" class="text-xl font-semibold text-slate-700">${t('pending_access.title')}</div>
      <div id="pending-body" class="text-sm text-slate-500 max-w-md">${t('pending_access.body')}</div>
      <div class="text-xs text-slate-400">${currentUserEmail()}</div>
      <div class="flex gap-2 mt-2">
        <button id="pending-retry" class="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">${t('retry')}</button>
        <button id="pending-signout" class="px-4 py-2 bg-slate-200 text-slate-700 rounded text-sm hover:bg-slate-300">${t('sign_out')}</button>
      </div>
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

  root.querySelector('#pending-retry').addEventListener('click', async () => {
    // Retry means re-probe. Without this the reload just reads the cached verdict back — the same
    // "no roles" this screen is showing — and the button does nothing for up to ROLE_CACHE_TTL_MS.
    if (exitIfGranted()) return;
    await clearRoleCache();
    location.reload();
  });
  root.querySelector('#pending-signout').addEventListener('click', () => {
    window.__vdg_auth?.signOut?.();
    location.reload();
  });
}
