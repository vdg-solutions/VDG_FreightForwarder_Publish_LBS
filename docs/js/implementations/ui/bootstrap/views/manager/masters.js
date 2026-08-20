// Manager Master Data Management — F-14-10

import '../../components/dup-wizard.js';
import { hasRole } from '../../../../ui/core_abstractions/ports/auth/session-roles.js';
import { ROLE_MANAGER } from '../../../../ui/core_abstractions/roles.js';
import { navigate }       from '../../router.js';
import { findMatch }      from '../../../core_abstractions/ports/cache/master-deduper.js';
import { showConfirm }    from '../../helpers/show-confirm.js';
import { t }              from '../../../../kernel/core_abstractions/i18n/index.js';
import { agGridLocaleText } from '../../../../kernel/core_abstractions/i18n/ag-grid-locale.js';

const MASTERS_RE               = /^\/manager\/masters\/([^/]+)$/;
const KIND_CUSTOMER            = 'customers';
const KIND_CARRIER             = 'carriers';
const KIND_USER                = 'user'; // F-39-01: canonical user-master kind (MASTER_REGISTRY)
const KIND_MAP                 = { customers: KIND_CUSTOMER, carriers: KIND_CARRIER, users: KIND_USER };
const USER_KIND                = 'user'; // F-39-01: canonical user-master kind (MASTER_REGISTRY)
const USER_ID_PREFIX           = 'USR';
const ROLE_SALES               = 'sales';
const STATUS_ACTIVE            = 'Active';
const STATUS_INACTIVE          = 'Inactive';
const TOAST_AUTODISMISS_MS     = 5_000;
const OUTLIER_MARGIN_LOW_PCT   = -20;
const OUTLIER_MARGIN_HIGH_PCT  = 200;
const STALE_DATA_DAYS          = 90;
const PREF_META_KEY            = 'preferences';
const STALE_MS                 = STALE_DATA_DAYS * 86_400_000;

let _onEntity;

function getRepo()     { return window.__vdg_repo; }
function currentUser() { return window.__vdg_auth?.getCurrentUser?.()?.email || 'manager'; }

function escHtml(s)    { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function toast(message, type = 'success') {
  window.dispatchEvent(new CustomEvent('vdg:toast', {
    detail: { type, message, duration: TOAST_AUTODISMISS_MS },
  }));
}

// ── User master ──────────────────────────────────────────────────────────────

function mountUserGrid(container, users) {
  container.innerHTML = '<div class="ag-theme-quartz" style="height:400px"></div>';
  if (!window.agGrid) return;
  const cols = [
    { field: 'name',        headerName: t('masters_hub.col.name'),       flex: 1 },
    { field: 'email',       headerName: t('masters_hub.col.email'),       flex: 1 },
    { field: 'role',        headerName: t('masters_hub.col.role'),        width: 90 },
    { field: 'id',          headerName: t('masters_hub.col.sales_id'),    width: 110 },
    { field: 'status',      headerName: t('masters_hub.col.status'),      width: 100,
      cellRenderer: (p) => {
        const cls = p.value === STATUS_ACTIVE ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500';
        const span = document.createElement('span');
        span.className   = `px-2 py-0.5 rounded text-xs font-medium ${cls}`;
        span.textContent = p.value || '—';
        return span;
      } },
    { field: 'last_login',  headerName: t('masters_hub.col.last_login'),  width: 110 },
    { headerName: t('common.col.actions'), width: 180, cellRenderer: (p) => {
        const div = document.createElement('div');
        div.className = 'flex gap-1';
        div.innerHTML = `
          <button class="btn-deactivate px-2 py-0.5 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100"
            data-id="${p.data.id}" ${p.data.status === STATUS_INACTIVE ? `disabled title="${t('masters_hub.already_inactive')}"` : ''}>${t('masters_hub.action.deactivate')}</button>
          <button class="btn-reissue px-2 py-0.5 text-xs bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
            data-id="${p.data.id}">${t('masters_hub.action.reissue')}</button>`;
        return div;
      } },
  ];
  const grid = new agGrid.Grid(container.querySelector('.ag-theme-quartz'), {
    columnDefs: cols, rowData: users, defaultColDef: { sortable: true, resizable: true }, localeText: agGridLocaleText(),
  });
  return grid;
}

function buildAddSalesModal() {
  const dlg = document.createElement('dialog');
  dlg.id    = 'add-sales-modal';
  dlg.className = 'rounded-xl border border-slate-200 shadow-xl p-0 w-full max-w-md backdrop:bg-black/30';
  dlg.innerHTML = `
    <form id="add-sales-form" method="dialog" class="p-6 space-y-4">
      <div class="text-base font-semibold text-slate-900 mb-1">${t('masters_hub.modal.add_sales')}</div>
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">${t('masters_hub.field.full_name')} <span class="text-red-500">*</span></label>
        <input id="as-name" type="text" required class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">${t('masters_hub.field.email')} <span class="text-red-500">*</span></label>
        <input id="as-email" type="email" required class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">${t('masters_hub.field.google_email')}</label>
        <input id="as-google" type="email" class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" id="as-cancel" class="px-4 py-2 text-xs rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200">${t('common.action.cancel')}</button>
        <button type="submit" class="px-4 py-2 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700">${t('common.action.save')}</button>
      </div>
    </form>`;
  return dlg;
}

async function renderUsers(root) {
  const repo  = getRepo();
  const users = repo ? await repo.list(USER_KIND, null) : [];

  root.innerHTML = `
    <div class="p-6 space-y-4 max-w-[1400px] mx-auto">
      <div class="flex items-center justify-between">
        <div class="text-sm font-semibold text-slate-900">${t('masters_hub.section.user_master')}</div>
        <button id="btn-add-sales" class="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">${t('masters_hub.action.add_sales')}</button>
      </div>
      <div id="user-grid"></div>
      <div id="dq-section"></div>
    </div>`;

  mountUserGrid(root.querySelector('#user-grid'), users);
  renderDataQuality(root.querySelector('#dq-section'), users, [], []);

  // Grid action delegated via container click (agGrid renders detached DOM)
  root.addEventListener('click', async (e) => {
    const deactivateBtn = e.target.closest('.btn-deactivate');
    if (deactivateBtn && !deactivateBtn.disabled) {
      const id   = deactivateBtn.dataset.id;
      const user = users.find((u) => u.id === id);
      if (!user) return;
      const ok = await showConfirm({
        title: t('masters_hub.confirm.deactivate', { name: user.name }),
        body:  t('masters_hub.deactivate_warning'),
        confirmLabel: t('masters_hub.action.deactivate'),
        cancelLabel:  t('common.action.cancel'),
        destructive:  true,
      });
      if (!ok) return;
      const updated = { ...user, status: STATUS_INACTIVE, deactivated_at: new Date().toISOString(), deactivated_by: currentUser() };
      if (repo) await repo.put(USER_KIND, id, updated);
      toast(`${user.name} deactivated.`);
      await renderUsers(root);
      return;
    }
    const reissueBtn = e.target.closest('.btn-reissue');
    if (reissueBtn) {
      const id       = reissueBtn.dataset.id;
      const inviteUrl = `${location.origin}/onboarding?invite=${id}`;
      try {
        await navigator.clipboard.writeText(inviteUrl);
        toast('Invite link copied to clipboard.');
      } catch { toast('Could not access clipboard.', 'error'); }
    }
  });

  const dlg = buildAddSalesModal();
  document.body.appendChild(dlg);

  root.querySelector('#btn-add-sales').addEventListener('click', () => dlg.showModal());
  dlg.querySelector('#as-cancel').addEventListener('click', () => dlg.close());
  dlg.querySelector('#add-sales-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name   = dlg.querySelector('#as-name').value.trim();
    const email  = dlg.querySelector('#as-email').value.trim();
    const prefix = email.split('@')[0];
    const id     = `${USER_ID_PREFIX}-${prefix}`;
    const entity = { id, name, email, role: ROLE_SALES, status: STATUS_ACTIVE, created_at: new Date().toISOString() };
    if (repo) await repo.put(USER_KIND, id, entity);
    dlg.close();
    dlg.remove();
    toast(`Sales rep ${name} added.`);
    window.dispatchEvent(new CustomEvent('vdg:navigate', { detail: { route: `/onboarding?step=provision&userId=${id}` } }));
  });
}

// Self-dedup within one master list — F-19-79: dedupeNames()/findMatch() were built to check ONE
// incoming name against a separate reference list (pnl-commit-orchestrator.js), not to compare a
// list against itself. Reusing findMatch() with the same list as `existing` self-matches every
// row at distance 0. Compare each pair once (i<j, self excluded) instead.
function findDuplicateClusters(entities) {
  const clusters = [];
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const match = findMatch(entities[i].name, [entities[j]]);
      if (match.status === 'match' || match.status === 'ambiguous') {
        clusters.push({ a: entities[i].name, b: entities[j].name, score: match.similarity });
      }
    }
  }
  return clusters;
}

function renderDataQuality(container, customers, shipments, pnlLines) {
  const now = Date.now();

  // 1. Duplicates
  const allClusters = findDuplicateClusters(customers);
  const dupCount    = allClusters.length;

  // 2. Missing ETD
  const missingEtd  = shipments.filter((s) => !s.etd && !s.ETD);

  // 3. Outlier margins
  const outliers    = pnlLines.filter((l) => {
    const sell  = Number(l.selling_vnd_collect ?? l.SellingVNDCollect ?? 0);
    const buy   = Number(l.buying_vnd_pay ?? l.BuyingVNDPay ?? 0);
    if (sell <= 0) return false;
    const pct   = ((sell - buy) / sell) * 100;
    return pct < OUTLIER_MARGIN_LOW_PCT || pct > OUTLIER_MARGIN_HIGH_PCT;
  });

  // 4. Stale data (customers only for this context)
  const stale = customers.filter((c) => {
    const upd = c.updated_at || c.created_at;
    return upd && (now - new Date(upd).getTime()) > STALE_MS;
  });

  const chip = (count, label) => count === 0
    ? `<span class="px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-700">OK</span>`
    : `<span class="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700">${count} ${label}</span>`;

  container.innerHTML = `
    <div class="mt-5 bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <div class="text-sm font-semibold text-slate-900">${t('masters_hub.dq.title')}</div>
      <div class="space-y-3">
        <div class="flex items-center gap-3">
          ${chip(dupCount, t('masters_hub.dq.dup_clusters'))}
          <span class="text-xs text-slate-600">${t('masters_hub.dq.dup_suggestions')}</span>
          ${dupCount > 0 ? `<button id="dq-fix-dup" class="text-xs text-blue-600 underline">${t('masters_hub.dq.fix')}</button>` : ''}
        </div>
        <div class="flex items-center gap-3">
          ${chip(missingEtd.length, t('masters_hub.dq.unit_shipment'))}
          <span class="text-xs text-slate-600">${t('masters_hub.dq.missing_etd')}</span>
        </div>
        <div class="flex items-center gap-3">
          ${chip(outliers.length, t('masters_hub.dq.unit_line'))}
          <span class="text-xs text-slate-600">${t('masters_hub.dq.outlier_margins', { low: OUTLIER_MARGIN_LOW_PCT, high: OUTLIER_MARGIN_HIGH_PCT })}</span>
        </div>
        <div class="flex items-center gap-3">
          ${chip(stale.length, t('masters_hub.dq.unit_entity'))}
          <span class="text-xs text-slate-600">${t('masters_hub.dq.stale_data', { days: STALE_DATA_DAYS })}</span>
        </div>
      </div>
    </div>`;

  container.querySelector('#dq-fix-dup')?.addEventListener('click', () => {
    const wizard = document.createElement('vdg-dup-wizard');
    wizard.clusters = allClusters.map((c) => ({ a: c.a, b: c.b, score: c.score ?? 0 }));
    wizard.repo     = getRepo();
    document.body.appendChild(wizard);
  });
}

async function renderCustomersMaster(root) {
  const repo      = getRepo();
  const customers = repo ? await repo.list(KIND_CUSTOMER, null) : [];
  const shipments = repo ? await repo.list('shipment', null) : [];
  const pnlLines  = repo ? await repo.list('pnl_line', null) : [];

  const managerBar = document.createElement('div');
  managerBar.className = 'flex gap-2 mb-4';
  managerBar.innerHTML = `<button id="btn-check-dup" class="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">${t('masters_hub.dq.check_dups')}</button>`;

  const delegate = document.createElement('div');
  delegate.id    = 'master-delegate';

  root.innerHTML = '';
  root.appendChild(managerBar);
  root.appendChild(delegate);

  managerBar.querySelector('#btn-check-dup').addEventListener('click', () => {
    const clusters = findDuplicateClusters(customers);
    const wizard   = document.createElement('vdg-dup-wizard');
    wizard.clusters = clusters.map((c) => ({ a: c.a, b: c.b, score: c.score ?? 0 }));
    wizard.repo     = repo;
    document.body.appendChild(wizard);
  });

  try {
    const { render: renderCusts } = await import('../masters-customers.js');
    await renderCusts(delegate);
  } catch { delegate.innerHTML = `<div class="p-4 text-slate-400 text-xs">${t('masters_hub.err.customer_load')}</div>`; }

  // Data quality at bottom
  const dqEl = document.createElement('div');
  root.appendChild(dqEl);
  renderDataQuality(dqEl, customers, shipments, pnlLines);
}

async function renderCarriersMaster(root) {
  const delegate = document.createElement('div');
  root.innerHTML = '';
  root.appendChild(delegate);
  try {
    const { render: renderCarriers } = await import('../masters-carriers.js');
    await renderCarriers(delegate);
  } catch { delegate.innerHTML = `<div class="p-4 text-slate-400 text-xs">${t('masters_hub.err.carrier_load')}</div>`; }
}

export async function render(root, param) {
  if (!hasRole(ROLE_MANAGER)) { navigate('/dashboard'); return; }
  if (_onEntity) window.removeEventListener('vdg:entity-changed', _onEntity);

  const route = param?.route || location.hash.slice(1);
  const match = MASTERS_RE.exec(route);
  const kind  = match?.[1] || param?.kind || '';

  if (!KIND_MAP[kind]) {
    root.innerHTML = `<div class="p-6 text-slate-400 text-sm">${t('masters_hub.err.type_not_found')}</div>`;
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'p-6 max-w-[1600px] mx-auto';
  root.innerHTML = '';
  root.appendChild(wrapper);

  if (kind === 'customers')      await renderCustomersMaster(wrapper);
  else if (kind === 'carriers')  await renderCarriersMaster(wrapper);
  else                           await renderUsers(wrapper);

  _onEntity = async (e) => {
    const k = e.detail?.kind;
    if (k === KIND_USER || k === KIND_CUSTOMER || k === KIND_CARRIER) {
      await render(root, param);
    }
  };
  window.addEventListener('vdg:entity-changed', _onEntity);
}
