// migration-overlay.js — a full-screen "syncing data" overlay shown WHILE seed/master
// migrations run. On a cold cache the first load pulls + seeds master data from Drive (slow);
// without this the views just time out into "Không tải được… Thử lại". Now the user sees a clear
// loading state and the app reveals itself once the migration finishes.
//
// Driven by `vdg:migration` CustomEvents (detail.delta = +1 when a migration starts, -1 when it
// ends). A short debounce means a fast no-op migration (everything already seeded) never flashes.

import { t } from '../i18n/index.js';

const SHOW_DELAY_MS = 300;
const MIGRATION_EVENT = 'vdg:migration';

let _active = 0;
let _el = null;
let _showTimer = null;

// Emitted by migrators (seed-migrator, priced-ref-migrator, …). Window-guarded so node tests and
// any non-DOM caller are unaffected.
export function beginMigration() { _emit(+1); }
export function endMigration()   { _emit(-1); }

function _emit(delta) {
  // Browser-only. Node/tests may have a PARTIAL window stub (no dispatchEvent / no CustomEvent) —
  // guard on the actual APIs and swallow, so migrators stay unaffected off-DOM.
  try {
    if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function'
        || typeof CustomEvent === 'undefined') return;
    window.dispatchEvent(new CustomEvent(MIGRATION_EVENT, { detail: { delta } }));
  } catch { /* non-DOM / partial-stub env — the overlay is a browser affordance only */ }
}

function _ensureEl() {
  if (_el || typeof document === 'undefined' || !document.body) return _el;
  const style = document.createElement('style');
  style.textContent = '@keyframes vdg-mig-spin{to{transform:rotate(360deg)}}';
  document.head.appendChild(style);

  _el = document.createElement('div');
  _el.id = 'vdg-migration-overlay';
  _el.setAttribute('role', 'status');
  _el.setAttribute('aria-live', 'polite');
  _el.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:9999', 'display:none',
    'flex-direction:column', 'align-items:center', 'justify-content:center', 'gap:16px',
    'background:rgba(248,250,252,0.94)', 'color:#334155',
    'font:500 15px/1.5 system-ui,-apple-system,sans-serif',
  ].join(';');
  _el.innerHTML =
    '<div style="width:36px;height:36px;border:3px solid #cbd5e1;border-top-color:#3b82f6;' +
    'border-radius:50%;animation:vdg-mig-spin .8s linear infinite"></div>' +
    '<div data-mig-label></div>';
  document.body.appendChild(_el);
  return _el;
}

function _render() {
  const el = _ensureEl();
  if (!el) return;
  if (_active > 0) {
    if (!_showTimer && el.style.display === 'none') {
      _showTimer = setTimeout(() => {
        _showTimer = null;
        if (_active > 0) {
          const label = el.querySelector('[data-mig-label]');
          if (label) label.textContent = t('migration.syncing'); // fresh locale each show
          el.style.display = 'flex';
        }
      }, SHOW_DELAY_MS);
    }
  } else {
    if (_showTimer) { clearTimeout(_showTimer); _showTimer = null; }
    el.style.display = 'none';
  }
}

export function initMigrationOverlay() {
  if (typeof window === 'undefined') return;
  window.addEventListener(MIGRATION_EVENT, (ev) => {
    _active = Math.max(0, _active + (Number(ev.detail?.delta) || 0));
    _render();
  });
}
