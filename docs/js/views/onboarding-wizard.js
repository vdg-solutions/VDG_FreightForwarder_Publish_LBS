// Manager route view (/onboarding) — workspace structure scaffolding + sales invite.
// Licence concerns are gone from this module (spec 2026-07-09): workspace creation, licence
// upload and verification now live in boot/license-boot-gate.js + views/license/* and run
// BEFORE this view is ever reached. This view assumes an already-provisioned, already-licensed
// manager landed here — no paste, no join, no migrate.

import { findWorkspaceRoot } from '../auth/drive-api.js';
import { inviteSales } from '../operators/user-provisioning.js';
import { bootstrapAclTargetFolders } from '../operators/manager/workspace-bootstrap.js';
import { t } from '../i18n/index.js';
import { activeWorkspaceName } from '../operators/workspace-registry.js';

export async function renderOnboardingWizard(container, onDone) {
  container.innerHTML = `
    <div id="onboarding-wizard" class="max-w-xl mx-auto p-6">
      <h2 class="text-lg font-semibold mb-4">Khởi tạo Workspace</h2>
      <ol id="wizard-steps" class="space-y-2 mb-6 text-sm"></ol>
      <div id="wizard-invite" class="hidden border-t pt-4 mt-4">
        <h3 class="font-medium mb-2">Mời Sales</h3>
        <div class="flex gap-2">
          <input type="email" id="invite-email" placeholder="email@domain.com"
                 class="flex-1 border rounded px-3 py-2 text-sm" />
          <button id="btn-invite"
                  class="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
            Mời Sales
          </button>
        </div>
        <ul id="invited-list" class="mt-3 space-y-1 text-sm text-slate-600"></ul>
      </div>
      <button id="btn-done"
              class="mt-4 px-4 py-2 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700">
        Hoàn thành
      </button>
    </div>`;

  const stepsEl   = container.querySelector('#wizard-steps');
  const inviteDiv = container.querySelector('#wizard-invite');
  const inviteBtn = container.querySelector('#btn-invite');
  const doneBtn   = container.querySelector('#btn-done');

  const driveApi = window.__vdg_drive_api || (await import('../auth/drive-api.js'));
  const rootId   = await findWorkspaceRoot(activeWorkspaceName());

  // Idempotent (getOrCreateFolder dedups) — safe to re-run every time a manager visits this view.
  await _runStep(stepsEl, t('onboarding.create_structure'), async () => {
    await bootstrapAclTargetFolders(driveApi, rootId);
  });

  inviteDiv.classList.remove('hidden');

  inviteBtn.addEventListener('click', async () => {
    const email = container.querySelector('#invite-email').value.trim();
    if (!email) return;
    inviteBtn.disabled = true;
    try {
      await _inviteSales(email, rootId, driveApi, container);
    } finally {
      inviteBtn.disabled = false;
      container.querySelector('#invite-email').value = '';
    }
  });

  doneBtn.addEventListener('click', () => onDone?.());
}

async function _inviteSales(email, wsRootId, driveApi, container) {
  const prefix = email.split('@')[0].toLowerCase();

  // Delegate to user-provisioning (single source of truth). If repo not ready during
  // initial setup, inviteSales skips users.jsonl write gracefully.
  const repo = window.__vdg_repo || null;
  await inviteSales(email, email.split('@')[0], driveApi, repo, wsRootId);

  const list = container.querySelector('#invited-list');
  const li   = document.createElement('li');
  li.textContent = `✓ ${email} → users/${prefix}/ (editor)`;
  list.appendChild(li);
}

// Router-compatible entry point
export async function render(container) {
  await renderOnboardingWizard(container, () => { location.hash = '/dashboard'; });
}

async function _runStep(stepsEl, label, fn) {
  const li = document.createElement('li');
  li.className  = 'flex items-center gap-2';
  li.innerHTML  = `<span class="w-4 text-slate-400 animate-spin">⟳</span><span>${label}</span>`;
  stepsEl.appendChild(li);

  try {
    await fn();
    li.querySelector('span').textContent = '✓';
    li.querySelector('span').className   = 'w-4 text-emerald-500';
  } catch (err) {
    li.querySelector('span').textContent = '✗';
    li.querySelector('span').className   = 'w-4 text-red-500';
    const errSpan = document.createElement('span');
    errSpan.className   = 'text-red-500 text-xs';
    errSpan.textContent = err.message;
    li.appendChild(errSpan);
    throw err;
  }
}
