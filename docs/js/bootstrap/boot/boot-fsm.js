// boot-fsm.js — event-driven boot state machine (E-36 F-36-06).
//
// The boot critical path used to race each step against a blind wall-clock deadline (safeAwait
// 8/12/20s): a slow-but-progressing boot false-failed at the bound, a stuck one still waited the
// whole bound. This FSM removes the blindness — every transition is driven by a REAL event that
// the platform already emits:
//   IndexedDB open  → onsuccess / onerror / onblocked
//   wasm fetch      → resolve / reject  (+ progress bytes for the affordance)
//   Drive REST      → HTTP status (200 / 401 / 403 / 5xx) / network reject
// The UI renders the CURRENT state (real progress), never a blind spinner. A wall-clock is allowed
// ONLY as a last-resort anti-hang backstop for a genuinely wedged socket — never as the mechanism
// that decides a step's success/failure.

export const BootState = {
  OPENING_DB:     'opening_db',
  LOADING_WASM:   'loading_wasm',
  PROVISIONING:   'provisioning',
  BUILDING_REPO:  'building_repo',
  GATING_LICENSE: 'gating_license',
  RENDERING:      'rendering',
  READY:          'ready',      // terminal — success
  ERROR:          'error',      // terminal — carries { kind, cause }
};

export const BootEvent = {
  DB_OPENED:       'db_opened',
  DB_FAILED:       'db_failed',        // onerror / onblocked
  WASM_READY:      'wasm_ready',
  WASM_FAILED:     'wasm_failed',
  NEEDS_PROVISION: 'needs_provision',  // NOT_PROVISIONED role
  PROVISIONED:     'provisioned',
  REPO_BUILT:      'repo_built',
  LICENSE_OK:      'license_ok',
  LICENSE_GATE:    'license_gate',     // gate withheld proceed (screen shown)
  RENDERED:        'rendered',
  AUTH_NEEDED:     'auth_needed',      // Drive 401
  DRIVE_FAILED:    'drive_failed',     // Drive 403 / 5xx / network
};

// ERROR kinds → let the UI pick the right screen (retry / reconnect / permission), no guessing.
export const BootErrorKind = {
  STORAGE: 'storage',   // IDB open failed/blocked
  APP_LOAD: 'app_load', // wasm fetch/instantiate failed
  AUTH:    'auth',      // 401 — reconnect
  DRIVE:   'drive',     // 403 / 5xx / network
};

const toError = (kind) => (payload) => ({ state: BootState.ERROR, kind, cause: payload });

// state × event → next state (or a fn(payload) → { state, ... } for terminals that carry data)
const TRANSITIONS = {
  [BootState.OPENING_DB]: {
    [BootEvent.DB_OPENED]: BootState.LOADING_WASM,
    [BootEvent.DB_FAILED]: toError(BootErrorKind.STORAGE),
  },
  [BootState.LOADING_WASM]: {
    [BootEvent.WASM_READY]:      BootState.BUILDING_REPO,
    [BootEvent.NEEDS_PROVISION]: BootState.PROVISIONING,
    [BootEvent.WASM_FAILED]:     toError(BootErrorKind.APP_LOAD),
  },
  [BootState.PROVISIONING]: {
    [BootEvent.PROVISIONED]:  BootState.BUILDING_REPO,
    [BootEvent.AUTH_NEEDED]:  toError(BootErrorKind.AUTH),
    [BootEvent.DRIVE_FAILED]: toError(BootErrorKind.DRIVE),
  },
  [BootState.BUILDING_REPO]: {
    [BootEvent.REPO_BUILT]:   BootState.GATING_LICENSE,
    [BootEvent.AUTH_NEEDED]:  toError(BootErrorKind.AUTH),
    [BootEvent.DRIVE_FAILED]: toError(BootErrorKind.DRIVE),
  },
  [BootState.GATING_LICENSE]: {
    [BootEvent.LICENSE_OK]:   BootState.RENDERING,
    [BootEvent.LICENSE_GATE]: BootState.READY,   // gate screen owns the DOM — boot is done, not failed
  },
  [BootState.RENDERING]: {
    [BootEvent.RENDERED]: BootState.READY,
  },
};

/**
 * Create a boot FSM. `onEnter(state, meta)` fires on every entered state (initial + each transition)
 * — the UI subscribes here to render the current phase. Unknown (state,event) pairs are ignored
 * (returns the unchanged state) so a stray/duplicate event can never corrupt the sequence.
 */
export function createBootFsm(onEnter) {
  let state = BootState.OPENING_DB;
  let meta  = {};
  const emit = () => { try { onEnter?.(state, meta); } catch { /* UI subscriber errors never break boot */ } };
  emit();
  return {
    get state() { return state; },
    get meta()  { return meta; },
    isTerminal() { return state === BootState.READY || state === BootState.ERROR; },
    dispatch(event, payload) {
      const next = TRANSITIONS[state]?.[event];
      if (next === undefined) return state; // invalid for this state — ignore, don't throw
      if (typeof next === 'function') { const r = next(payload); state = r.state; meta = r; }
      else { state = next; meta = payload !== undefined ? { payload } : {}; }
      emit();
      return state;
    },
  };
}
