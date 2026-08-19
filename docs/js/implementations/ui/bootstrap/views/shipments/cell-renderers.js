// Grid cell renderers + the manager row action for the shipments grid.
// Split out of shipments.js at the render/interaction seam when the view crossed the 350-line cap
// (F-41-05 added the budget column). shipments.js keeps mount, data load and toolbar; everything
// that draws or acts on a single ROW lives here.

import { t, fmtNumber } from '../../../../kernel/core_abstractions/i18n/index.js';
import { hasRole } from '../../../../freight_app/core_abstractions/session-roles.js';
import { ROLE_MANAGER } from '../../../../freight_app/core_abstractions/roles.js';
import { showConfirm } from '../../helpers/show-confirm.js';
import { chooseShipmentAffordance, runShipmentAffordance } from '../../../../freight_app/operators/shipment-void-delete.js';

export function statusRenderer(params) {
  const el = document.createElement('status-badge');
  el.setAttribute('state', params.value);
  el.setAttribute('fsm', 'shipment');
  return el;
}

export function pnlRenderer(params) {
  // F-37-06: undefined is NOT zero. A reader who could not see the sell side must not be shown
  // a margin at all - `|| 0` reported cost-with-no-revenue, i.e. every job at a loss.
  if (params.value === undefined || params.value === null) {
    const dash = document.createElement('span');
    dash.className = 'text-slate-400 font-mono text-xs';
    dash.textContent = '—';
    return dash;
  }
  const v = params.value;
  const positive = v >= 0;
  const div = document.createElement('div');
  div.className = 'flex items-center gap-2';
  const bar = document.createElement('div');
  bar.className = 'w-12 h-1.5 rounded-full overflow-hidden bg-slate-100';
  const fill = document.createElement('div');
  fill.style.width = `${Math.min(100, Math.abs(v) / 100)}%`;
  fill.className = positive ? 'h-full bg-emerald-500' : 'h-full bg-red-500';
  bar.appendChild(fill);
  const label = document.createElement('span');
  label.className = `font-mono text-xs ${positive ? 'text-emerald-700' : 'text-red-700'} font-semibold`;
  label.textContent = `${positive ? '+' : ''}${fmtNumber(v)}`;
  div.appendChild(bar);
  div.appendChild(label);
  return div;
}

// F-41-05: row link to the per-job P&L statement (/shipment/:ref/budget) — the sheet existed but
// only sales-me ever linked it, so the main working screen had no door to the process's output.
export function budgetLinkRenderer(params) {
  const a = document.createElement('a');
  a.href = `#/shipment/${encodeURIComponent(params.data.ref)}/budget`;
  a.textContent = t('shipments.action.pnl_sheet');
  a.className = 'text-xs text-blue-600 hover:underline';
  a.addEventListener('click', (e) => e.stopPropagation()); // must not also open the detail panel
  return a;
}

// AC-06 — same confirm thunk shape consumed by detail-panel.js's void/delete control.
function confirmAffordance(affordance) {
  return showConfirm({
    destructive: true,
    title: t(affordance === 'delete' ? 'shipments.delete_confirm.title' : 'shipments.void_confirm.title'),
    body: affordance === 'void' ? t('shipments.void_confirm.body') : undefined,
    confirmLabel: t(affordance === 'delete' ? 'common.action.delete' : 'shipments.action.void'),
    cancelLabel: t('common.action.cancel'),
  });
}

async function handleRowAffordance(row, api, reload) {
  const result = await runShipmentAffordance({
    repo: window.__vdg_repo,
    shipment: row,
    isManager: hasRole(ROLE_MANAGER),
    confirm: confirmAffordance,
  });
  if (!result.mutated) return;
  // AC-04: re-list — a voided row re-renders Cancelled (still present), a deleted row is
  // filtered out by the tombstone list filter.
  const rows = await reload();
  api?.setGridOption('rowData', rows);
}

// F-19-77 AC-01/02/05 — manager-only Void/Delete row action. Decision keys ONLY on the stored
// row (publish_state/state) — orphans surface as state==='Unknown' in the grid (F-18-11
// resolver), so the selector routes them to 'delete' without a per-row WASM NOT_FOUND probe.
// Takes the reload thunk rather than importing it: the row list belongs to the view, and reaching
// back for it would make this module and shipments.js import each other.
export function createActionsRenderer(reload) {
  return function actionsRenderer(params) {
    const affordance = chooseShipmentAffordance(params.data);
    if (affordance === 'none') return document.createElement('span');
    const btn = document.createElement('button');
    btn.className = affordance === 'delete'
      ? 'text-xs px-2 py-1 rounded-md font-medium text-red-700 hover:bg-red-50'
      : 'text-xs px-2 py-1 rounded-md font-medium text-amber-700 hover:bg-amber-50';
    btn.textContent = affordance === 'delete' ? t('common.action.delete') : t('shipments.action.void');
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // AC-01/02: row action must not also open the detail panel
      handleRowAffordance(params.data, params.api, reload);
    });
    return btn;
  };
}
