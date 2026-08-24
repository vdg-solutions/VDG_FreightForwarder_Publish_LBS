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

import { t } from '../../../../kernel/core_abstractions/i18n/index.js';
import { PHASE_FOCUS_EVENT, REQ_FOCUS_EVENT } from '../../components/phase-timeline.js';

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

// Which screens a section-A cell appears on, by input name. A field may sit on SEVERAL screens —
// the customer's Excel repeats the header columns across its sheets, and the bill sheet (3) is an
// ENTRY sheet, not a summary: everything printed on the B/L is typed or corrected right there.
// One record underneath, so a value edited on any screen is the same value everywhere.
// A name not listed here defaults to the booking screen — a field someone forgets to place shows
// up on screen 1 where it is seen, instead of vanishing.
const FIELD_SCREEN = {
  // Routing & Booking (Tab 1, Tab 2, Tab 3)
  mode: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  product: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  direction: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  direction_display: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  job_no: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  customer: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  sales_rep: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  quote_pick: [SCREEN_BOOKING, SCREEN_PNL],
  carrier: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  booking_no: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  vessel: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  flight_no: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  pol: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  pod: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  origin_iata: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  dest_iata: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  place_of_receipt: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  place_of_delivery: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  etd: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  eta: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  closing_si: [SCREEN_BOOKING],
  closing_cy: [SCREEN_BOOKING],
  empty_pickup_depot: [SCREEN_BOOKING],
  full_return_depot: [SCREEN_BOOKING],
  volume: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  container_qty: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  reefer_temp: [SCREEN_BOOKING, SCREEN_DOCS],
  reefer_vent: [SCREEN_BOOKING, SCREEN_DOCS],
  has_hbl: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  hbl_do_display: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],

  // Documentation (Tab 2, Tab 3)
  shipper: [SCREEN_DOCS, SCREEN_BILL],
  consignee: [SCREEN_DOCS, SCREEN_BILL],
  notify_party: [SCREEN_DOCS, SCREEN_BILL],
  for_delivery: [SCREEN_DOCS, SCREEN_BILL],
  contact_person: [SCREEN_BOOKING, SCREEN_DOCS],
  mbl: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  seal_no: [SCREEN_DOCS, SCREEN_BILL],
  freight_terms: [SCREEN_DOCS, SCREEN_BILL],
  doc_type: [SCREEN_DOCS, SCREEN_BILL],

  // Cargo & Commodity (Tab 2, Tab 3)
  commodity: [SCREEN_DOCS, SCREEN_BILL],
  pieces: [SCREEN_DOCS, SCREEN_BILL],
  weight_actual_kg: [SCREEN_DOCS, SCREEN_BILL],
  volume_cbm: [SCREEN_DOCS, SCREEN_BILL],
  dim_l_cm: [SCREEN_DOCS],
  dim_w_cm: [SCREEN_DOCS],
  dim_h_cm: [SCREEN_DOCS],
  uld_type: [SCREEN_DOCS],
  chargeable_kg: [SCREEN_DOCS, SCREEN_BILL],

  // Milestones & Evidence (Tab 3)
  atd: [SCREEN_BILL],
  ata: [SCREEN_BILL],
  customs_cleared_at: [SCREEN_BILL],
  haulage_signed_at: [SCREEN_BILL],
  do_released_at: [SCREEN_BILL],
  cargo_released_at: [SCREEN_BILL],

  // Financial & PNL (Tab 4)
  billing_paid_at: [SCREEN_PNL],
  roe_buying: [SCREEN_PNL],
  roe_selling: [SCREEN_PNL],
  currency: [SCREEN_PNL],
};
const DEFAULT_SCREENS = [SCREEN_BOOKING];

// F-40-03: requirement code → the screen where its data is typed. Clicking a checklist row on the
// timeline opens that page. Codes come from shipment_fsm/checks.rs — the same vocabulary the
// timeline renders, so a new check without a door here simply does not navigate.
export const REQ_SCREEN = {
  carrier_booking: SCREEN_BOOKING, quotation: SCREEN_PNL,
  dg_compliance: SCREEN_BOOKING, containers: SCREEN_BOOKING,
  voyage_departed: SCREEN_BILL, vessel_arrived: SCREEN_BILL,
  customs: SCREEN_BILL, haulage: SCREEN_BILL, delivery_order: SCREEN_BILL, cargo_release: SCREEN_BILL,
  billing_paid: SCREEN_PNL, demdet_settled: SCREEN_PNL, claim_closed: SCREEN_PNL,
};

const TAB_BASE     = 'px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 transition-colors';
const TAB_ACTIVE   = 'bg-blue-600 text-white border-blue-600';
const TAB_INACTIVE = 'bg-white text-slate-600 hover:bg-slate-50';

export function screenOfState(state) {
  return SCREEN_OF_STATE[state] ?? SCREEN_BOOKING;
}

export function screensOfField(name) {
  return FIELD_SCREEN[name] ?? DEFAULT_SCREENS;
}

function tabsHtml(active) {
  const btns = SCREENS.map((s) => `
    <button type="button" data-screen-tab="${s.id}"
      class="${TAB_BASE} ${s.id === active ? TAB_ACTIVE : TAB_INACTIVE}">
      ${s.id}. ${t(`sales_new.screen.${s.key}`)}
    </button>`).join('');
  return `<div id="phase-screen-tabs" class="flex flex-wrap gap-2">${btns}</div>`;
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
    if (cell.hasAttribute('data-cargo-items-card')) {
      screenShow(cell, screen === SCREEN_DOCS);
      continue;
    }
    if (cell.hasAttribute('data-containers-card')) {
      screenShow(cell, screen === SCREEN_DOCS || screen === SCREEN_BILL);
      continue;
    }
    const input = cell.querySelector('[name]');
    if (!input) continue;
    screenShow(cell, screensOfField(input.getAttribute('name')).includes(screen));
  }
  for (const [sel, home] of [['#sec-b-body', SCREEN_PNL], ['#sec-c-body', SCREEN_PNL], ['#sec-d-body', SCREEN_PNL]]) {
    screenShow(root.querySelector(sel), screen === home);
  }
  for (const btn of root.querySelectorAll('[data-screen-tab]')) {
    const active = Number(btn.dataset.screenTab) === screen;
    btn.className = `${TAB_BASE} ${active ? TAB_ACTIVE : TAB_INACTIVE}`;
  }
}

/**
 * Mounts the tab bar and applies the opening screen for `state`.
 * Listens for phase-timeline focus events for as long as the form is in the document.
 */
export function initPhaseScreens(root, { state = 'Created' } = {}) {
  const secA = root.querySelector('#sec-a-body');
  if (!secA) return;
  secA.insertAdjacentHTML('beforebegin', tabsHtml(screenOfState(state)));

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

  // F-40-03: a checklist row names its requirement; opening its screen is the row's click action.
  const onReq = (e) => {
    if (!root.isConnected) { window.removeEventListener(REQ_FOCUS_EVENT, onReq); return; }
    const screen = REQ_SCREEN[e.detail?.code];
    if (screen) go(screen);
  };
  window.addEventListener(REQ_FOCUS_EVENT, onReq);

  go(screenOfState(state));
}

/** After a failed validation: bring the screen holding the first flagged field into view. */
export function jumpToFirstError(root) {
  const bad = root.querySelector('.field-error');
  if (!bad) return;
  if (!bad.closest('#sec-a-body')) { applyScreen(root, SCREEN_PNL); return; }
  const name = bad.getAttribute('name') || bad.querySelector('[name]')?.getAttribute('name');
  if (name) applyScreen(root, screensOfField(name)[0]);
}
