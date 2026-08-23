// sales-new.js — route entry; thin wrapper over 4-section shipment form (F-15-27)

import { t } from '../../../kernel/core_abstractions/i18n/index.js';
import { navigate } from '../router.js';
import { currentSalesRepId, currentRoles } from '../../../ui/core_abstractions/ports/auth/session-roles.js';
import { selfRepCandidate, customerRepFor } from '../../core_abstractions/ports/flows/sales-rep-derivation.js';
import { getActiveSalesReps } from '../../core_abstractions/ports/flows/sales-registry.js';
import { loadDraft, clearDraft } from './sales-new/draft-manager.js';
import { renderForm, collectFormState, validateShipmentForm, shipmentToDraft, jumpToFirstError } from './sales-new-form.js';
import { submitForm, updateForm, highlightErrors } from './sales-new/submit-orchestrator.js';
import { createSubmitGuard } from './sales-new/submit-guard.js';
import { findFxDeviations, confirmFxDeviations } from './sales-new-form/pnl-fx-deviation-gate.js';
import { safeMasterLoad } from '../../../kernel/core_abstractions/util/master-load.js';
import { ensureRepCode } from '../../core_abstractions/ports/flows/rep-code-registry.js';
import { assignJobNo } from '../../core_abstractions/ports/flows/job-no-gen.js';
import { getShipment, REVENUE_SEEN } from '../../core_abstractions/ports/data/shipment-repo.js';
import { readSettings, DEFAULT_CURRENCY_FIELD } from '../../core_abstractions/ports/governance/workspace-settings.js';
import { loadTimeline, renderTimeline, bindTimeline } from '../components/phase-timeline.js';

const TIMELINE_MOUNT_ID = 'phase-timeline';

// wasm has no locale, so a use-case that needs the reader's words hands back {key, ...params} as
// JSON in `error` instead of a baked sentence (F-47-04) — same convention detail-panel.js uses
// for FSM guard replies. A plain-text error (or anything that isn't that envelope) falls through.
function saveErrorText(err) {
  try {
    const envelope = JSON.parse(err.message);
    if (envelope && envelope.key) return t(envelope.key, envelope);
  } catch { /* not a JSON envelope — fall through to the raw message */ }
  return `Error: ${err.message}`;
}
// A NEW job has no shipment_ref yet, but the timeline still needs a non-empty entity id to render
// the Created checklist (F-37-04). It used to borrow the Job No for this — a 10-digit legal doc
// number sitting in a ref-typed slot. The sentinel says what it is; it never persists (submitForm
// mints the real EX|IM ref) and the FSM registry simply has no entry for it, which falls back to
// the record's own state exactly like any not-yet-registered job.
const DRAFT_TIMELINE_REF = 'draft:new';

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
function mountPhaseTimeline(root, record) {
  const timeline = loadTimeline(record);
  if (!timeline) return;

  const host = document.createElement('div');
  host.id = TIMELINE_MOUNT_ID;
  host.className = 'mx-6 mt-4';

  const formMount = root.querySelector('#form-mount');
  if (formMount) root.insertBefore(host, formMount);
  else root.prepend(host);

  // Re-render replaces the buttons, so the handler has to re-bind itself — otherwise the second
  // click on a phase does nothing and reads as a dead control.
  const paint = (focus) => {
    host.innerHTML = renderTimeline(timeline, { focus });
    bindTimeline(host, paint);
  };
  paint(timeline.current);
}

// F-19-29: personalization reads (userConfig + commission override) are optional — bound them
// under RENDER_MOUNT_TIMEOUT_MS (8s) so a slow Drive fallback still leaves headroom for the
// synchronous form render that follows, instead of racing mountView's own ceiling.
const PERSONALIZATION_LOAD_TIMEOUT_MS = 5000;

function showToast(msg, type = 'info') {
  window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { message: msg, type } }));
}

// F-29-01 AC-04: fx-rate pre-fill, mirrors app.js's manager-only fx-auto-fetch wiring but
// available to any sales rep — the form's per-line fx lookup isn't a manager-only feature.
async function _fxRepo() {
  try {
    const { fxRateRepo } = await import('../../core_abstractions/ports/storage/fx-rate-repo.js');
    return fxRateRepo;
  } catch { return null; /* fx pre-fill is optional — form still works without it */ }
}

// F-15-63: dispatch vdg:shipment-committed so WMA listener can learn from this commit
function _dispatchCommitted(formMount, repId) {
  if (!repId) return;
  const lineEls = Array.from(formMount.querySelectorAll('#lines-tbody tr[data-line]'));
  const lines = lineEls.map((row, i) => ({
    row_idx:        i,
    observed_kind:  row.querySelector('[name=kind]')?.value || '',
    predicted_kind: row.dataset.wmaPredicted || null,
  }));
  window.dispatchEvent(new CustomEvent('vdg:shipment-committed', {
    detail: { rep_id: repId, lines, confirmed_ts: new Date().toISOString() },
  }));
}

// opts.editRef — existing shipment ref on /sales/edit/:ref
// opts.mode    — 'edit' | 'create' (default 'create')
export async function render(root, opts = {}) {
  const { editRef = null, mode = 'create', salesId = 'me', quotePrefill = null } = opts;
  const isEdit = mode === 'edit' && !!editRef;
  // F-41-01: the job's rep is DERIVED — explicit ?sales= (on-behalf / the quote-convert door)
  // wins, else the signed-in session but ONLY when it actually holds a sales role. The old
  // unconditional `currentSalesRepId()` default is the bug this feature exists to remove: a job
  // CS opened was attributed to the CS account, so its revenue fork, publish fork and Job No
  // namespace all pointed at the wrong person. '' here means the form must be given a rep —
  // the customer master autofills one, or the select asks.
  const routeRep   = (salesId && salesId !== 'me') ? salesId : null;
  const salesRepId = routeRep || selfRepCandidate(currentRoles(), currentSalesRepId() || '');
  const repo = window.__vdg_repo;

  let customers  = [];
  let userConfig = null;
  let draft      = null;
  let jobNo      = null;
  let defaultCurrency = null;
  let reps       = [];
  // F-37-06: whether the SELL SIDE came back. A new job is visible - the rep about to type the
  // figures is the one who owns them. On an edit it is whatever the read actually returned, so
  // CS opening a job gets no revenue section: not because of their role, but because the folder
  // was never granted and the record arrived without one.
  let revenueVisible = true;

  // F-19-29: customers list + personalization reads raced concurrently under one bound —
  // a slow/cold Drive fallback degrades to customers=[]/userConfig=null (both already
  // tolerated downstream in sales-new-form.js) instead of hanging render() past mountView's
  // outer RENDER_MOUNT_TIMEOUT_MS ceiling.
  // F-32-01: Job No assignment folded into the SAME bounded block (not a second sequential
  // await) so a stalled repo never doubles the wait — reuses rawUserConfig, no extra fetch.
  if (repo) {
    const loadRes = await safeMasterLoad(async () => {
      const [customerList, rawUserConfig, assignment, wsSettings, repList] = await Promise.all([
        repo.list('customers').catch(() => []),
        salesRepId ? repo.get('user', `user:${salesRepId}`).catch(() => null) : Promise.resolve(null),
        salesRepId ? repo.get('commission_rules', salesRepId).catch(() => null) : Promise.resolve(null),
        // Accounting's default header currency — a LOCAL store read (workspace_settings kind),
        // not a Drive fetch: the delta tick is what keeps it current, not this render.
        isEdit ? Promise.resolve(null) : readSettings(repo),
        // F-41-01: the rep select's options — a master-kind read, same 5-min registry cache.
        getActiveSalesReps(repo).catch(() => []),
      ]);
      // Resolve manager-assigned sales_pct → inject into userConfig
      let resolvedUserConfig = rawUserConfig;
      if (assignment?.sales_pct != null) {
        resolvedUserConfig = { ...(rawUserConfig || {}), sales_share_pct: Number(assignment.sales_pct) };
      }
      let generatedJobNo = null;
      if (!isEdit && salesRepId) {
        try {
          const user = rawUserConfig || { id: `user:${salesRepId}`, sales_code: null };
          const repCode = await ensureRepCode(user, repo);
          generatedJobNo = await assignJobNo(repo, repCode);
        } catch { /* best-effort at mount — submitForm generates its own fallback (AC-01) */ }
      }
      return { customerList, userConfig: resolvedUserConfig, jobNo: generatedJobNo, wsSettings, repList };
    }, 'sales-new:personalization', PERSONALIZATION_LOAD_TIMEOUT_MS);

    if (loadRes.ok) {
      customers  = loadRes.value.customerList;
      userConfig = loadRes.value.userConfig;
      jobNo      = loadRes.value.jobNo;
      defaultCurrency = loadRes.value.wsSettings?.[DEFAULT_CURRENCY_FIELD] ?? null;
      reps       = loadRes.value.repList;
    }
    // !loadRes.ok (timeout or thrown): customers=[], userConfig=null, jobNo=null — all
    // already-tolerated defaults downstream (sales-new-form.js — no contract change;
    // submitForm's own fallback still assigns a Job No at save time).
  }

  if (isEdit) {
    // AC-01: hydrate from persisted records
    try {
      if (repo) {
        const shipment = await getShipment(repo, editRef);
        if (shipment) revenueVisible = shipment[REVENUE_SEEN] !== false;
        const ce = await repo.get('commission_entry', `${editRef}-CR1`).catch(() => null);
        draft = shipmentToDraft(shipment, ce);
      }
    } catch { /* shipment not found — render blank */ }

    // AC-02: "Editing shipment <ref>" indicator
    root.innerHTML = `
      <div class="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200
                  text-amber-800 rounded-lg px-4 py-2 mx-6 mt-4 font-medium">
        <span>${t('sales_new.edit_banner')}</span>
        <span class="font-mono">${editRef}</span>
      </div>
      <div id="form-mount"></div>`;
  } else {
    if (quotePrefill) {
      draft = {
        quote_id: quotePrefill.quote_id,
        customer: quotePrefill.customer,
        pol:      quotePrefill.pol,
        pod:      quotePrefill.pod,
        volume:   quotePrefill.container,   // shipment-builder maps volume → container_spec
      };
    }
    if (!draft) draft = await loadDraft();

    if (draft) {
      root.innerHTML = `
        <div id="draft-banner"
          class="flex items-center justify-between text-xs bg-blue-50 border border-blue-200
                 text-blue-700 rounded-lg px-4 py-2 mx-6 mt-4">
          <span>${t('sales_new.draft_restored')}</span>
          <button type="button" id="clear-draft-btn"
            class="underline text-blue-600 hover:text-blue-800">
            ${t('sales_new.draft_clear')}
          </button>
        </div>
        <div id="form-mount"></div>`;
      root.querySelector('#clear-draft-btn')?.addEventListener('click', async () => {
        await clearDraft();
        await render(root);
      });
    } else {
      root.innerHTML = '<div id="form-mount"></div>';
    }
  }

  // F-37-04: the phases, above the form. In edit mode it reads the shipment; on a new job there is
  // nothing stored yet, so it reads the draft at Created — which is the point: it tells whoever
  // opened the job what the FIRST phase needs before they have typed anything.
  mountPhaseTimeline(root, {
    ...(draft || {}),
    shipment_ref: editRef || draft?.shipment_ref || DRAFT_TIMELINE_REF,
    state: draft?.state || 'Created',
  });

  // F-41-01: a prefilled customer (quote convert, restored draft) brings its master-assigned rep
  // along when nothing picked one yet — the same chain the select's autofill walks.
  // F-47-05: and only a rep the list actually offers, which is the check the two sibling autofills
  // (section-header-wiring.js, quote-attach.js) already made and this one did not. Not the source
  // of the live bad records (customer rows carry no sales_rep_id at all — measured 2026-08-22), so
  // this closes a door rather than a leak: whatever a customer row holds, only an offered rep
  // reaches the field.
  if (draft && !draft.sales_rep) {
    const fromCust = customerRepFor(draft.customer, customers);
    if (fromCust && reps.some((r) => r.prefix === fromCust)) draft.sales_rep = fromCust;
  }

  const formMount = root.querySelector('#form-mount') || root;
  const fxRepo    = await _fxRepo();
  await renderForm(formMount, { customers, salesRepId, userConfig, draft, mode, fxRepo, jobNo,
                                defaultCurrency, revenueVisible, reps, editRef });

  // F-41-01: the Job No preview follows the CHOSEN rep — a CS session has no namespace of its
  // own to preview from, so the number appears when the rep does. Preview only: submit resolves
  // the final number under the same rep, and edit mode never regenerates (guarded below).
  const repSelect = formMount.querySelector('select[name=sales_rep]');
  if (!isEdit && repo && repSelect) {
    repSelect.addEventListener('change', async () => {
      const prefix = repSelect.value;
      if (!prefix) return;
      try {
        const user = (await repo.get('user', `user:${prefix}`).catch(() => null))
          || { id: `user:${prefix}`, sales_code: null };
        const code  = await ensureRepCode(user, repo);
        const fresh = await assignJobNo(repo, code);
        const jobEl = formMount.querySelector('[name=job_no]');
        if (jobEl) jobEl.value = fresh;
        const disp = formMount.querySelector('[name=hbl_do_display]');
        if (disp && formMount.querySelector('[name=has_hbl]')?.checked) disp.value = fresh;
      } catch { /* preview only — submit mints its own under the chosen rep */ }
    });
  }

  // F-32-02: one guard per render() — re-entrancy-blocks a second submit while the
  // first is still pending (double-click / slow network) so only one shipment/job_no
  // is ever consumed per user action.
  const guardedSubmit = createSubmitGuard();

  root.querySelector('#shipment-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const intent  = e.submitter?.dataset?.intent === 'save' ? 'save' : 'publish';
    const saveBtn    = formMount.querySelector('#ni-save-btn');
    const publishBtn = formMount.querySelector('#ni-publish-btn');

    await guardedSubmit([saveBtn, publishBtn], async () => {
      const publish = intent === 'publish';
      const state   = collectFormState(formMount);
      const errors  = validateShipmentForm(state, { publish });
      if (errors.length) {
        highlightErrors(root, errors);
        jumpToFirstError(root); // E-39: the flagged field may sit on another screen
        const errEl = root.querySelector('#shipment-form-errors');
        if (errEl) {
          errEl.innerHTML = errors.map((err) => `<div>&#x2022; ${err}</div>`).join('');
          errEl.classList.remove('hidden');
        }
        return;
      }
      // F-29-04 VR-03: hard fx-deviation warn — blocks until explicitly confirmed
      const flagged = await findFxDeviations(state, fxRepo);
      if (flagged.length) {
        const { proceed, overrides } = await confirmFxDeviations(
          flagged, { confirmedBy: window.__vdg_current_user?.email || 'unknown' });
        if (!proceed) return;
        state._fx_overrides = overrides;
      }
      // F-41-01: the record's owner is what the FORM resolved (select → derivation chain), never
      // the session fallback alone — validateShipmentForm has already refused an empty pick.
      const repFinal = state.sales_rep || salesRepId;
      try {
        if (isEdit) {
          const { advancedTo } = await updateForm(state, repo, repFinal, editRef, undefined, { publish });
          _dispatchCommitted(formMount, repFinal);
          const key = publish ? 'sales_new.publish_pending_toast' : 'sales_new.saved_draft_toast';
          showToast(t(key).replace('{ref}', editRef), 'success');
          // E-40: the save completed the phase's data and the job moved — say so, and re-render so
          // the timeline + phase screens open at where the job now IS. (Without an advance we stay
          // put, to avoid the white flash.)
          if (advancedTo) {
            showToast(t('sales_new.auto_advanced', { state: t('shipment.status.' + advancedTo) }), 'success');
            navigate('/sales/edit/' + editRef);
          }
        } else {
          const { ref, advancedTo } = await submitForm(state, repo, repFinal, undefined, { publish });
          _dispatchCommitted(formMount, repFinal);
          await clearDraft();
          const key = publish ? 'sales_new.publish_pending_toast' : 'sales_new.saved_draft_toast';
          showToast(t(key).replace('{ref}', ref), 'success');
          if (advancedTo) showToast(t('sales_new.auto_advanced', { state: t('shipment.status.' + advancedTo) }), 'success');
          navigate('/sales/edit/' + ref);
        }
      } catch (err) {
        showToast(saveErrorText(err), 'error');
      }
    });
  });
}
