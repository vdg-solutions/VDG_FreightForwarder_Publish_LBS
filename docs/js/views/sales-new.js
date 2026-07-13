// sales-new.js — route entry; thin wrapper over NI 4-section form (F-15-27)

import { t } from '../i18n/index.js';
import { navigate } from '../router.js';
import { currentSalesRepId } from '../auth/auth-gate.js';
import { loadDraft, clearDraft } from './sales-new/draft-manager.js';
import { renderForm, collectFormState, validateNiForm,
         PNL_VERTICAL_AUTOFILL_KEY, niDtoToDraft, shipmentToDraft } from './sales-new-form.js';
import { submitForm, updateForm, highlightErrors } from './sales-new/submit-orchestrator.js';
import { runBatchImport } from '../operators/pnl-vertical-batch-import.js';
import { loadWasm } from '../wasm-loader.js';
import { activeWorkspaceName } from '../operators/workspace-registry.js';

const ROUTE_SHIPMENTS = '/shipments';  // batch success navigation target (F-15-57)

function showToast(msg, type = 'info') {
  window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { message: msg, type } }));
}

// F-29-01 AC-04: fx-rate pre-fill singleton, mirrors app.js's manager-only fx-auto-fetch wiring
// but available to any sales rep — the form's per-line fx lookup isn't a manager-only feature.
let _fxRepoSingleton = null;
async function _fxRepo() {
  if (_fxRepoSingleton) return _fxRepoSingleton;
  const api = window.__vdg_drive_api;
  if (!api) return null;
  try {
    const { FxRateDriveRepo } = await import('../implementations/fx-rate-drive-repo.js');
    _fxRepoSingleton = new FxRateDriveRepo(api, () => api.findWorkspaceRoot(activeWorkspaceName()));
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
  const { editRef = null, mode = 'create', salesId = 'me' } = opts;
  const isEdit = mode === 'edit' && !!editRef;
  // salesId 'me' (self-service) resolves to the signed-in rep; an explicit id = on-behalf.
  const salesRepId = (salesId && salesId !== 'me') ? salesId : (currentSalesRepId() || '');
  const repo = window.__vdg_repo;

  let customers  = [];
  let userConfig = null;
  let draft      = null;

  try {
    if (repo) {
      customers = await repo.list('customers');
    }
  } catch { /* repo not ready — empty list is acceptable */ }

  try {
    if (repo && salesRepId) {
      userConfig = await repo.get('user', `user:${salesRepId}`).catch(() => null);
      // Resolve manager-assigned sales_pct → inject into userConfig
      const assignment = await repo.get('commission_rules', salesRepId).catch(() => null);
      if (assignment?.sales_pct != null) {
        userConfig = { ...(userConfig || {}), sales_share_pct: Number(assignment.sales_pct) };
      }
    }
  } catch { /* non-critical */ }

  if (isEdit) {
    // AC-01: hydrate from persisted records
    try {
      if (repo) {
        const shipment = await repo.get('shipment', editRef);
        const ce = await repo.get('commission_entry', `${editRef}-CR1`).catch(() => null);
        draft = shipmentToDraft(shipment, ce);
      }
    } catch { /* shipment not found — render blank */ }

    // AC-02: "Editing shipment <ref>" indicator
    root.innerHTML = `
      <div class="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200
                  text-amber-800 rounded-lg px-4 py-2 mx-6 mt-4 font-medium">
        <span>Editing shipment</span>
        <span class="font-mono">${editRef}</span>
      </div>
      <div id="form-mount"></div>`;
  } else {
    // AC-05: check sessionStorage for pending NI autofill
    const pending = sessionStorage.getItem(PNL_VERTICAL_AUTOFILL_KEY);
    if (pending) {
      sessionStorage.removeItem(PNL_VERTICAL_AUTOFILL_KEY);
      try { draft = niDtoToDraft(JSON.parse(pending)); }
      catch { /* malformed — fall through to loadDraft */ }
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

  const formMount = root.querySelector('#form-mount') || root;
  const fxRepo    = await _fxRepo();
  await renderForm(formMount, { customers, salesRepId, userConfig, draft, mode, fxRepo });

  // NI file drop + save draft: create path only
  if (!isEdit) {
    formMount.querySelector('#ni-upload-zone')?.addEventListener('vdg:file', async (e) => {
      const bytes = new Uint8Array(await e.detail.file.arrayBuffer());
      const wasm  = await loadWasm();
      if (!wasm) { showToast('WASM not ready', 'error'); return; }
      try {
        const pairs = wasm.import_legacy_pnl_wasm(bytes);
        if (!pairs?.length) { showToast('No shipments parsed', 'error'); return; }
        if (pairs.length === 1) {
          sessionStorage.setItem(PNL_VERTICAL_AUTOFILL_KEY, JSON.stringify(pairs[0]));
          await render(root);  // re-render picks up sessionStorage → autofills
          return;
        }
        // F-15-57: N>1 pairs → batch-commit directly, no per-pair form review
        const result = await runBatchImport(pairs, repo, salesRepId);
        if (!result.ok) {
          const msg = t('pnl.import.batch_failed_at_pair').replace('{index}', result.pairIndex);
          showToast(`${msg}: ${result.reason}`, 'error');
          return;
        }
        showToast(t('pnl.import.batch_created').replace('{count}', result.refs.length), 'success');
        navigate(ROUTE_SHIPMENTS);
      } catch (err) {
        showToast(`NI parse error: ${err.message}`, 'error');
      }
    });

  }

  root.querySelector('#ni-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const intent  = e.submitter?.dataset?.intent === 'save' ? 'save' : 'publish';
    const publish = intent === 'publish';
    const state   = collectFormState(formMount);
    const errors  = validateNiForm(state);
    if (errors.length) {
      highlightErrors(root, errors);
      const errEl = root.querySelector('#ni-form-errors');
      if (errEl) {
        errEl.innerHTML = errors.map((err) => `<div>&#x2022; ${err}</div>`).join('');
        errEl.classList.remove('hidden');
      }
      return;
    }
    try {
      if (isEdit) {
        await updateForm(state, repo, salesRepId, editRef, undefined, { publish });
        _dispatchCommitted(formMount, salesRepId);
        const key = publish ? 'sales_new.publish_pending_toast' : 'sales_new.saved_draft_toast';
        showToast(t(key).replace('{ref}', editRef), 'success');
        // Do not navigate if we are already on the edit page, to avoid a white screen flash
      } else {
        const { ref } = await submitForm(state, repo, salesRepId, undefined, { publish });
        _dispatchCommitted(formMount, salesRepId);
        await clearDraft();
        const key = publish ? 'sales_new.publish_pending_toast' : 'sales_new.saved_draft_toast';
        showToast(t(key).replace('{ref}', ref), 'success');
        navigate('/sales/edit/' + ref);
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  });
}
