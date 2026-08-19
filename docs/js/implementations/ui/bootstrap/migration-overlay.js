// migration-overlay.js — a small, NON-BLOCKING "syncing data" chip shown WHILE seed/master
// migrations run. On a cold cache the first load seeds master data from Drive (slow, many
// round-trips); the chip tells the user a background sync is in flight without freezing the app.
//
// It is deliberately NOT a full-screen modal: the migrations are fire-and-forget background work
// (repo-init-steps.js runs them after the view renders), so blocking the whole UI on them made
// every tab switch look stuck on "Đang đồng bộ…" for the minutes the cold-cache seed takes. A
// corner chip with pointer-events:none keeps dashboard/shipments/etc. fully usable meanwhile.
//
// Driven by `vdg:migration` CustomEvents (detail.delta = +1 when a migration starts, -1 when it
// ends). A short debounce means a fast no-op migration (everything already seeded) never flashes.

import { t } from '../../kernel/core_abstractions/i18n/index.js';

const SHOW_DELAY_MS = 300;
import { MIGRATION_EVENT } from '../../freight_app/core_abstractions/migration-signal.js';

let _active = 0;
let _el = null;
let _showTimer = null;

// The emitters live with the migrators (freight_app/operators/cache/migration-signal.js); this
// file only listens. Re-exported for the callers that still take them from here.
export { beginMigration, endMigration } from '../../freight_app/core_abstractions/migration-signal.js';

function _ensureEl() {
  if (_el || typeof document === 'undefined' || !document.body) return _el;
  const style = document.createElement('style');
  style.textContent = '@keyframes vdg-mig-spin{to{transform:rotate(360deg)}}';
  document.head.appendChild(style);

  _el = document.createElement('div');
  _el.id = 'vdg-migration-overlay';
  _el.setAttribute('role', 'status');
  _el.setAttribute('aria-live', 'polite');
  // Corner chip, NOT a full-screen modal. pointer-events:none so it never intercepts a click —
  // the app stays fully usable while a background seed/master migration runs (see file header).
  _el.style.cssText = [
    'position:fixed', 'right:16px', 'bottom:16px', 'z-index:9999', 'display:none',
    'flex-direction:row', 'align-items:center', 'gap:10px',
    'padding:10px 14px', 'border-radius:10px',
    'background:rgba(255,255,255,0.98)', 'color:#334155',
    'border:1px solid #e2e8f0', 'box-shadow:0 4px 16px rgba(15,23,42,0.15)',
    'pointer-events:none',
    'font:500 13px/1.4 system-ui,-apple-system,sans-serif',
  ].join(';');
  _el.innerHTML =
    '<div style="width:18px;height:18px;border:2px solid #cbd5e1;border-top-color:#3b82f6;' +
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
  // Drive is unreachable → the reconnect chip is about to show. A "syncing" overlay over a
  // doomed migration is worse than nothing (it hides an already-rendered dashboard). Yield to
  // the reconnect UI: force it down now. A genuine post-reconnect sync re-fires beginMigration.
  window.addEventListener('vdg:auth-needs-reconnect', () => {
    _active = 0;
    _render();
  });
}
