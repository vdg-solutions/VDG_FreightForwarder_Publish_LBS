// phase-screens.js — E-39: the customer's 4 entry windows over the ONE shipment record.
//
// Their Excel has four sheets (booking → chứng từ → chi tiết bill → PNL) and copies the header
// block into every one, because Excel has no "one record". We keep the single form — one DOM, one
// collectFormState, one submit — and make the four windows a VISIBILITY partition over it: every
// field cell belongs to exactly one screen, and only the active screen's cells show.
//
// Screen follows phase: opening the form lands on the screen of the phase the job is IN, a click
// on a phase-timeline node re-focuses the matching screen. Focus is a view concern (same law as
// phase-timeline.js): switching screens never moves the shipment, and every screen stays reachable
// so a passed phase can be corrected.
//
// Two independent visibility writers share the grid cells, on two channels that must not meet:
// mode gating (SEA/AIR, section-header.js) toggles the `hidden` CLASS; screens set inline
// style.display. A cell shows only when both channels allow it.

import { t } from '../../i18n/index.js';
import { PHASE_FOCUS_EVENT } from '../../components/phase-timeline.js';
import { DOCS_EXT_FIELDS } from './section-docs-ext.js';

export const SCREEN_BOOKING = 1;
export const SCREEN_DOCS    = 2;
export const SCREEN_BILL    = 3;
export const SCREEN_PNL     = 4;

export const SCREENS = [
  { id: SCREEN_BOOKING, key: 'booking' },
  { id: SCREEN_DOCS,    key: 'docs' },
  { id: SCREEN_BILL,    key: 'bill' },
  { id: SCREEN_PNL,     key: 'pnl' },
];

// Six phases, four windows: the two carrier-side phases share the bill screen, and the money
// phases share PNL. Cancelled falls back to booking — the job's paperwork starts there.
export const SCREEN_OF_STATE = {
  Created:          SCREEN_BOOKING,
  BookingConfirmed: SCREEN_DOCS,
  InTransit:        SCREEN_BILL,
  Arrived:          SCREEN_BILL,
  Delivered:        SCREEN_PNL,
  Closed:           SCREEN_PNL,
  Cancelled:        SCREEN_BOOKING,
};

// Which screen a section-A cell belongs to, by input name. A name not listed here defaults to the
// booking screen — a field someone forgets to place shows up on screen 1 where it is seen,
// instead of vanishing. DOCS_EXT_FIELDS not repeated below therefore also land on booking.
const FIELD_SCREEN = {
  mbl: SCREEN_DOCS, shipper: SCREEN_DOCS, consignee: SCREEN_DOCS,
  notify_party: SCREEN_DOCS, for_delivery: SCREEN_DOCS, seal_no: SCREEN_DOCS,
  freight_terms: SCREEN_DOCS, doc_type: SCREEN_DOCS,
  pieces: SCREEN_DOCS, weight_actual_kg: SCREEN_DOCS, volume_cbm: SCREEN_DOCS,
  dim_l_cm: SCREEN_DOCS, dim_w_cm: SCREEN_DOCS, dim_h_cm: SCREEN_DOCS,
  uld_type: SCREEN_DOCS, chargeable_kg: SCREEN_DOCS,
  atd: SCREEN_BILL,
  roe_buying: SCREEN_PNL, roe_selling: SCREEN_PNL, currency: SCREEN_PNL,
};

const RECAP_FIELDS = [
  'job_no', 'customer', 'vessel', 'pol', 'pod', 'etd', 'eta',
  'shipper', 'consignee', 'seal_no', 'freight_terms', 'doc_type',
];
const RECAP_LABEL_KEYS = {
  job_no: 'sales_new.field.job_no', customer: 'sales_new.field.customer',
  vessel: 'sales_new.field.vessel', pol: 'sales_new.field.pol', pod: 'sales_new.field.pod',
  etd: 'sales_new.field.etd', eta: 'sales_new.field.eta',
  shipper: 'sales_new.field.shipper', consignee: 'sales_new.field.consignee',
  seal_no: 'sales_new.field.seal_no', freight_terms: 'sales_new.field.freight_terms',
  doc_type: 'sales_new.field.bill_type',
};

const TAB_BASE     = 'px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 transition-colors';
const TAB_ACTIVE   = 'bg-blue-600 text-white border-blue-600';
const TAB_INACTIVE = 'bg-white text-slate-600 hover:bg-slate-50';

export function screenOfState(state) {
  return SCREEN_OF_STATE[state] ?? SCREEN_BOOKING;
}

export function screenOfField(name) {
  return FIELD_SCREEN[name] ?? SCREEN_BOOKING;
}

function tabsHtml(active) {
  const btns = SCREENS.map((s) => `
    <button type="button" data-screen-tab="${s.id}"
      class="${TAB_BASE} ${s.id === active ? TAB_ACTIVE : TAB_INACTIVE}">
      ${s.id}. ${t(`sales_new.screen.${s.key}`)}
    </button>`).join('');
  return `<div id="phase-screen-tabs" class="flex flex-wrap gap-2">${btns}</div>`;
}

/** The bill screen's read-only recap: what the bill will say, pulled live from the form. */
function recapHtml(root) {
  const rows = RECAP_FIELDS.map((name) => {
    const el = root.querySelector(`[name=${name}]`);
    return `<div><dt class="text-slate-400">${t(RECAP_LABEL_KEYS[name])}</dt>
      <dd class="font-medium text-slate-800 font-mono">${esc(el?.value || '—')}</dd></div>`;
  }).join('');
  return `
    <div class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
      ${t('sales_new.screen.bill_recap')}
    </div>
    <dl class="grid grid-cols-3 gap-x-4 gap-y-2 text-xs">${rows}</dl>`;
}

// screens' own channel — never touches the `hidden` class the mode toggle owns
function screenShow(el, show) {
  if (el) el.style.display = show ? '' : 'none';
}

// Show exactly one screen. Hidden inputs stay in the DOM, so collect/submit see the whole record.
export function applyScreen(root, screen) {
  const grid = root.querySelector('#sec-a-body .grid');
  if (!grid) return;
  for (const cell of grid.children) {
    const input = cell.querySelector('[name]');
    if (!input) continue;
    screenShow(cell, screenOfField(input.getAttribute('name')) === screen);
  }
  for (const [sel, home] of [['#sec-b-body', SCREEN_PNL], ['#sec-c-body', SCREEN_PNL], ['#sec-d-body', SCREEN_PNL]]) {
    screenShow(root.querySelector(sel), screen === home);
  }
  const recap = root.querySelector('#phase-screen-recap');
  if (recap) {
    screenShow(recap, screen === SCREEN_BILL);
    if (screen === SCREEN_BILL) recap.innerHTML = recapHtml(root);
  }
  for (const btn of root.querySelectorAll('[data-screen-tab]')) {
    const active = Number(btn.dataset.screenTab) === screen;
    btn.className = `${TAB_BASE} ${active ? TAB_ACTIVE : TAB_INACTIVE}`;
  }
}

/**
 * Mounts the tab bar + recap panel and applies the opening screen for `state`.
 * Listens for phase-timeline focus events for as long as the form is in the document.
 */
export function initPhaseScreens(root, { state = 'Created' } = {}) {
  const secA = root.querySelector('#sec-a-body');
  if (!secA) return;
  secA.insertAdjacentHTML('beforebegin', tabsHtml(screenOfState(state)));
  secA.insertAdjacentHTML('afterend',
    `<div id="phase-screen-recap" class="rounded-xl border border-slate-200 bg-white p-4" style="display:none"></div>`);

  const go = (screen) => applyScreen(root, screen);
  root.querySelector('#phase-screen-tabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-screen-tab]');
    if (btn) go(Number(btn.dataset.screenTab));
  });

  const onFocus = (e) => {
    if (!root.isConnected) { window.removeEventListener(PHASE_FOCUS_EVENT, onFocus); return; }
    const phase = e.detail?.phase;
    if (phase) go(screenOfState(phase));
  };
  window.addEventListener(PHASE_FOCUS_EVENT, onFocus);

  go(screenOfState(state));
}

/** After a failed validation: bring the screen holding the first flagged field into view. */
export function jumpToFirstError(root) {
  const bad = root.querySelector('.field-error');
  if (!bad) return;
  if (!bad.closest('#sec-a-body')) { applyScreen(root, SCREEN_PNL); return; }
  const name = bad.getAttribute('name') || bad.querySelector('[name]')?.getAttribute('name');
  if (name) applyScreen(root, screenOfField(name));
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
