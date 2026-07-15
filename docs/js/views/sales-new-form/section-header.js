// section-header.js — Section A: identity, parties, routing, commercial

import { t } from '../../i18n/index.js';
import { classifyDocument } from '../sales-new/doc-auto-detect.js';
import { computeChargeableKg } from '../../operators/air-rate-calculator.js';
import { slugify } from '../../operators/pnl-commit-orchestrator.js';
import { loadWasm } from '../../wasm-loader.js';
import { getEmbedding } from '../../cache/semantic-search.js';

const CURRENCY_OPTIONS = ['USD', 'VND', 'EUR', 'SGD', 'JPY'];
const PRODUCT_OPTIONS  = ['FCL EXPORT', 'IMPORT FCL', 'AIR', 'LCL'];
const MODE_OPTIONS     = ['SEA', 'AIR'];

function fld(label, inner) {
  return `
    <div>
      <label class="block text-[10px] text-slate-500 mb-0.5">${label}</label>
      ${inner}
    </div>`;
}

// field with extra wrapper attrs (for data-sea-only / data-air-only)
function cfld(label, inner, attr) {
  return `
    <div ${attr}>
      <label class="block text-[10px] text-slate-500 mb-0.5">${label}</label>
      ${inner}
    </div>`;
}

function txt(name, val, ph) {
  const phAttr = ph ? ` placeholder="${ph}"` : '';
  return `<input type="text" name="${name}" value="${val || ''}"${phAttr}
    class="w-full border border-slate-200 rounded px-2 py-1 text-xs" />`;
}

function num(name, val) {
  return `<input type="number" name="${name}" value="${val || ''}" step="any"
    class="w-full border border-slate-200 rounded px-2 py-1 text-xs" />`;
}

function roNum(name, val) {
  return `<input type="number" name="${name}" value="${val || ''}" step="any" readonly
    class="w-full border border-slate-200 rounded px-2 py-1 text-xs bg-slate-50" />`;
}

function dateInp(name, val) {
  return `<input type="date" name="${name}" value="${val || ''}"
    class="w-full border border-slate-200 rounded px-2 py-1 text-xs" />`;
}

function optHtml(options, selected) {
  return options.map((o) =>
    `<option value="${o}"${o === selected ? ' selected' : ''}>${o}</option>`
  ).join('');
}

function selFld(name, options, selected) {
  return `<select name="${name}"
    class="w-full border border-slate-200 rounded px-2 py-1 text-xs">
    <option value="">—</option>${optHtml(options, selected)}
  </select>`;
}

// Custom combobox with semantic search
function custSel(customers, selected, isAutofilled) {
  const autofillAttr = isAutofilled ? ' data-autofilled="true"' : '';
  return `
    <div class="relative" id="customer-search-container">
      <input type="hidden" name="customer" value="${selected || ''}" />
      <input type="text" id="customer-search-input" value="${selected || ''}" placeholder="${t('sales_new.select_placeholder')}" autocomplete="off"${autofillAttr}
        class="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-colors duration-200" />
      <div id="customer-search-dropdown" class="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg hidden flex-col max-h-48 overflow-y-auto text-xs">
        <!-- results go here -->
      </div>
    </div>`;
}

export function sectionAHtml(draft = {}, customers = []) {
  const d    = draft;
  const mode = (d.mode || 'SEA').toUpperCase();
  const seaHide = mode === 'AIR' ? ' class="hidden"' : '';
  const airHide = mode === 'AIR' ? '' : ' class="hidden"';
  return `
    <div id="sec-a-body" class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">
        ${t('sales_new.section.header')}
      </div>
      <div class="grid grid-cols-3 gap-3">
        ${fld(t('sales_new.mode_selector.title'),
          selFld('mode', MODE_OPTIONS, mode))}
        ${fld(t('sales_new.field.mbl'),      txt('mbl', d.mbl))}
        ${fld(t('sales_new.field.hbl'),      txt('hbl', d.hbl))}
        ${fld(t('sales_new.field.product'),  selFld('product', PRODUCT_OPTIONS, d.product))}
        ${fld(t('sales_new.field.customer'), custSel(customers, d.customer, d._autofilled))}
        ${fld(t('sales_new.field.shipper'),   txt('shipper',  d.shipper))}
        ${fld(t('sales_new.field.consignee'), txt('consignee', d.consignee))}
        ${fld(t('sales_new.field.contact'),   txt('contact_person', d.contact_person))}
        ${cfld(t('sales_new.field.vessel'),   txt('vessel', d.vessel),    `data-sea-only${seaHide}`)}
        ${fld(t('sales_new.field.carrier'),   txt('carrier', d.carrier))}
        ${fld(t('sales_new.field.etd'),       dateInp('etd', d.etd))}
        ${fld(t('sales_new.field.eta'),       dateInp('eta', d.eta))}
        ${fld(t('sales_new.field.pol'),       txt('pol', d.pol, 'VNSGN'))}
        ${fld(t('sales_new.field.pod'),       txt('pod', d.pod, 'USLAX'))}
        ${cfld(t('sales_new.field.volume'),   txt('volume', d.volume, '1X40HC'), `data-sea-only${seaHide}`)}
        ${fld(t('sales_new.field.roe_buy'),  num('roe_buying', d.roe_buying))}
        ${fld(t('sales_new.field.roe_sell'), num('roe_selling', d.roe_selling))}
        ${fld(t('sales_new.field.currency'),
          selFld('currency', CURRENCY_OPTIONS, d.currency || 'USD'))}
        <div>
          <label class="block text-[10px] text-slate-500 mb-0.5">${t('sales_new.field.sales_rep')}</label>
          <div class="flex gap-1">
            <input type="text" name="sales_rep" value="${d.sales_rep || ''}"
              class="flex-1 border border-slate-200 rounded px-2 py-1 text-xs" />
            <span id="doc-type-badge"
              class="hidden text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 self-center">
            </span>
          </div>
        </div>
        ${cfld(t('sales_new.field.weight_actual'), num('weight_actual_kg', d.weight_actual_kg), `data-air-only${airHide}`)}
        ${cfld(t('sales_new.field.dim_l'),         num('dim_l_cm', d.dim_l_cm),                `data-air-only${airHide}`)}
        ${cfld(t('sales_new.field.dim_w'),         num('dim_w_cm', d.dim_w_cm),                `data-air-only${airHide}`)}
        ${cfld(t('sales_new.field.dim_h'),         num('dim_h_cm', d.dim_h_cm),                `data-air-only${airHide}`)}
        ${cfld(t('sales_new.field.pieces'),        num('pieces', d.pieces),                     `data-air-only${airHide}`)}
        ${cfld(t('sales_new.field.uld_type'),      txt('uld_type', d.uld_type),                 `data-air-only${airHide}`)}
        ${cfld(t('sales_new.field.flight_no'),     txt('flight_no', d.flight_no),               `data-air-only${airHide}`)}
        ${cfld(t('sales_new.field.origin_iata'),   txt('origin_iata', d.origin_iata, 'SGN'),    `data-air-only${airHide}`)}
        ${cfld(t('sales_new.field.dest_iata'),     txt('dest_iata', d.dest_iata, 'HAN'),        `data-air-only${airHide}`)}
        ${cfld(t('sales_new.field.chargeable_kg'), roNum('chargeable_kg', d.chargeable_kg),     `data-air-only${airHide}`)}
      </div>
    </div>`;
}

// apply mode: toggle sea-only / air-only field visibility
function _applyMode(root, mode) {
  const isAir = mode === 'AIR';
  root.querySelectorAll('[data-sea-only]').forEach((el) => {
    el.classList.toggle('hidden', isAir);
  });
  root.querySelectorAll('[data-air-only]').forEach((el) => {
    el.classList.toggle('hidden', !isAir);
  });
}

// recompute + display chargeable weight from air inputs
function _updateChargeable(root) {
  const n = (name) => parseFloat(root.querySelector(`[name=${name}]`)?.value) || 0;
  const kg = computeChargeableKg(
    n('weight_actual_kg'), n('dim_l_cm'), n('dim_w_cm'), n('dim_h_cm')
  );
  const el = root.querySelector('[name=chargeable_kg]');
  if (el) el.value = kg;
}

// Wires MBL → doc-type badge; mode toggle; chargeable weight; calls onChanged on any Section A input
export function wireHeaderSection(root, onChanged) {
  const mblEl  = root.querySelector('[name=mbl]');
  const modeEl = root.querySelector('[name=mode]');
  const badge  = root.querySelector('#doc-type-badge');

  const updateBadge = () => {
    const res = classifyDocument(mblEl?.value || '');
    if (res.confidence !== 'Low' && res.docType) {
      if (badge) { badge.textContent = res.docType; badge.classList.remove('hidden'); }
    } else if (badge) {
      badge.classList.add('hidden');
    }
  };

  mblEl?.addEventListener('input', () => { updateBadge(); onChanged?.(); });
  mblEl?.addEventListener('paste', () => setTimeout(() => { updateBadge(); onChanged?.(); }, 0));

  modeEl?.addEventListener('change', () => {
    _applyMode(root, modeEl.value);
    onChanged?.();
  });

  const airFields = ['weight_actual_kg', 'dim_l_cm', 'dim_w_cm', 'dim_h_cm'];
  airFields.forEach((name) => {
    root.querySelector(`[name=${name}]`)?.addEventListener('input', () => {
      _updateChargeable(root);
      onChanged?.();
    });
  });

  root.querySelector('#sec-a-body')?.querySelectorAll('input,select').forEach((el) => {
    if (el !== mblEl && el !== modeEl && !airFields.includes(el.name) && el.id !== 'customer-search-input') {
      el.addEventListener('input', onChanged);
      el.addEventListener('change', onChanged);
    }
  });

  // Wire Customer Hybrid Search
  const custInput = root.querySelector('#customer-search-input');
  const custHidden = root.querySelector('[name=customer]');
  const custDropdown = root.querySelector('#customer-search-dropdown');
  let cIndex = null;
  const initCIndex = async () => {
      if (cIndex) return;
      const wasm = await loadWasm();
      if (!wasm) return;
      cIndex = new wasm.CustomerIndex();
      // Assume customers array is available globally or passed down (it's passed in sectionAHtml but not here, we need to grab it)
      // We will populate it from window.__vdg_repo if needed
      try {
          const repo = window.__vdg_repo;
          if (repo) {
              const list = await repo.list('customers');
              for (const c of list) {
                  if (c.name) {
                      cIndex.add_customer(JSON.stringify({ id: c.name, name: c.name, embedding: c.embedding || null }));
                  }
              }
          }
      } catch (e) { console.warn('Failed to load customers into index', e); } // DEV
  };

  let searchTimeout = null;

  const renderDropdown = (results, query) => {
      custDropdown.innerHTML = '';
      if (results.length > 0) {
          results.forEach(r => {
              const div = document.createElement('div');
              div.className = 'px-3 py-2 hover:bg-blue-50 cursor-pointer flex justify-between items-center border-b border-slate-100';
              const scoreHtml = r.score !== undefined ? `<span class="text-[9px] text-slate-400">Score: ${(r.score).toFixed(2)}</span>` : '';
              div.innerHTML = `<span class="font-medium">${r.name}</span>${scoreHtml}`;
              div.addEventListener('click', () => {
                  custInput.value = r.name;
                  custHidden.value = r.name;
                  custDropdown.classList.add('hidden');
                  onChanged?.();
              });
              custDropdown.appendChild(div);
          });
      } else {
          custDropdown.innerHTML = `<div class="px-3 py-2 text-slate-400 italic">Không tìm thấy khách hàng.</div>`;
      }
      
      if (query) {
          const createBtn = document.createElement('div');
          createBtn.className = 'px-3 py-2 bg-slate-50 hover:bg-slate-100 cursor-pointer text-blue-600 font-medium text-center sticky bottom-0 border-t border-slate-200';
          createBtn.textContent = '+ Tạo nhanh: "' + query + '"';
          createBtn.addEventListener('click', async () => {
              const repo = window.__vdg_repo;
              if (repo) {
                  const id = `CUST-${slugify(query)}`;
                  const newCust = { id, name: query, status: 'Draft' };
                  try {
                      await repo.put('customers', id, newCust);
                      custInput.value = query;
                      custHidden.value = query;
                      custDropdown.classList.add('hidden');
                      if (cIndex) cIndex.add_customer(JSON.stringify({ id: query, name: query, embedding: null }));
                      onChanged?.();
                      window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { message: 'Đã tạo nhanh khách hàng', type: 'success' } }));
                  } catch(err) {
                      console.error(err); // DEV
                  }
              }
          });
          custDropdown.appendChild(createBtn);
      }
      
      custDropdown.classList.remove('hidden');
  };

  const doSearch = (query, isAutofillCheck = false) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(async () => {
          if (!query) {
              const repo = window.__vdg_repo;
              let results = [];
              if (repo) {
                  const list1 = await repo.list('customers') || [];
                  const list2 = await repo.list('customer') || [];
                  const list = list1.length > list2.length ? list1 : list2;
                  results = list.slice(0, 5).map(c => ({ name: c.name }));
              }
              renderDropdown(results, query);
              return;
          }
          await initCIndex();
          const qEmb = await getEmbedding(query);
          let resultsJson = '[]';
          if (cIndex) {
              resultsJson = cIndex.search(query, JSON.stringify(qEmb), 5);
          }
          const results = JSON.parse(resultsJson);
          
          if (isAutofillCheck) {
              // If it's an exact match or very close score, auto-accept and don't warn
              const exactMatch = results.find(r => r.name.toLowerCase() === query.toLowerCase());
              if (exactMatch || (results.length > 0 && results[0].score > 0.95)) {
                  const bestName = exactMatch ? exactMatch.name : results[0].name;
                  custInput.value = bestName;
                  custHidden.value = bestName;
                  custInput.classList.remove('border-amber-400', 'bg-amber-50');
                  custDropdown.classList.add('hidden');
                  onChanged?.();
                  return;
              } else {
                  // Not exact match, show amber warning and open dropdown
                  custInput.classList.add('border-amber-400', 'bg-amber-50');
              }
          } else {
              custInput.classList.remove('border-amber-400', 'bg-amber-50');
          }
          
          renderDropdown(results, query);
      }, 100);
  };

  custInput?.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      custHidden.value = query; // keep it in sync for raw typing
      onChanged?.();
      doSearch(query);
  });
  
  custInput?.addEventListener('focus', (e) => {
      const query = e.target.value.trim();
      doSearch(query);
  });
  
  // Trigger autofill check
  if (custInput?.hasAttribute('data-autofilled') && custInput.value.trim()) {
      doSearch(custInput.value.trim(), true);
  }
  
  // Hide dropdown when clicking outside
  document.addEventListener('click', (e) => {
      if (!custInput?.contains(e.target) && !custDropdown?.contains(e.target)) {
          custDropdown?.classList.add('hidden');
      }
  });
}
