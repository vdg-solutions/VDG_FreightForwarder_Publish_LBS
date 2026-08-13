// sales-new.js — route entry; thin wrapper over NI 4-section form (F-15-27)

import { t } from '../i18n/index.js';
import { navigate } from '../router.js';
import { currentSalesRepId } from '../auth/auth-gate.js';
import { loadDraft, clearDraft } from './sales-new/draft-manager.js';
import { renderForm, collectFormState, validateNiForm, shipmentToDraft, jumpToFirstError } from './sales-new-form.js';
import { submitForm, updateForm, highlightErrors } from './sales-new/submit-orchestrator.js';
import { createSubmitGuard } from './sales-new/submit-guard.js';
import { findFxDeviations, confirmFxDeviations } from './sales-new-form/pnl-fx-deviation-gate.js';
import { safeMasterLoad } from '../util/master-load.js';
import { ensureRepCode } from '../operators/rep-code-registry.js';
import { assignJobNo } from '../operators/job-no-gen.js';
import { readSettings, DEFAULT_CURRENCY_FIELD } from '../operators/manager/workspace-settings.js';
import { getShipment, REVENUE_SEEN } from '../data/shipment-repo.js';
import { loadTimeline, renderTimeline, bindTimeline } from '../components/phase-timeline.js';

const TIMELINE_MOUNT_ID = 'phase-timeline';

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

// F-29-01 AC-04: fx-rate pre-fill singleton, mirrors app.js's manager-only fx-auto-fetch wiring
// but available to any sales rep — the form's per-line fx lookup isn't a manager-only feature.
let _fxRepoSingleton = null;
async function _fxRepo() {
  if (_fxRepoSingleton) return _fxRepoSingleton;
  try {
    const { FxRateDriveRepo } = await import('../implementations/fx-rate-drive-repo.js');
    _fxRepoSingleton = new FxRateDriveRepo();
    return _fxRepoSingleton;
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
  // salesId 'me' (self-service) resolves to the signed-in rep; an explicit id = on-behalf.
  const salesRepId = (salesId && salesId !== 'me') ? salesId : (currentSalesRepId() || '');
  const repo = window.__vdg_repo;

  let customers  = [];
  let userConfig = null;
  let draft      = null;
  let jobNo      = null;
  let defaultCurrency = null;
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
      const [customerList, rawUserConfig, assignment, wsSettings] = await Promise.all([
        repo.list('customers').catch(() => []),
        salesRepId ? repo.get('user', `user:${salesRepId}`).catch(() => null) : Promise.resolve(null),
        salesRepId ? repo.get('commission_rules', salesRepId).catch(() => null) : Promise.resolve(null),
        // Accounting's default header currency — a LOCAL store read (workspace_settings kind),
        // not a Drive fetch: the delta tick is what keeps it current, not this render.
        isEdit ? Promise.resolve(null) : readSettings(repo),
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
      return { customerList, userConfig: resolvedUserConfig, jobNo: generatedJobNo, wsSettings };
    }, 'sales-new:personalization', PERSONALIZATION_LOAD_TIMEOUT_MS);

    if (loadRes.ok) {
      customers  = loadRes.value.customerList;
      userConfig = loadRes.value.userConfig;
      jobNo      = loadRes.value.jobNo;
      defaultCurrency = loadRes.value.wsSettings?.[DEFAULT_CURRENCY_FIELD] ?? null;
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
    shipment_ref: editRef || jobNo || draft?.shipment_ref || '',
    state: draft?.state || 'Created',
  });

  const formMount = root.querySelector('#form-mount') || root;
  const fxRepo    = await _fxRepo();
  await renderForm(formMount, { customers, salesRepId, userConfig, draft, mode, fxRepo, jobNo,
                                defaultCurrency, revenueVisible });

  // F-32-02: one guard per render() — re-entrancy-blocks a second submit while the
  // first is still pending (double-click / slow network) so only one shipment/job_no
  // is ever consumed per user action.
  const guardedSubmit = createSubmitGuard();

  root.querySelector('#ni-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const intent  = e.submitter?.dataset?.intent === 'save' ? 'save' : 'publish';
    const saveBtn    = formMount.querySelector('#ni-save-btn');
    const publishBtn = formMount.querySelector('#ni-publish-btn');

    await guardedSubmit([saveBtn, publishBtn], async () => {
      const publish = intent === 'publish';
      const state   = collectFormState(formMount);
      const errors  = validateNiForm(state);
      if (errors.length) {
        highlightErrors(root, errors);
        jumpToFirstError(root); // E-39: the flagged field may sit on another screen
        const errEl = root.querySelector('#ni-form-errors');
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
      try {
        if (isEdit) {
          const { advancedTo } = await updateForm(state, repo, salesRepId, editRef, undefined, { publish });
          _dispatchCommitted(formMount, salesRepId);
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
          const { ref, advancedTo } = await submitForm(state, repo, salesRepId, undefined, { publish });
          _dispatchCommitted(formMount, salesRepId);
          await clearDraft();
          const key = publish ? 'sales_new.publish_pending_toast' : 'sales_new.saved_draft_toast';
          showToast(t(key).replace('{ref}', ref), 'success');
          if (advancedTo) showToast(t('sales_new.auto_advanced', { state: t('shipment.status.' + advancedTo) }), 'success');
          navigate('/sales/edit/' + ref);
        }
      } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
      }
    });
  });
}
