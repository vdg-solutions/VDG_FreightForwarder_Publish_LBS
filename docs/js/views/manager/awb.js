// AWB admin grid — F-16-02
// Route: /manager/awb

import { isManager }             from '../../auth/auth-gate.js';
import { navigate }              from '../../router.js';
import { t }                     from '../../i18n/index.js';
import { AwbDriveRepo }          from '../../implementations/awb-drive-repo.js';
import { activeWorkspaceName }   from '../../operators/workspace-registry.js';

// AC-10: jsPDF lazy CDN — not bundled, loaded on first Export PDF click
const JSPDF_CDN   = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm';
const TOAST_MS    = 4_000;
const STATUS_ALL  = 'All';
const STATUS_OPTS = ['All', 'Drafted', 'SISubmitted', 'Released', 'DeliveryProof'];

let _repo  = null;
let _jsPdf = null;

function getApi() { return window.__vdg_drive_api; }

function getRepo() {
  if (!_repo) {
    const api = getApi();
    _repo = new AwbDriveRepo(api, () => api.findWorkspaceRoot(activeWorkspaceName()));
  }
  return _repo;
}

function toast(type, msg) {
  window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { type, message: msg, duration: TOAST_MS } }));
}

async function loadJsPdf() {
  if (!_jsPdf) {
    const mod = await import(/* @vite-ignore */ JSPDF_CDN);
    _jsPdf    = mod.jsPDF ?? mod.default?.jsPDF ?? mod.default;
  }
  return _jsPdf;
}

function statusLabel(s) {
  const keys = {
    Drafted:       'awb.status.drafted',
    SISubmitted:   'awb.status.si_submitted',
    Released:      'awb.status.released',
    DeliveryProof: 'awb.status.delivery_proof',
  };
  return t(keys[s] ?? s);
}

function kindLabel(k) {
  return t(k === 'Master' ? 'awb.kind.master' : 'awb.kind.house');
}

// AC-10: PDF fields — AWB no, shipper, consignee, pieces, chargeable weight, commodity
async function exportPdf(awb) {
  const JsPDF = await loadJsPdf();
  const doc   = new JsPDF();
  doc.setFontSize(16);
  doc.text(`AWB: ${awb.awb_no}`, 14, 20);
  doc.setFontSize(11);
  doc.text(`${t('sales_new.field.shipper')}: ${awb.shipper?.name ?? '—'}`, 14, 34);
  doc.text(`${t('sales_new.field.consignee')}: ${awb.consignee?.name ?? '—'}`, 14, 43);
  doc.text(`${t('awb.label.chargeable_weight')}: ${awb.weight_chargeable_kg ?? 0} kg`, 14, 52);
  doc.text(`Pieces: ${awb.pieces ?? 0}`, 14, 61);
  doc.text(`Commodity: ${awb.commodity_desc ?? '—'}`, 14, 70);
  const blob = doc.output('blob');
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${awb.awb_no ?? 'awb'}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

function renderGrid(container, entries, statusFilter) {
  const visible = statusFilter === STATUS_ALL
    ? entries
    : entries.filter((e) => e.state === statusFilter);

  if (!visible.length) {
    container.innerHTML = `<p class="text-sm text-slate-400 py-4">${t('no_data')}</p>`;
    return;
  }

  const rows = visible.map((e, i) => `
    <tr class="border-t border-slate-100 hover:bg-slate-50">
      <td class="px-3 py-2 text-sm font-mono">${e.awb_no ?? '—'}</td>
      <td class="px-3 py-2 text-sm">${kindLabel(e.kind)}</td>
      <td class="px-3 py-2 text-sm">${e.shipper?.name ?? '—'}</td>
      <td class="px-3 py-2 text-sm">${e.consignee?.name ?? '—'}</td>
      <td class="px-3 py-2 text-sm">${statusLabel(e.state)}</td>
      <td class="px-3 py-2 text-sm text-right">${e.pieces ?? 0}</td>
      <td class="px-3 py-2 text-sm text-right">${e.weight_chargeable_kg ?? 0}</td>
      <td class="px-3 py-2 text-xs">
        <button data-idx="${i}" class="text-blue-600 hover:underline">${t('awb.action.export_pdf')}</button>
      </td>
    </tr>`).join('');

  container.innerHTML = `
    <div class="overflow-x-auto rounded-lg border border-slate-200">
      <table class="w-full text-left" id="awb-grid">
        <thead class="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
          <tr>
            <th class="px-3 py-2">${t('awb.label.awb_no')}</th>
            <th class="px-3 py-2">${t('awb.label.type')}</th>
            <th class="px-3 py-2">${t('sales_new.field.shipper')}</th>
            <th class="px-3 py-2">${t('sales_new.field.consignee')}</th>
            <th class="px-3 py-2">${t('state')}</th>
            <th class="px-3 py-2 text-right">Pieces</th>
            <th class="px-3 py-2 text-right">${t('awb.label.chargeable_weight')}</th>
            <th class="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  container.querySelectorAll('[data-idx]').forEach((btn) => {
    btn.addEventListener('click', () => {
      exportPdf(visible[Number(btn.dataset.idx)])
        .catch((err) => toast('error', err.message));
    });
  });
}

export async function render(root) {
  if (!isManager()) { navigate('/dashboard'); return; }

  const ym   = new Date().toISOString().slice(0, 7);
  const repo = getRepo();
  let entries = [];
  try {
    entries = await repo.listByMonth(ym);
  } catch (err) {
    console.warn('[awb] load failed:', err.message); // DEV
  }

  root.innerHTML = `
    <div class="p-6 space-y-4 max-w-5xl mx-auto">
      <h2 class="text-lg font-semibold text-slate-800">${t('awb.admin.title')} — ${ym}</h2>
      <div class="flex items-center gap-3">
        <label class="text-sm text-slate-500">${t('state')}:</label>
        <select id="awb-status-filter"
          class="border border-slate-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100">
          ${STATUS_OPTS.map((s) =>
            `<option value="${s}">${s === STATUS_ALL ? STATUS_ALL : statusLabel(s)}</option>`
          ).join('')}
        </select>
      </div>
      <div id="awb-grid-wrap"></div>
    </div>`;

  const gridWrap    = root.querySelector('#awb-grid-wrap');
  const filterEl    = root.querySelector('#awb-status-filter');
  let currentFilter = STATUS_ALL;

  filterEl.addEventListener('change', () => {
    currentFilter = filterEl.value;
    renderGrid(gridWrap, entries, currentFilter);
  });

  renderGrid(gridWrap, entries, currentFilter);
}
