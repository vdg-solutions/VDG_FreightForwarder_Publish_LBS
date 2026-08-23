// F-13-P2 — Full-page Google OAuth login screen
// Mounted by auth-gate when getCurrentUser() returns null

import { initGoogleSignIn, renderSignInButton } from '../../../storage/core_abstractions/oauth.js';
import { t } from '../../../kernel/core_abstractions/i18n/index.js';

function sessionExpiredMessage() { return t('login.session_expired'); }

// ── HTML skeleton ─────────────────────────────────────────────────────────────

function loginHtml() {
  return `
    <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-lg border border-slate-100 w-full max-w-sm p-10 flex flex-col items-center gap-6">

        <!-- Logo -->
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800
                      flex items-center justify-center text-white font-bold text-lg tracking-tight">
            V
          </div>
          <div>
            <div class="text-base font-semibold text-slate-900 leading-tight">VDG FreightForwarder</div>
            <div class="text-[11px] text-slate-400">${t('login.workspace')}</div>
          </div>
        </div>

        <!-- Tagline -->
        <div class="text-center">
          <div class="text-sm font-medium text-slate-700">${t('login.tagline')}</div>
        </div>

        <!-- GIS button target -->
        <div id="gis-btn-target" class="w-full flex justify-center min-h-[44px]"></div>

        <!-- Error -->
        <div id="login-error" class="hidden text-xs text-red-600 text-center px-2"></div>

        <!-- #21 stall hint (extension holding the popup) -->
        <div id="login-hint" class="hidden text-xs text-amber-600 text-center px-2"></div>

        <!-- Footer -->
        <div class="text-[10px] text-slate-300 text-center">
          ${t('login.footer')}
          <div class="mt-1 font-mono text-slate-400">v0.4.13 (8cfc08c)</div>
        </div>
      </div>
    </div>`;
}

// ── entry point ───────────────────────────────────────────────────────────────

export function renderLoginPage(mountEl, onSuccess) {
  mountEl.innerHTML = loginHtml();

  const btnTarget = mountEl.querySelector('#gis-btn-target');
  const errorEl   = mountEl.querySelector('#login-error');
  const hintEl    = mountEl.querySelector('#login-hint');

  function showError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
  }

  // OAuth2 callback errors + session expired. Not { once: true } — a second attempt must be able
  // to replace a stale message, otherwise the screen looks frozen on the previous failure (#21).
  window.addEventListener('vdg:signin-error', (e) => showError(t('login.signin_failed', { detail: e.detail })));
  window.addEventListener('vdg:session-expired', () => showError(sessionExpiredMessage()), { once: true });

  // #21 — GIS answered with neither callback: name the usual culprit instead of hanging silently.
  window.addEventListener('vdg:signin-stalled', () => {
    if (!hintEl) return;
    hintEl.textContent = t('login.signin_stalled');
    hintEl.classList.remove('hidden');
  });

  // initGoogleSignIn just loads GIS script — renderSignInButton handles the OAuth2 popup
  initGoogleSignIn(
    null, // no success callback — renderSignInButton does sign-in + location.reload()
    (err) => showError(t('login.signin_failed', { detail: err?.message || t('login.unknown_error') }))
  ).then(() => {
    if (btnTarget) renderSignInButton(btnTarget);
  }).catch((err) => {
    showError(t('login.gis_unavailable', { detail: err?.message || t('login.check_network') }));
  });
}
