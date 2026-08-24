// section-containers-table.js — Multi-container & equipment management table (3-Tier Forwarding Standard)

import { t } from '../../../../kernel/core_abstractions/i18n/index.js';
import { CONTAINER_TYPES } from './section-header.js';

function escHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function containerRowHtml(idx, cont = {}) {
  const specOpts = CONTAINER_TYPES.map((c) =>
    `<option value="${c}"${(cont.spec || '40HC') === c ? ' selected' : ''}>${c}</option>`
  ).join('');

  return `
    <tr data-cont-row="${idx}" class="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
      <td class="py-1 px-1.5 text-center text-slate-400 font-mono text-[10px]">${idx + 1}</td>
      <td class="py-1 px-1.5">
        <input type="text" name="cont_no_${idx}" data-cont-field="container_no" value="${escHtml(cont.container_no || '')}"
          placeholder="${t('sales_new.containers.ph_no')}"
          class="w-full border border-slate-200 rounded px-2 py-0.5 text-xs font-mono uppercase focus:ring-1 focus:ring-blue-400 outline-none" />
      </td>
      <td class="py-1 px-1.5">
        <select name="cont_spec_${idx}" data-cont-field="spec" class="w-full border border-slate-200 rounded px-1 py-0.5 text-xs bg-white focus:ring-1 focus:ring-blue-400 outline-none">
          ${specOpts}
        </select>
      </td>
      <td class="py-1 px-1.5">
        <input type="text" name="cont_seal_${idx}" data-cont-field="seal_no" value="${escHtml(cont.seal_no || '')}"
          placeholder="${t('sales_new.containers.ph_seal')}"
          class="w-full border border-slate-200 rounded px-2 py-0.5 text-xs font-mono focus:ring-1 focus:ring-blue-400 outline-none" />
      </td>
      <td class="py-1 px-1.5">
        <input type="number" name="cont_gw_${idx}" data-cont-field="weight_kg" value="${cont.weight_kg ?? ''}" min="0" step="any" placeholder="0.00"
          class="w-full border border-slate-200 rounded px-2 py-0.5 text-xs font-mono text-right focus:ring-1 focus:ring-blue-400 outline-none" />
      </td>
      <td class="py-1 px-1.5">
        <input type="number" name="cont_cbm_${idx}" data-cont-field="cbm" value="${cont.cbm ?? ''}" min="0" step="any" placeholder="0.00"
          class="w-full border border-slate-200 rounded px-2 py-0.5 text-xs font-mono text-right focus:ring-1 focus:ring-blue-400 outline-none" />
      </td>
      <td class="py-1 px-1.5 text-center">
        <button type="button" data-rm-cont="${idx}" class="text-slate-400 hover:text-rose-600 text-xs font-bold transition px-1">✕</button>
      </td>
    </tr>`;
}

export function containersCardHtml(containers = []) {
  const contList = Array.isArray(containers) && containers.length > 0 ? containers : [{}];
  const trs = contList.map((cont, i) => containerRowHtml(i, cont)).join('');

  return `
    <div class="col-span-3 mt-3 border border-slate-200 rounded-lg p-3 bg-slate-50/50" data-containers-card>
      <div class="flex items-center justify-between mb-2">
        <div class="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <span class="text-blue-600">🚢</span>
          <span>${t('sales_new.containers.title')}</span>
        </div>
        <button type="button" id="btn-add-container-row"
          class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition">
          <span>+</span>
          <span>${t('sales_new.containers.add')}</span>
        </button>
      </div>
      <div class="overflow-x-auto border border-slate-200 rounded bg-white">
        <table class="w-full text-left text-xs border-collapse" id="containers-table">
          <thead>
            <tr class="bg-slate-100 text-slate-600 text-[11px] border-b border-slate-200">
              <th class="py-1.5 px-1.5 w-8 text-center font-medium">#</th>
              <th class="py-1.5 px-1.5 font-medium min-w-[140px]">${t('sales_new.containers.col_no')}</th>
              <th class="py-1.5 px-1.5 font-medium w-28">${t('sales_new.containers.col_spec')}</th>
              <th class="py-1.5 px-1.5 font-medium w-36">${t('sales_new.containers.col_seal')}</th>
              <th class="py-1.5 px-1.5 font-medium w-28 text-right">${t('sales_new.containers.col_gw')}</th>
              <th class="py-1.5 px-1.5 font-medium w-28 text-right">${t('sales_new.containers.col_cbm')}</th>
              <th class="py-1.5 px-1.5 w-8 text-center font-medium"></th>
            </tr>
          </thead>
          <tbody id="containers-tbody">
            ${trs}
          </tbody>
          <tfoot>
            <tr class="bg-slate-50 font-semibold text-slate-700 text-xs border-t border-slate-200">
              <td colspan="2" class="py-1.5 px-2 text-slate-500 font-normal">
                <span>${t('sales_new.containers.total')}</span>
                <span id="cont-summary-spec" class="ml-2 font-mono text-blue-700"></span>
              </td>
              <td class="py-1.5 px-1.5 text-center font-mono text-blue-700" id="cont-sum-qty">0</td>
              <td class="py-1.5 px-1.5"></td>
              <td class="py-1.5 px-1.5 text-right font-mono" id="cont-sum-gw">0</td>
              <td class="py-1.5 px-1.5 text-right font-mono" id="cont-sum-cbm">0</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>`;
}

export function syncContainerRollup(root) {
  const rows = Array.from(root.querySelectorAll('#containers-tbody tr[data-cont-row]'));
  let totalGw = 0;
  let totalCbm = 0;
  const specCounts = new Map();
  const seals = [];

  rows.forEach((r) => {
    const spec = r.querySelector('[data-cont-field="spec"]')?.value || '40HC';
    const seal = r.querySelector('[data-cont-field="seal_no"]')?.value?.trim();
    const gw = parseFloat(r.querySelector('[data-cont-field="weight_kg"]')?.value) || 0;
    const cbm = parseFloat(r.querySelector('[data-cont-field="cbm"]')?.value) || 0;

    specCounts.set(spec, (specCounts.get(spec) || 0) + 1);
    if (seal) seals.push(seal);
    totalGw += gw;
    totalCbm += cbm;
  });

  const totalContQty = rows.length;
  const elQty = root.querySelector('#cont-sum-qty');
  const elGw = root.querySelector('#cont-sum-gw');
  const elCbm = root.querySelector('#cont-sum-cbm');
  const elSpec = root.querySelector('#cont-summary-spec');

  const specSummary = Array.from(specCounts.entries())
    .map(([spec, count]) => `${count}x${spec}`)
    .join(', ');

  if (elQty) elQty.textContent = totalContQty;
  if (elGw) elGw.textContent = totalGw.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
  if (elCbm) elCbm.textContent = totalCbm.toLocaleString('vi-VN', { maximumFractionDigits: 3 });
  if (elSpec) elSpec.textContent = specSummary;

  // Auto-roll up to Header fields
  const inpQty = root.querySelector('input[name=container_qty]');
  const inpVol = root.querySelector('select[name=volume]');
  const inpSeal = root.querySelector('input[name=seal_no]');

  if (inpQty && totalContQty > 0) inpQty.value = totalContQty;
  if (inpVol && specCounts.size === 1) {
    const onlySpec = specCounts.keys().next().value;
    if (onlySpec) inpVol.value = onlySpec;
  }
  if (inpSeal && seals.length > 0) inpSeal.value = seals.join(', ');
}

export function collectContainers(root) {
  const rows = Array.from(root.querySelectorAll('#containers-tbody tr[data-cont-row]'));
  return rows.map((r) => {
    const val = (f) => r.querySelector(`[data-cont-field="${f}"]`)?.value?.trim() || '';
    const num = (f) => {
      const v = parseFloat(val(f));
      return Number.isFinite(v) && v > 0 ? v : null;
    };
    return {
      container_no: val('container_no'),
      spec: val('spec') || '40HC',
      seal_no: val('seal_no') || null,
      weight_kg: num('weight_kg'),
      cbm: num('cbm'),
    };
  }).filter((c) => c.container_no || c.seal_no || c.weight_kg || c.cbm);
}

export function wireContainersTable(root, onChanged = null) {
  const table = root.querySelector('#containers-table');
  const tbody = root.querySelector('#containers-tbody');
  const addBtn = root.querySelector('#btn-add-container-row');
  if (!table || !tbody) return;

  syncContainerRollup(root);

  tbody.addEventListener('input', () => {
    syncContainerRollup(root);
    onChanged?.();
  });
  tbody.addEventListener('change', () => {
    syncContainerRollup(root);
    onChanged?.();
  });

  addBtn?.addEventListener('click', () => {
    const nextIdx = tbody.querySelectorAll('tr[data-cont-row]').length;
    const tr = document.createElement('tbody');
    tr.innerHTML = containerRowHtml(nextIdx, {});
    tbody.appendChild(tr.firstElementChild);
    syncContainerRollup(root);
    onChanged?.();
  });

  tbody.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-rm-cont]');
    if (!btn) return;
    const row = btn.closest('tr[data-cont-row]');
    if (row) {
      if (tbody.querySelectorAll('tr[data-cont-row]').length <= 1) {
        row.querySelectorAll('input').forEach((inp) => { inp.value = ''; });
      } else {
        row.remove();
        tbody.querySelectorAll('tr[data-cont-row]').forEach((r, i) => {
          r.dataset.contRow = i;
          const numCell = r.querySelector('td:first-child');
          if (numCell) numCell.textContent = i + 1;
        });
      }
      syncContainerRollup(root);
      onChanged?.();
    }
  });
}
