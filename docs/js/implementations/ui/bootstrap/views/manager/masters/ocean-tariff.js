// Ocean Tariff master — E-20 F-28-15 (capstone slice (e))
// Route: /masters/ocean-tariff
// Priced kind joined against ocean-carriers by carrier_scac; effective rate resolved via
// the real wasm resolver through PricedRefRepo.resolveOnDate — no JS date/rate selection.
// Mirrors ocean-carriers.js's read-focused grid shape (no propose/merge panel here — that
// contract is already exercised generically by priced-ref-repo.test.mjs).

import { hasRole } from '../../../../../ui/core_abstractions/ports/auth/session-roles.js';
import { ROLE_MANAGER } from '../../../../../ui/core_abstractions/roles.js';
import { t }         from '../../../../../kernel/core_abstractions/i18n/index.js';
import { boundedList, boundedSeedIfEmpty, renderMasterLoadRetryStatus } from '../../../../../kernel/core_abstractions/util/master-load.js';

const KIND             = 'ocean-tariff';
const CARRIER_KIND     = 'ocean-carriers';
const KIND_PREFIX      = 'OTF';
const SEED_URL         = 'seed/masters/ocean-tariff.jsonl';
const ISO_DATE_LENGTH  = 10; // 'YYYY-MM-DD' slice of Date#toISOString()

// verify-domain-arithmetic: a resolved amount whose order of magnitude doesn't fit its
// quoted currency is a scale bug, never a legit rate — bounds are ocean-freight per-TEU/FEU
// container figures, not a generic currency-conversion table.
const MIN_PLAUSIBLE_VND_RATE = 1_000_000; // below this a "VND" amount is almost certainly an unconverted foreign figure
const MAX_PLAUSIBLE_USD_RATE = 50_000;    // a per-TEU/FEU USD ocean rate never reaches five figures without a scale bug

function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function genId(row) { return `${KIND_PREFIX}-${row.pricing_key || row.carrier_scac || Date.now()}`; }

function todayIso() { return new Date().toISOString().slice(0, ISO_DATE_LENGTH); }

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

function rowHtml(row, carrierName, record) {
  const plausible = isRateMagnitudePlausible(record);
  const rateCls   = plausible ? 'text-slate-900 font-medium' : 'text-red-600 font-semibold';
  const warnBadge = plausible ? '' : '<span class="ml-1 px-1 py-0.5 rounded text-[9px] bg-red-100 text-red-700">!</span>';
  const validFrom = record.body?.valid_from ?? row.valid_from;
  const validTo   = record.body?.valid_to   ?? row.valid_to;
  return `
    <tr class="border-t border-slate-100 hover:bg-slate-50 text-xs" data-id="${escHtml(row.id)}">
      <td class="px-3 py-2">${escHtml(carrierName)}</td>
      <td class="px-3 py-2">${escHtml(row.lane_origin)} → ${escHtml(row.lane_dest)}</td>
      <td class="px-3 py-2 text-right ${rateCls}">${escHtml(record.body?.rate_amount)}${warnBadge}</td>
      <td class="px-3 py-2">${escHtml(currencyCode(record.currency))}</td>
      <td class="px-3 py-2 text-[10px] text-slate-400">${escHtml(validFrom)} – ${escHtml(validTo)}</td>
    </tr>`;
}

export async function render(root) {
  const isM        = hasRole(ROLE_MANAGER);
  const repo       = window.__vdg_repo;
  const pricedRepo = window.__vdg_priced_repos?.[KIND];

  root.innerHTML = `
    <div class="p-6 max-w-[1100px] mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div class="text-lg font-semibold text-slate-900">${t('masters.ocean_tariff.title')}</div>
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
            </tr>
          </thead>
          <tbody id="m-tbody"></tbody>
        </table>
        <div id="m-empty" class="hidden text-center text-xs text-slate-400 py-8">${t('masters.ocean_tariff.empty')}</div>
      </div>
      <div id="m-status" class="text-xs text-slate-400 mt-2">${t('common.load.loading')}</div>
    </div>`;

  // F-20-01: bounded — a stalled Drive read on a fresh workspace resolves to an
  // actionable retry instead of hanging at the loading placeholder.
  async function reload() {
    const tbody    = root.querySelector('#m-tbody');
    const emptyEl  = root.querySelector('#m-empty');
    const statusEl = root.querySelector('#m-status');
    if (!repo) { if (tbody) tbody.innerHTML = ''; if (statusEl) statusEl.textContent = ''; return; }

    const [tariffRes, carrierRes] = await Promise.all([
      boundedList(repo, KIND, 'ocean-tariff:list'),
      boundedList(repo, CARRIER_KIND, 'ocean-tariff:carriers'),
    ]);
    if (!tariffRes.ok) {
      if (tbody) tbody.innerHTML = '';
      emptyEl?.classList.add('hidden');
      renderMasterLoadRetryStatus(statusEl, t('masters.load_error'), t('retry'), reload);
      return;
    }

    let items = tariffRes.value;
    if (isM) items = await boundedSeedIfEmpty(repo, KIND, SEED_URL, items, genId, 'ocean-tariff:seed');
    const carriers   = carrierRes.ok ? carrierRes.value : [];
    const carrierMap = buildCarrierNameMap(carriers);

    const dateStr = todayIso();
    const rows = await Promise.all(items.map(async (row) => {
      const record = await resolveEffectiveRecord(pricedRepo, row, dateStr);
      return rowHtml(row, resolveCarrierName(row, carrierMap), record);
    }));
    if (tbody) tbody.innerHTML = rows.join('');
    if (emptyEl) emptyEl.classList.toggle('hidden', items.length > 0);
    if (statusEl) statusEl.textContent = '';
  }

  await reload();
}
