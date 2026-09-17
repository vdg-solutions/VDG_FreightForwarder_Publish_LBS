// app-events.js — global event listeners wired at bootstrap

import { APP_VERSION } from '../../kernel/core_abstractions/version.js';
import { t, currentLocale } from '../../kernel/core_abstractions/i18n/index.js';
import { onEvent } from '../core_abstractions/ports/sync/wma-engine.js';
import { loadKindWmaState, saveKindWmaState } from '../core_abstractions/ports/sync/wma-store.js';

const NEW_FEATURE_BANNER_DAYS = 7;
const BREAKPOINT_TABLET_PX    = 768;
const PREFS_META_KEY          = 'preferences';

// vdg:store-locked fires for two DIFFERENT diagnoses — never blur them into one wording:
//   'genuine-conflict' — store-client.js classified a real sahpool-genuine-conflict (Rust: no Web
//                        Locks exclusivity guarantee, budget exhausted) — a live second tab really
//                        might be holding the database, so "close every tab" is an instruction the
//                        user can actually carry out.
//   'unresponsive'     — repo-init-steps.js: a boot-critical store op just timed out, with no such
//                        classification. Reload is still the right action, but blaming another tab
//                        would be a guess this app has no evidence for.
// Full-screen on purpose either way: nothing behind it can work while the store is down.
const STORE_LOCKED_COPY = {
  'genuine-conflict': ['store_locked.title', 'store_locked.body'],
  unresponsive: ['store_unresponsive.title', 'store_unresponsive.body'],
};

export function initStoreLockedScreen() {
  window.addEventListener('vdg:store-locked', (ev) => {
    if (document.getElementById('vdg-store-locked')) return;
    const [titleKey, bodyKey] = STORE_LOCKED_COPY[ev.detail?.kind] || STORE_LOCKED_COPY['genuine-conflict'];
    const el = document.createElement('div');
    el.id = 'vdg-store-locked';
    el.className = 'fixed inset-0 z-[100] bg-white/95 flex items-center justify-center p-6';
    el.innerHTML = `
      <div class="max-w-md w-full bg-white rounded-xl shadow-2xl border border-slate-200 p-6 text-center">
        <div class="text-3xl mb-3">🔒</div>
        <div class="font-semibold text-slate-900 text-sm mb-2">${t(titleKey)}</div>
        <div class="text-xs text-slate-600 leading-relaxed mb-4">${t(bodyKey)}</div>
        <div class="flex justify-center gap-3">
          <button id="store-locked-retry"
            class="px-4 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">${t('store_locked.retry')}</button>
        </div>
      </div>`;
    el.querySelector('#store-locked-retry').onclick = () => location.reload();
    document.body.appendChild(el);
  }, { once: true });
}

// F-14-18-4: import progress bar
export function initImportProgress() {
  let bar = null;
  window.addEventListener('vdg:import-progress', (e) => {
    const { kind, n, total, done } = e.detail || {};
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'fixed top-16 left-0 right-0 z-[9000] px-4 py-1.5 bg-indigo-50 border-b border-indigo-200 flex items-center gap-3 text-xs text-indigo-700';
      document.body.appendChild(bar);
    }
    if (done) { bar.remove(); bar = null; return; }
    bar.innerHTML = `
      <progress value="${n}" max="${total}" class="flex-1 h-2 rounded"></progress>
      <span>Importing ${n}/${total} ${kind}…</span>`;
  });
}

// F-14-20-3: version banner
export async function checkVersionBanner(store) {
  if (!store) return;
  try {
    const prefs = await store.cache_get_meta(PREFS_META_KEY);
    if (!prefs) return;
    if (prefs.last_seen_version === APP_VERSION) return;
    if (prefs.banner_dismissed_at) {
      const days = (Date.now() - new Date(prefs.banner_dismissed_at).getTime()) / 86_400_000;
      if (days < NEW_FEATURE_BANNER_DAYS) return;
    }
    const banner = document.createElement('div');
    // In the normal document flow (never `fixed`), inserted right before #view-root so it stacks
    // under vdg-topbar (and its own SW-update banner, if showing) instead of floating over the
    // page toolbar underneath — a `fixed` banner here used to cover the shipments/ledger toolbar
    // and overlap the SW-update banner rather than stack below it (owner QA, two banners on the
    // dashboard). Falls back to a body-level fixed banner if the shell markup isn't there yet.
    const mount = document.getElementById('view-root');
    if (mount) {
      banner.className = 'w-full bg-indigo-600 text-white text-xs flex items-center justify-between px-4 py-2';
    } else {
      banner.className = 'fixed top-16 left-0 right-0 z-[8999] bg-indigo-600 text-white text-xs flex items-center justify-between px-4 py-2';
    }
    banner.innerHTML = `
      <span>${t('whats_new')} ${APP_VERSION}
        <button id="banner-see" class="ml-2 underline hover:no-underline">${t('see_changes')}</button>
      </span>
      <button id="banner-dismiss" class="ml-4 text-indigo-200 hover:text-white">✕</button>`;
    if (mount) mount.before(banner); else document.body.appendChild(banner);
    banner.querySelector('#banner-see').addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('vdg:open-help', { detail: { section: 'whats-new' } }));
    });
    banner.querySelector('#banner-dismiss').addEventListener('click', async () => {
      banner.remove();
      await store.cache_put_meta(PREFS_META_KEY, {
        ...prefs, last_seen_version: APP_VERSION, banner_dismissed_at: new Date().toISOString(),
      });
    });
  } catch { /* banner non-critical */ }
}

// F-15-63: WMA shipment-committed listener — learn from each commit
export function initWmaListener() {
  window.addEventListener('vdg:shipment-committed', async (e) => {
    const { rep_id, lines } = e.detail || {};
    if (!rep_id || !lines?.length) return;
    const store = window.__vdg_store;
    if (!store) return;
    for (const ln of lines) {
      if (!ln.observed_kind) continue;
      try {
        const state = await loadKindWmaState(store, rep_id, ln.row_idx);
        onEvent(state, ln.observed_kind, ln.predicted_kind || null);
        await saveKindWmaState(store, rep_id, ln.row_idx, state);
      } catch (err) {
        console.warn('[wma] on_event failed:', err.message); // DEV
      }
    }
  });
}

// `<html lang>` is what the browser answers with when it renders a control ITSELF rather than from
// our markup — `<input type="date">` picks its mm/dd/yyyy-vs-dd/mm/yyyy order from it, so a
// Vietnamese page declared `lang="en"` put a US placeholder directly beside the app's own
// `(dd/mm/yyyy)` hint on the audit-log filters. index.html now ships the default locale, and this
// keeps the attribute following the VI/EN toggle; every other reader of `lang` (spell-check,
// hyphenation, assistive tech) gets the truth for the same edit.
export function initDocumentLang() {
  const apply = () => { document.documentElement.lang = currentLocale(); };
  window.addEventListener('vdg:locale-changed', apply);
  apply();
}

// F-14-16: mobile breakpoint
export function initBreakpointListener() {
  const mql = window.matchMedia(`(max-width: ${BREAKPOINT_TABLET_PX - 1}px)`);
  const onChange = (e) => {
    document.body.classList.toggle('is-mobile', e.matches);
    window.dispatchEvent(new CustomEvent('vdg:breakpoint-changed', { detail: { mobile: e.matches } }));
  };
  mql.addEventListener('change', onChange);
  onChange(mql);
}
