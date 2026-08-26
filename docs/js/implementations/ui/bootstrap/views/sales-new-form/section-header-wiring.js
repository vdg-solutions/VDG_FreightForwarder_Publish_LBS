// section-header-wiring.js — Section A behaviour: DOM listeners, mode toggle, chargeable weight,
// customer→rep autofill. Split out of section-header.js at the markup/behaviour seam when that
// file crossed the 350-line cap (F-41-01/02 added the rep select and quote picker). The markup
// builders and the field primitives other sections import stay in section-header.js.

import { t } from '../../../../kernel/core_abstractions/i18n/index.js';
import { classifyDocument } from '../sales-new/doc-auto-detect.js';
import { loadWasm } from '../../../core_abstractions/ports/wasm-loader.js';
import { getEmbedding } from '../../../implementations/semantic-search.js';
import { computeChargeableKg } from '../../../core_abstractions/ports/flows/air-rate-calculator.js';
import { slugify } from '../../../core_abstractions/ports/flows/pnl-commit-orchestrator.js';
import { customerRepFor } from '../../../core_abstractions/ports/flows/sales-rep-derivation.js';
import { directionFromProduct } from './section-header.js';

// F-41-07: keep the direction control honest about who decided. A product that names the
// direction fills it and locks it (submitting through a hidden twin, since a disabled select
// sends nothing); a product that cannot name it hands the choice back to the user.
function _applyDirection(root) {
  const sel = root.querySelector('[name=direction], [name=direction_display]');
  if (!sel) return;
  const settled = directionFromProduct(root.querySelector('[name=product]')?.value || '');
  let mirror = root.querySelector('input[type=hidden][name=direction]');
  if (settled) {
    sel.value = settled;
    sel.disabled = true;
    sel.name = 'direction_display';
    sel.classList.add('bg-slate-50');
    if (!mirror) {
      mirror = document.createElement('input');
      mirror.type = 'hidden';
      mirror.name = 'direction';
      sel.after(mirror);
    }
    mirror.value = settled;
  } else {
    mirror?.remove();
    sel.disabled = false;
    sel.name = 'direction';
    sel.classList.remove('bg-slate-50');
  }
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

// weight_actual is entered in whatever unit weight_uom names, but compute_chargeable_kg (and
// every rate-card lookup downstream of it) is kg-only — converted here, once, before the wasm
// call, so a LB actual never gets read as if it were already kg. LB is the only non-kg unit the
// registry seeds today; an exact international pound (kept as a named constant, not inline).
const LB_TO_KG = 0.45359237;
function _toKg(value, uom) {
  return uom === 'LB' ? value * LB_TO_KG : value;
}

// recompute + display chargeable weight from air inputs
function _updateChargeable(root) {
  const n = (name) => parseFloat(root.querySelector(`[name=${name}]`)?.value) || 0;
  const actualUom = root.querySelector('[name=weight_uom]')?.value;
  const actualKg  = _toKg(n('weight_actual'), actualUom);
  const kg = computeChargeableKg(actualKg, n('dim_l_cm'), n('dim_w_cm'), n('dim_h_cm'));
  const el = root.querySelector('[name=chargeable_kg]');
  if (el) el.value = kg;
}

// Wires MBL → doc-type badge; mode toggle; chargeable weight; calls onChanged on any Section A input
export function wireHeaderSection(root, onChanged) {
  const mblEl  = root.querySelector('[name=mbl]');
  const modeEl = root.querySelector('[name=mode]');
  const badge  = root.querySelector('#doc-type-badge');

  root.querySelector('[name=product]')?.addEventListener('change', () => {
    _applyDirection(root);
    onChanged?.();
  });

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
  const hblChk = root.querySelector('[name=has_hbl]'); // F-32-01 DEFECT-02: HBL/D-O display toggle
  hblChk?.addEventListener('change', () => {
    const on = hblChk.checked, disp = root.querySelector('[name=hbl_do_display]');
    root.querySelectorAll('[data-hbl-do-row]').forEach((el) => el.classList.toggle('hidden', !on));
    if (disp) disp.value = on ? (root.querySelector('[name=job_no]')?.value || '') : '';
  });

  const airFields = ['weight_actual', 'dim_l_cm', 'dim_w_cm', 'dim_h_cm'];
  airFields.forEach((name) => {
    root.querySelector(`[name=${name}]`)?.addEventListener('input', () => {
      _updateChargeable(root);
      onChanged?.();
    });
  });
  // weight_uom is a <select>, not an air-field text/number input — changing the unit alone (no
  // change in the typed number) still has to re-run the conversion the chargeable weight depends on.
  root.querySelector('[name=weight_uom]')?.addEventListener('change', () => {
    _updateChargeable(root);
    onChanged?.();
  });

  root.querySelector('#sec-a-body')?.querySelectorAll('input,select').forEach((el) => {
    if (el !== mblEl && el !== modeEl && !airFields.includes(el.name) && el.name !== 'weight_uom' && el.id !== 'customer-search-input') {
      el.addEventListener('input', onChanged);
      el.addEventListener('change', onChanged);
    }
  });

  // F-41-01: picking a customer fills the rep select from the customer master — only when no rep
  // is chosen yet, and only with a prefix the select actually offers. Dispatches 'change' so the
  // Job No preview re-mints under the filled rep.
  async function _autofillRep(customerName) {
    const sel = root.querySelector('select[name=sales_rep]');
    if (!sel || sel.value) return;
    try {
      const repo = window.__vdg_repo;
      const list = repo ? await repo.list('customers') : [];
      const rep  = customerRepFor(customerName, list);
      if (rep && [...sel.options].some((o) => o.value === rep)) {
        sel.value = rep;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } catch { /* autofill is best-effort — the select stays for a manual pick */ }
  }

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
              const scoreHtml = r.score !== undefined ? `<span class="text-[9px] text-slate-400">${t('common.score_label')} ${(r.score).toFixed(2)}</span>` : '';
              div.innerHTML = `<span class="font-medium">${r.name}</span>${scoreHtml}`;
              div.addEventListener('click', () => {
                  custInput.value = r.name;
                  custHidden.value = r.name;
                  custDropdown.classList.add('hidden');
                  _autofillRep(r.name);
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
