// section-lines-wma.js — WMA kind-prediction UI helpers for section B rows.
// Split out of section-lines.js (F-29-01 pushed it over the 350-line cap) — pure extraction,
// no behavior change.
import { predict, dismissPrediction } from '../../sync/wma-engine.js';
import { loadKindWmaState, saveKindWmaState } from '../../sync/wma-store.js';
import { t } from '../../i18n/index.js';

export function ensureWmaStyle() {
  if (document.getElementById('wma-style')) return;
  const s = document.createElement('style');
  s.id          = 'wma-style';
  s.textContent = '@keyframes wma-pulse{0%,100%{opacity:1}50%{opacity:.6}}'
    + '.wma-predicted{animation:wma-pulse .6s ease-in-out;}'
    + '.wma-badge{cursor:pointer;font-size:10px;margin-left:3px;opacity:.8;vertical-align:middle;}'
    + '.wma-badge:hover{opacity:1;}';
  document.head.appendChild(s);
}

function injectBadge(kindSel, state) {
  kindSel.parentElement?.querySelector('.wma-badge')?.remove();
  const span = document.createElement('span');
  span.className = 'wma-badge';
  span.title     = t('wma.badge_title').replace('{n}', state.total_observations);
  span.textContent = t('wma.badge_label');
  kindSel.insertAdjacentElement('afterend', span);
}

export async function applyWmaToRow(row, repId, classifyKind) {
  const rowIdx  = parseInt(row.dataset.line, 10);
  const db      = window.__vdg_db;
  if (!db || !repId) return;
  const kindSel = row.querySelector('[name=kind]');
  if (!kindSel || kindSel.dataset.manuallySet === 'true' || kindSel.value) return;
  const desc    = row.querySelector('[name=desc]')?.value || '';
  const state   = await loadKindWmaState(db, repId, rowIdx);
  const top     = predict(state, desc, classifyKind);
  if (!top) return;
  kindSel.value        = top;
  kindSel.classList.add('wma-predicted');
  row.dataset.wmaPredicted = top;
  injectBadge(kindSel, state);
  const sorted = Object.entries(state.kind_weights).sort((a, b) => b[1] - a[1]);
  const topW   = (sorted[0]?.[1] ?? 0).toFixed(2);
  const secW   = (sorted[1]?.[1] ?? 0).toFixed(2);
  console.log(`[wma] row${rowIdx} → ${top} (w=${topW} vs 2nd=${secW})`); // DEV
}

export async function applyWmaToAllRows(tbody, repId, classifyKind) {
  for (const row of Array.from(tbody.querySelectorAll('tr[data-line]'))) {
    await applyWmaToRow(row, repId, classifyKind);
  }
}

// badge dismiss — undo prediction + aggressive 0.7 penalty. Returns true if handled.
export async function dismissWmaBadge(badge, repId) {
  const row = badge.closest('tr[data-line]');
  if (!row || !repId) return false;
  const rowIdx         = parseInt(row.dataset.line, 10);
  const predictedKind  = row.dataset.wmaPredicted;
  const kindSel        = row.querySelector('[name=kind]');
  if (kindSel) {
    kindSel.value = '';
    kindSel.classList.remove('wma-predicted');
  }
  badge.remove();
  delete row.dataset.wmaPredicted;
  if (predictedKind) {
    const db = window.__vdg_db;
    if (db) {
      const state = await loadKindWmaState(db, repId, rowIdx);
      dismissPrediction(state, predictedKind);
      await saveKindWmaState(db, repId, rowIdx, state);
    }
  }
  return true;
}
