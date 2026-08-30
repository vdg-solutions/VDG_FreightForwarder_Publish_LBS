// Ocean Tariff master — E-20 F-28-15 (capstone slice (e)), CRUD completion F-57-02
// Route: /masters/ocean-tariff
// Priced kind joined against ocean-carriers by carrier_scac; effective rate resolved via
// the real wasm resolver through PricedRefRepo.resolveOnDate — no JS date/rate selection.
// Add/edit/delete mirror ocean-carriers.js's shape exactly (dialog modal, escHtml, genId,
// showConfirm) — writes land on the plain `ocean-tariff` master list the same way every other
// ACCOUNTANT_ONLY master does; still no propose/merge panel here (that governance machinery is
// separate, unreleased work — see priced-ref-repo.test.mjs for the contract it already covers).

import { currentRoles } from '../../../../../ui/core_abstractions/ports/auth/session-roles.js';
import { canWriteMaster } from '../../../../core_abstractions/ports/cache/master-registry.js';
import { t }         from '../../../../../kernel/core_abstractions/i18n/index.js';
import { showConfirm } from '../../../helpers/show-confirm.js';
import { boundedList, foldSyncFailure, renderMasterLoadRetryStatus } from '../../../../../kernel/core_abstractions/util/master-load.js';

const KIND             = 'ocean-tariff';
const KIND_PREFIX      = 'OTF';
const CARRIER_KIND     = 'ocean-carriers';
const DEFAULT_UNIT     = 'per_teu';
const ISO_DATE_LENGTH  = 10; // 'YYYY-MM-DD' slice of Date#toISOString()

// verify-domain-arithmetic: a resolved amount whose order of magnitude doesn't fit its
// quoted currency is a scale bug, never a legit rate — bounds are ocean-freight per-TEU/FEU
// container figures, not a generic currency-conversion table.
const MIN_PLAUSIBLE_VND_RATE = 1_000_000; // below this a "VND" amount is almost certainly an unconverted foreign figure
const MAX_PLAUSIBLE_USD_RATE = 50_000;    // a per-TEU/FEU USD ocean rate never reaches five figures without a scale bug

function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function todayIso() { return new Date().toISOString().slice(0, ISO_DATE_LENGTH); }

function genPricingKey(carrier, origin, dest) { return `${KIND_PREFIX}-${carrier}-${origin}-${dest}`; }

// Same read-side projection local-charges.js uses for line_scac (AC-05).
export function buildCarrierNameMap(carriers) {
  return new Map((carriers || []).map((c) => [c.scac, c.name]));
}

// Graceful fallback to the raw FK — never crash, never blank (AC-05).
export function resolveCarrierName(row, carrierMap) {
  return carrierMap.get(row.carrier_scac) ?? row.carrier_scac;
}

function currencyCode(currency) {
  if (typeof currency === 'string') return currency.toUpperCase();
  if (currency && typeof currency === 'object' && 'Other' in currency) return String(currency.Other).toUpperCase();
  return 'UNKNOWN';
}

// AC-06: pure magnitude-sanity predicate — annotates a resolved record, never recomputes
// the rate. Flags a 1:1 mis-scale (e.g. a USD-scale figure surfacing unchanged under a
// VND quote, or vice-versa) — the value it checks comes only from the resolver.
export function isRateMagnitudePlausible(record) {
  const amount = Number(record?.body?.rate_amount);
  if (!Number.isFinite(amount) || amount <= 0) return false;
  const code = currencyCode(record?.currency);
  if (code === 'VND') return amount >= MIN_PLAUSIBLE_VND_RATE;
  if (code === 'USD') return amount <= MAX_PLAUSIBLE_USD_RATE;
  return true; // unrecognized currency — only the positive/finite guard above applies
}

// AC-06: routes through the real wasm resolver via the injected PricedRefRepo — no
// JS-side date/rate branch, the amount/currency come only from the returned PricedRecord.
// Missing repo, or a ref not migrated yet / no covering window, degrades to the seeded
// row body so the row still renders (never crash — mirrors AC-05's fallback intent).
export async function resolveEffectiveRecord(pricedRepo, row, dateStr) {
  if (!pricedRepo) return { currency: row.currency, body: row };
  try {
    return await pricedRepo.resolveOnDate(row.pricing_key, dateStr);
  } catch {
    // ref not migrated yet / no covering window for this date — seeded row stands in
    return { currency: row.currency, body: row };
  }
}

function displayRate(amount, currency) {
  const wasm = window.__vdg_wasm;
  if (!wasm?.pnl_round_for_display || !Number.isFinite(Number(amount))) return amount;
  return wasm.pnl_round_for_display(Number(amount), currency); // display rounds to the ISO 4217 exponent; storage keeps full precision
}

function rowHtml(row, carrierName, record, isM) {
  const plausible = isRateMagnitudePlausible(record);
  const rateCls   = plausible ? 'text-slate-900 font-medium' : 'text-red-600 font-semibold';
  const warnBadge = plausible ? '' : '<span class="ml-1 px-1 py-0.5 rounded text-[9px] bg-red-100 text-red-700">!</span>';
  const validFrom = record.body?.valid_from ?? row.valid_from;
  const validTo   = record.body?.valid_to   ?? row.valid_to;
  const code      = currencyCode(record.currency);
  const actions = isM ? `
    <button class="btn-edit text-xs text-blue-600 hover:underline mr-2" data-id="${escHtml(row.id)}">${t('common.action.edit')}</button>
    <button class="btn-delete text-xs text-red-500 hover:underline" data-id="${escHtml(row.id)}">${t('common.action.delete')}</button>` : '';
  return `
    <tr class="border-t border-slate-100 hover:bg-slate-50 text-xs" data-id="${escHtml(row.id)}">
      <td class="px-3 py-2">${escHtml(carrierName)}</td>
      <td class="px-3 py-2">${escHtml(row.lane_origin)} → ${escHtml(row.lane_dest)}</td>
      <td class="px-3 py-2 text-right ${rateCls}">${escHtml(displayRate(record.body?.rate_amount, code))}${warnBadge}</td>
      <td class="px-3 py-2">${escHtml(code)}</td>
      <td class="px-3 py-2 text-[10px] text-slate-400">${escHtml(validFrom)} – ${escHtml(validTo)}</td>
      ${isM ? `<td class="px-3 py-2">${actions}</td>` : ''}
    </tr>`;
}

function buildModal(entity) {
  const e = entity || {};
  return `
    <dialog id="ot-modal" class="rounded-xl border border-slate-200 shadow-xl p-0 w-full max-w-lg backdrop:bg-black/30">
      <form id="ot-form" method="dialog" class="p-6 space-y-4">
        <div class="text-base font-semibold text-slate-900 mb-1">${entity ? t('masters.ocean_tariff.edit_title') : t('masters.ocean_tariff.add_button')}</div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t('masters.ocean_tariff.field.carrier')} <span class="text-red-500">*</span></label>
            <input id="ot-carrier" type="text" maxlength="4" value="${escHtml(e.carrier_scac)}" required placeholder="e.g. WHLC"
                   class="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <span id="ot-err-carrier" class="hidden text-xs text-red-600"></span>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t('masters.ocean_tariff.field.origin')} <span class="text-red-500">*</span></label>
            <input id="ot-origin" type="text" maxlength="5" value="${escHtml(e.lane_origin)}" required placeholder="VNSGN"
                   class="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t('masters.ocean_tariff.field.dest')} <span class="text-red-500">*</span></label>
            <input id="ot-dest" type="text" maxlength="5" value="${escHtml(e.lane_dest)}" required placeholder="USLAX"
                   class="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t('masters.ocean_tariff.col_rate')} <span class="text-red-500">*</span></label>
            <input id="ot-rate" type="number" min="0.01" step="0.01" value="${escHtml(e.rate_amount)}" required
                   class="w-full border rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <span id="ot-err-rate" class="hidden text-xs text-red-600"></span>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t('masters.ocean_tariff.col_currency')} <span class="text-red-500">*</span></label>
            <input id="ot-currency" type="text" maxlength="3" value="${escHtml(e.currency || 'USD')}" required
                   class="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t('masters.ocean_tariff.field.valid_from')} <span class="text-red-500">*</span></label>
            <input id="ot-from" type="date" value="${escHtml(e.valid_from)}" required
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t('masters.ocean_tariff.field.valid_to')} <span class="text-red-500">*</span></label>
            <input id="ot-to" type="date" value="${escHtml(e.valid_to)}" required
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <span id="ot-err-dates" class="hidden text-xs text-red-600"></span>
          </div>
        </div>
        <div class="flex gap-3 pt-2 border-t border-slate-100">
          <button type="submit" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg">${t('common.action.save')}</button>
          <button type="button" id="btn-modal-cancel" class="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">${t('common.action.cancel')}</button>
        </div>
      </form>
    </dialog>`;
}

function openModal(root, entity, onSave) {
  root.querySelector('#ot-modal')?.remove();
  root.insertAdjacentHTML('beforeend', buildModal(entity));
  const dialog = root.querySelector('#ot-modal');
  dialog.showModal();
  dialog.querySelector('#btn-modal-cancel').addEventListener('click', () => dialog.close());
  dialog.querySelector('#ot-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const carrier   = dialog.querySelector('#ot-carrier').value.trim().toUpperCase();
    const origin    = dialog.querySelector('#ot-origin').value.trim().toUpperCase();
    const dest      = dialog.querySelector('#ot-dest').value.trim().toUpperCase();
    const rate      = Number(dialog.querySelector('#ot-rate').value);
    const currency  = dialog.querySelector('#ot-currency').value.trim().toUpperCase();
    const validFrom = dialog.querySelector('#ot-from').value;
    const validTo   = dialog.querySelector('#ot-to').value;

    const setErr = (id, msg) => {
      const el = dialog.querySelector(id);
      if (!el) return;
      el.textContent = msg;
      el.classList.toggle('hidden', !msg);
    };
    setErr('#ot-err-carrier', ''); setErr('#ot-err-rate', ''); setErr('#ot-err-dates', '');

    const wasm = window.__vdg_wasm;
    if (!wasm.validate_scac(carrier)) { setErr('#ot-err-carrier', '2-4 uppercase letters, e.g. WHLC'); return; }
    if (!Number.isFinite(rate) || rate <= 0) { setErr('#ot-err-rate', t('masters.ocean_tariff.err_rate_positive')); return; }
    if (!wasm.validate_date_range(validFrom, validTo)) { setErr('#ot-err-dates', t('masters.ocean_tariff.err_dates_invalid')); return; }

    const pricingKey = genPricingKey(carrier, origin, dest);
    const updated = {
      ...(entity || {}),
      id:           entity?.id || `${pricingKey}-${validFrom}`,
      pricing_key:  pricingKey,
      carrier_scac: carrier,
      lane_origin:  origin,
      lane_dest:    dest,
      rate_amount:  rate,
      currency,
      valid_from:   validFrom,
      valid_to:     validTo,
      unit:         entity?.unit || DEFAULT_UNIT,
    };
    await onSave(updated);
    dialog.close();
  });
}

export async function render(root) {
  const isM        = canWriteMaster(KIND, currentRoles());
  const repo       = window.__vdg_repo;
  const pricedRepo = window.__vdg_priced_repos?.[KIND];
  const actCol     = isM ? `<th class="px-3 py-2 text-left w-28">${t('common.col.actions')}</th>` : '';

  root.innerHTML = `
    <div class="p-6 max-w-[1100px] mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div class="text-lg font-semibold text-slate-900">${t('masters.ocean_tariff.title')}</div>
        ${isM ? `<button id="btn-add" class="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700">+ ${t('masters.ocean_tariff.add_button')}</button>` : ''}
      </div>
      <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table class="w-full">
          <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-3 py-2 text-left">${t('masters.ocean_tariff.col_carrier')}</th>
              <th class="px-3 py-2 text-left">${t('masters.ocean_tariff.col_lane')}</th>
              <th class="px-3 py-2 text-right">${t('masters.ocean_tariff.col_rate')}</th>
              <th class="px-3 py-2 text-left">${t('masters.ocean_tariff.col_currency')}</th>
              <th class="px-3 py-2 text-left">${t('masters.ocean_tariff.col_effective')}</th>
              ${actCol}
            </tr>
          </thead>
          <tbody id="m-tbody"></tbody>
        </table>
        <div id="m-empty" class="hidden text-center text-xs text-slate-400 py-8">${t('masters.ocean_tariff.empty')}</div>
      </div>
      <div id="m-status" class="text-xs text-slate-400 mt-2">${t('common.load.loading')}</div>
    </div>`;

  let items = [];

  // F-20-01: bounded — a stalled Drive read on a fresh workspace resolves to an
  // actionable retry instead of hanging at the loading placeholder.
  async function reload() {
    const tbody    = root.querySelector('#m-tbody');
    const emptyEl  = root.querySelector('#m-empty');
    const statusEl = root.querySelector('#m-status');
    if (!repo) { items = []; if (tbody) tbody.innerHTML = ''; if (statusEl) statusEl.textContent = ''; return; }

    const [tariffRaw, carrierRes] = await Promise.all([
      boundedList(repo, KIND, 'ocean-tariff:list'),
      boundedList(repo, CARRIER_KIND, 'ocean-tariff:carriers'),
    ]);
    const tariffRes = foldSyncFailure(tariffRaw, KIND, repo);
    if (!tariffRes.ok) {
      if (tbody) tbody.innerHTML = '';
      emptyEl?.classList.add('hidden');
      renderMasterLoadRetryStatus(statusEl, t('masters.load_error'), t('retry'), reload);
      return;
    }

    items = tariffRes.value;
    const carriers   = carrierRes.ok ? carrierRes.value : [];
    const carrierMap = buildCarrierNameMap(carriers);

    const dateStr = todayIso();
    const rows = await Promise.all(items.map(async (row) => {
      const record = await resolveEffectiveRecord(pricedRepo, row, dateStr);
      return rowHtml(row, resolveCarrierName(row, carrierMap), record, isM);
    }));
    if (tbody) tbody.innerHTML = rows.join('');
    if (emptyEl) emptyEl.classList.toggle('hidden', items.length > 0);
    if (statusEl) statusEl.textContent = '';
  }

  await reload();

  root.querySelector('#btn-add')?.addEventListener('click', () => {
    openModal(root, null, async (entity) => { await repo.put(KIND, entity.id, entity); await reload(); });
  });

  root.querySelector('#m-tbody')?.addEventListener('click', async (ev) => {
    const editBtn = ev.target.closest('.btn-edit');
    if (editBtn) {
      const entity = items.find((i) => i.id === editBtn.dataset.id);
      if (entity) openModal(root, entity, async (u) => { await repo.put(KIND, u.id, u); await reload(); });
    }
    const delBtn = ev.target.closest('.btn-delete');
    if (delBtn) {
      const ok = await showConfirm({
        title: t('masters.ocean_tariff.delete_confirm'), confirmLabel: t('common.action.delete'), cancelLabel: t('common.action.cancel'), destructive: true,
      });
      if (!ok) return;
      items = items.filter((i) => i.id !== delBtn.dataset.id);
      root.querySelector(`tr[data-id="${delBtn.dataset.id}"]`)?.remove();
      await repo.delete(KIND, delBtn.dataset.id);
    }
  });
}
