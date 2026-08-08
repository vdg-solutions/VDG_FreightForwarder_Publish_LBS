// app-events.js — global event listeners wired at bootstrap

import { APP_VERSION } from './version.js';
import { t } from './i18n/index.js';
import { onEvent } from './sync/wma-engine.js';
import { loadKindWmaState, saveKindWmaState } from './sync/wma-store.js';

const NEW_FEATURE_BANNER_DAYS = 7;
const BREAKPOINT_TABLET_PX    = 768;
const PREFS_META_KEY          = 'preferences';

// SQLite locked by an old-build tab (vdg:store-locked, store-client.js): every store op is
// doomed until that tab goes away — render the one actionable instruction instead of letting
// the boot starve on silent timeouts. Full-screen on purpose: nothing behind it can work.
export function initStoreLockedScreen() {
  window.addEventListener('vdg:store-locked', () => {
    if (document.getElementById('vdg-store-locked')) return;
    const el = document.createElement('div');
    el.id = 'vdg-store-locked';
    el.className = 'fixed inset-0 z-[100] bg-white/95 flex items-center justify-center p-6';
    el.innerHTML = `
      <div class="max-w-md w-full bg-white rounded-xl shadow-2xl border border-slate-200 p-6 text-center">
        <div class="text-3xl mb-3">🔒</div>
        <div class="font-semibold text-slate-900 text-sm mb-2">${t('store_locked.title')}</div>
        <div class="text-xs text-slate-600 leading-relaxed mb-4">${t('store_locked.body')}</div>
        <button id="store-locked-retry"
          class="px-4 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">${t('store_locked.retry')}</button>
      </div>`;
    el.querySelector('#store-locked-retry').onclick = () => location.reload();
    document.body.appendChild(el);
  }, { once: true });
}

// F-14-18-3: conflict modal
export function initConflictModal() {
  window.addEventListener('vdg:conflict-detected', (e) => {
    const { kind, id, local, remote, conflicts } = e.detail || {};
    const dlg = document.createElement('dialog');
    dlg.className = 'rounded-xl shadow-2xl p-0 w-[480px] max-w-[95vw] bg-white backdrop:bg-black/40';
    const fieldLabel = conflicts?.[0]?.field || '(multiple fields)';
    const localVal   = String(conflicts?.[0]?.local_val ?? '').slice(0, 60);
    const remoteVal  = String(conflicts?.[0]?.remote_val ?? '').slice(0, 60);
    dlg.innerHTML = `
      <div class="px-6 py-4 border-b border-slate-200">
        <div class="font-semibold text-slate-900 text-sm">Data conflict · ${kind}:${id}</div>
        <div class="text-xs text-slate-500 mt-0.5">Field: <code>${fieldLabel}</code></div>
      </div>
      <div class="px-6 py-4 text-xs">
        <div class="flex gap-4">
          <div class="flex-1 bg-blue-50 rounded p-2">
            <div class="font-medium text-blue-700 mb-1">Yours</div>
            <div class="font-mono break-all">${localVal}</div>
          </div>
          <div class="flex-1 bg-amber-50 rounded p-2">
            <div class="font-medium text-amber-700 mb-1">Theirs</div>
            <div class="font-mono break-all">${remoteVal}</div>
          </div>
        </div>
      </div>
      <div class="px-6 py-3 border-t border-slate-100 flex justify-end gap-2">
        <button id="keep-mine" class="px-4 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">Keep mine</button>
        <button id="use-theirs" class="px-4 py-2 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700">Use theirs</button>
      </div>`;
    document.body.appendChild(dlg);
    dlg.showModal();
    // F-28-06: re-put the winning body directly — this re-enters the Rust rebase gate
    // (apply_put). Stamp local's _rev to the remote _rev this conflict event just carried
    // (the freshest known state, no extra fetch) so "keep mine" fast-forwards instead of
    // conflicting again against its own stale base.
    const repo = window.__vdg_repo;
    dlg.querySelector('#keep-mine').addEventListener('click', async () => {
      await repo?.put(kind, id, { ...local, _rev: remote?._rev });
      dlg.close(); dlg.remove();
    });
    dlg.querySelector('#use-theirs').addEventListener('click', async () => {
      await repo?.put(kind, id, remote);
      dlg.close(); dlg.remove();
    });
  });
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
    banner.className = 'fixed top-16 left-0 right-0 z-[8999] bg-indigo-600 text-white text-xs flex items-center justify-between px-4 py-2';
    banner.innerHTML = `
      <span>What's new in ${APP_VERSION}
        <button id="banner-see" class="ml-2 underline hover:no-underline">See changes</button>
      </span>
      <button id="banner-dismiss" class="ml-4 text-indigo-200 hover:text-white">✕</button>`;
    document.body.appendChild(banner);
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
