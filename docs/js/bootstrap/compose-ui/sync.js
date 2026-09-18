// compose-ui/sync.js — binds the ui's sync ports to the wasm freight_app exports.
import { bindAuditLog } from '../../implementations/ui/core_abstractions/ports/sync/audit-log.js';
import { bindDueSoon } from '../../implementations/ui/core_abstractions/ports/sync/due-soon.js';
import { bindJobTracker } from '../../implementations/ui/core_abstractions/ports/sync/job-tracker.js';
import { bindWmaEngine } from '../../implementations/ui/core_abstractions/ports/sync/wma-engine.js';
import { bindWmaStore } from '../../implementations/ui/core_abstractions/ports/sync/wma-store.js';
import { jobTracker } from '../platform/sync-schedulers.js';

// The engine's state object is mutated IN PLACE, the way the form has always used it: Rust hands
// back the next state and it is written over the object the caller still holds and will save.
function _absorb(state, next) {
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, next);
  return state;
}

// A line index off a dataset attribute can be NaN; a key ending in "::NaN" is a row nobody can
// find again, so an unreadable index reads as row 0.
function _rowIdx(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function composeSync(wasm) {
  bindAuditLog({
    // A store name goes in, a verdict comes out. JS never carries the rows: wasm reads the trail
    // it is verifying, so the verdict is about the record and not about a copy JS was holding.
    verifyAuditChain: async (trail) => {
      const reply = await wasm.sync_audit_verify_chain({ trail });
      if (!reply.ok) throw new Error(reply.error || 'the trail could not be read');
      return reply.problems;
    },
  });

  bindDueSoon({
    computeDueSoonRows: async (salesId) => (await wasm.sync_due_soon_rows({ sales_id: salesId ?? null })).rows,
  });

  bindJobTracker(jobTracker);

  bindWmaEngine({
    predict: (state, descriptionText, classifyKindFn) => {
      const descKind = descriptionText && descriptionText.trim() && classifyKindFn
        ? classifyKindFn(descriptionText)
        : null;
      return wasm.sync_wma_predict({ state, desc_kind: descKind }).kind;
    },
    onEvent: (state, observed, predicted) => _absorb(
      state,
      wasm.sync_wma_on_event({ state, observed, predicted: predicted ?? null, now_ms: Date.now() }).state,
    ),
    dismissPrediction: (state, predictedKind) => _absorb(
      state,
      wasm.sync_wma_dismiss({ state, predicted_kind: predictedKind }).state,
    ),
  });

  bindWmaStore({
    loadKindWmaState: async (_store, repId, rowIdx) => (await wasm.sync_wma_load({
      rep_id: String(repId ?? ''), row_idx: _rowIdx(rowIdx), now_ms: Date.now(),
    })).state,
    saveKindWmaState: async (_store, repId, rowIdx, state) => {
      const reply = await wasm.sync_wma_save({ rep_id: String(repId ?? ''), row_idx: _rowIdx(rowIdx), state });
      if (!reply.ok) console.warn('[wma] save failed:', reply.error); // DEV
    },
  });
}
