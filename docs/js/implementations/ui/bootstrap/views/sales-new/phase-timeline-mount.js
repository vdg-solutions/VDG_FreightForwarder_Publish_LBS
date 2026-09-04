// The phase strip above the sales form: where it mounts, what a not-yet-saved job is called
// there, and what a click on a phase does. Split out of sales-new.js at the 350-line cap — the
// timeline is a widget the form hosts, not part of collecting or submitting the form.

import { loadTimeline, renderTimeline, bindTimeline } from '../../components/phase-timeline.js';

export const TIMELINE_MOUNT_ID = 'phase-timeline';

// A NEW job has no shipment_ref yet, but the timeline still needs a non-empty entity id to render
// the Created checklist (F-37-04). It used to borrow the Job No for this — a 10-digit legal doc
// number sitting in a ref-typed slot. The sentinel says what it is; it never persists (submitForm
// mints the real EX|IM ref) and the FSM registry simply has no entry for it, which falls back to
// the record's own state exactly like any not-yet-registered job.
export const DRAFT_TIMELINE_REF = 'draft:new';

/**
 * Draw the phases above the form, and let a click move the FORM'S FOCUS.
 *
 * Focus is not state. Clicking a phase the job has already passed opens it for correction — which
 * is the back-and-forth between CS and Sales the owner asked for — and never moves the shipment
 * backwards. `state` only changes through apply_fsm_event, which is guarded and audited.
 *
 * A shipment the FSM does not recognise gets no timeline rather than an empty one: "this job has
 * no phases" is a different claim from "we could not work out where it is".
 */
export function mountPhaseTimeline(root, record) {
  const timeline = loadTimeline(record);
  if (!timeline) return;

  const host = root.querySelector(`#${TIMELINE_MOUNT_ID}`);
  if (!host) return;

  const paint = (focus) => {
    host.innerHTML = renderTimeline(timeline, { focus });
    bindTimeline(host, paint);
  };
  paint(timeline.current);
}
