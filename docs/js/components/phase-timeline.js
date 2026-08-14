// phase-timeline.js — E-37 (F-37-04). The horizontal phases of a shipment, and what the one it is
// sitting in is still waiting on.
//
// The phase list, the order, the requirements and who owns each of them all come from Rust
// (`shipment_phases` -> operators/fsm/shipment_fsm/checks.rs), which is the SAME table the
// transition guards fold over. A JS copy would be a second statement of the transition rules, and
// its failure mode is a screen saying a job is ready while the FSM refuses to advance it.
//
// This component renders EDIT FOCUS, not state. Clicking a phase moves what the form is showing;
// it does not move the shipment. `state` only ever changes through apply_fsm_event, which is
// guarded and audited — see backlog/wiki/shipment-collaboration-model.md §3.

import { t } from '../i18n/index.js';
// The role labels already exist and are pinned to the Rust enum by role-catalog-parity; a second
// `role.*` key family here would be a second place to forget a role.
import { ROLE_LABEL_KEYS } from '../operators/manager/users-view-composer.js';

export const PHASE_FOCUS_EVENT = 'vdg:phase-focus';
// E-40 (F-40-03): a requirement row is a DOOR, not a caption — clicking it announces the
// requirement's code and the phase screens open the page where that data is typed.
export const REQ_FOCUS_EVENT = 'vdg:req-focus';

// Positions as Rust spells them, and the ARIA values they map to. Hoisted out of the template
// because a quoted word inside a ${} reads to the i18n gate as a label somebody forgot to
// translate — and it is right to ask, so the answer is to stop writing them there.
const POSITION_CURRENT  = 'current';
const POSITION_DONE     = 'done';
const ARIA_CURRENT_STEP = 'step';
const ARIA_CURRENT_NONE = 'false';
const STATUS_MET        = 'met';
const STATUS_UNKNOWN    = 'unknown';

// Owner 2026-08-14: the mark carries the verdict, the words stay black — a whole row of red
// reads as an error, when it is only "not done yet". ✗ red / ✓ green is the entire vocabulary.
const STATUS_ICON = { met: '✓', missing: '✗', unknown: '·' };
const ICON_CLASS = {
  met:     'text-emerald-600',
  missing: 'text-rose-600 font-semibold',
  unknown: 'text-slate-400',
};
// The node on the rail: passed is filled, the one the job sits in is ringed, ahead is an outline.
const NODE_CLASS = {
  done:    'bg-emerald-500 border-emerald-500 text-white',
  current: 'bg-white       border-blue-500    text-blue-600 ring-4 ring-blue-100',
  ahead:   'bg-white       border-slate-300   text-slate-400',
};
const LABEL_CLASS = {
  done:    'text-slate-600',
  current: 'text-blue-700 font-semibold',
  ahead:   'text-slate-400',
};
const RAIL_DONE  = 'bg-emerald-400';
const RAIL_TODO  = 'bg-slate-200';
const DONE_ICON  = '✓';
const FOCUS_NODE = ' shadow-md';
const FOCUS_TEXT = ' underline underline-offset-4';

const g = () => globalThis.window || globalThis;

/**
 * The timeline for one shipment, or null when it cannot be built.
 *
 * Null is returned for a shipment the FSM does not recognise — NOT an empty timeline, which would
 * read as "this job has no phases". The caller decides whether that is worth a message.
 */
export function loadTimeline(shipment) {
  const wasm = g().__vdg_wasm;
  const ref  = shipment?.shipment_ref;
  if (!ref || typeof wasm?.shipment_phases !== 'function') return null;
  try {
    return JSON.parse(wasm.shipment_phases(ref, JSON.stringify(shipment)));
  } catch (err) {
    console.warn('[phase-timeline]', ref, err?.message || err); // DEV
    return null;
  }
}

/** One requirement as a line of text: what it is, who owes it, and — when the guard refused —
 *  the guard's OWN reason rather than a friendlier second account of it. The status mark is the
 *  row's job, not this line's, so the same sentence can be read out or drawn. */
export function requirementLine(req) {
  const what = t(`phase.req.${req.code}`);
  const who  = t(ROLE_LABEL_KEYS[req.owner] || req.owner);
  const head = `${what} (${who})`;
  return req.status === STATUS_UNKNOWN ? `${head} — ${t('phase.req.unverified')}` : head;
}

/**
 * The rail: one node per phase, joined left to right, with the outstanding work of the phase in
 * FOCUS underneath it.
 *
 * The requirements sit in one panel rather than inside every node because Rust only ever fills
 * them for the phase the job is in — printing them in the block made that one block three times
 * the height of the others, which is what the row looked wrong for.
 */
export function renderTimeline(timeline, { focus = null } = {}) {
  if (!timeline) return '';
  const total  = timeline.phases.length;
  const steps  = timeline.phases.map((phase, i) => phaseStep(phase, i, total, focus)).join('');
  const banner = timeline.off_path
    ? `<div class="text-xs text-slate-500 mb-2">${esc(t('phase.off_path', { state: stateLabel(timeline.current) }))}</div>`
    : '';
  const shown = timeline.phases.find((p) => p.state === focus)
    || timeline.phases.find((p) => p.position === POSITION_CURRENT);
  // The rows are the guard conditions of the NEXT transition, so the panel says which state they
  // unlock — without the destination, a list of red marks reads as a pile of errors.
  const next = shown ? timeline.phases[timeline.phases.indexOf(shown) + 1]?.state ?? null : null;
  return `
    ${banner}
    <ol class="flex items-start w-full" aria-label="${esc(t('phase.timeline'))}">
      ${steps}
    </ol>
    ${detailPanel(shown, next)}`;
}

function phaseStep(phase, index, total, focus) {
  const done    = phase.position === POSITION_DONE;
  const here    = phase.position === POSITION_CURRENT;
  const focused = focus === phase.state;
  const node    = NODE_CLASS[phase.position]  ?? NODE_CLASS.ahead;
  const label   = LABEL_CLASS[phase.position] ?? LABEL_CLASS.ahead;
  const aria    = here ? ARIA_CURRENT_STEP : ARIA_CURRENT_NONE;
  const nodeExtra = focused ? FOCUS_NODE : '';
  const textExtra = focused ? FOCUS_TEXT : '';

  // The rail is drawn in halves so the run stops at the first and last node instead of hanging off
  // the ends. A half is green once the job has passed the node it leaves.
  const before = index === 0 ? ''
    : `<span class="absolute top-4 left-0 right-1/2 h-0.5 ${done || here ? RAIL_DONE : RAIL_TODO}"></span>`;
  const after = index === total - 1 ? ''
    : `<span class="absolute top-4 left-1/2 right-0 h-0.5 ${done ? RAIL_DONE : RAIL_TODO}"></span>`;

  // The count is of what is NOT met — a phase whose rows are all ticked says nothing extra.
  const gaps  = phase.requirements.filter((r) => r.status !== STATUS_MET).length;
  const badge = gaps
    ? `<span class="absolute -top-1 -right-1 z-20 min-w-[1rem] px-1 rounded-full bg-amber-500
                    text-white text-[10px] leading-4 text-center">${gaps}</span>`
    : '';

  return `
    <li class="relative flex-1 min-w-0">
      ${before}${after}
      <button type="button" data-phase="${esc(phase.state)}" aria-current="${aria}"
              class="relative w-full flex flex-col items-center gap-1.5 px-1 py-0.5 rounded-md
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
        <span class="relative z-10">
          <span class="grid place-items-center w-8 h-8 rounded-full border-2 text-xs font-semibold
                       ${node}${nodeExtra}">${done ? DONE_ICON : index + 1}</span>
          ${badge}
        </span>
        <span class="text-[11px] leading-tight text-center ${label}${textExtra}">${esc(stateLabel(phase.state))}</span>
      </button>
    </li>`;
}

/** What the phase in focus is still waiting on. A phase with nothing outstanding says so — an
 *  empty panel would read as "we did not check". */
function detailPanel(phase, next) {
  if (!phase) return '';
  const rows = phase.requirements.map(reqRow).join('');
  const body = rows
    ? `<ul class="mt-1.5 space-y-1">${rows}</ul>`
    : `<div class="mt-1 text-[11px] text-slate-500">${esc(t('phase.no_pending'))}</div>`;
  // A phase with a successor titles its list as that transition's conditions; the last phase has
  // nowhere to go, so its own name is the honest header.
  const heading = next && rows
    ? t('phase.advance_conditions', { state: stateLabel(next) })
    : stateLabel(phase.state);
  return `
    <div class="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div class="text-xs font-semibold text-slate-700">${esc(heading)}</div>
      ${body}
    </div>`;
}

function reqRow(req) {
  const mark = ICON_CLASS[req.status] ?? ICON_CLASS.unknown;
  const icon = STATUS_ICON[req.status] ?? STATUS_ICON.unknown;
  return `<li>
      <button type="button" data-req="${esc(req.code)}" title="${esc(req.detail || '')}"
        class="flex items-start gap-1.5 text-[11px] text-left w-full rounded px-1 py-0.5
               text-slate-700 hover:bg-slate-100 hover:underline">
        <span class="shrink-0 w-3 text-center font-semibold ${mark}">${esc(icon)}</span>
        <span>${esc(requirementLine(req))}</span>
      </button>
    </li>`;
}

function stateLabel(state) {
  return t(`shipment.status.${state}`);
}

/** Wires the blocks to emit focus changes. Focus is a VIEW concern: it moves what the form shows
 *  and never the shipment's state, so a user can go back to a phase they have already passed and
 *  correct it — which is the whole point of the back-and-forth the owner asked for. */
export function bindTimeline(root, onFocus) {
  for (const el of root.querySelectorAll('[data-phase]')) {
    el.addEventListener('click', () => {
      const phase = el.getAttribute('data-phase');
      onFocus?.(phase);
      g().dispatchEvent?.(new CustomEvent(PHASE_FOCUS_EVENT, { detail: { phase } }));
    });
  }
  for (const el of root.querySelectorAll('[data-req]')) {
    el.addEventListener('click', () => {
      g().dispatchEvent?.(new CustomEvent(REQ_FOCUS_EVENT, { detail: { code: el.getAttribute('data-req') } }));
    });
  }
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
