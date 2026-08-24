let cached = null;

// Exported so any boot path that loads the wasm module itself (e.g.
// boot/repo-init-steps.js) can reuse the exact same list + loop instead of
// re-deriving which globals go on window (F-28-12 D-1 root fix).
export const BRIDGE_EXPORTS = [
  'vdg_version',
  'process_excel_file',
  'get_validation_errors',
  'apply_fsm_event',
  'get_entity_state',
  'register_entity',
  'drain_events',
  'get_transition_log',
  'import_booking_excel_wasm',
  'verify_license',
  'permission_can_pull',
  'permission_can_push',
  'permission_can_merge',
  'permission_can_push_own_fork',
  'permission_resolve_grants',
  // #28: route/nav authority — route-guard.js reads these; without globalizing them it falls back
  // to window.__vdg_wasm and a boot path that skipped the loader would silently deny every route.
  'access_can_route',
  'access_home_route',
  'access_redirect_for',
  'access_roles_from_record',
  'proposal_propose',
  'proposal_merge',
  'proposal_reject',            // AC-04: reject round-trip needs the global bridge
  'priced_ref_resolve_on_date',
  'compute_due_soon',           // F-48-01: payment-due-soon 4-tier ladder shared compute
];

// Binds every BRIDGE_EXPORTS name present as a function on `mod` onto `window`.
// The single loop every boot path MUST run after setting window.__vdg_wasm — a
// path that skips this leaves window.permission_can_merge / window.proposal_reject
// etc. undefined even though window.__vdg_wasm.<name> resolves fine (F-28-12 D-1).
//
// F-57-01: also adopts `mod` as this module's cache. boot/repo-init-steps.js imports and
// initializes the wasm module itself and never populated `cached`, so a later loadWasm()
// from /upload or sales-new-form/section-header.js re-ran the whole body and dispatched a
// SECOND vdg:wasm-ready. Harmless today (generated __wbg_init short-circuits on re-entry,
// and license-gate.js listens {once:true}) but it is a duplicate lifecycle event waiting for
// a non-idempotent listener. Every boot path already calls this function — one line closes it.
export function globalizeBridgeExports(mod) {
  cached = mod;
  for (const name of BRIDGE_EXPORTS) {
    if (typeof mod[name] === 'function') {
      window[name] = mod[name];
    }
  }
}

export async function loadWasm() {
  if (cached) return cached;
  try {
    const mod = await import(new URL('pkg/vdg_freight.js?v=f88020f', document.baseURI).href);
    const wasmUrl = new URL('pkg/vdg_freight_bg.wasm?v=f88020f', document.baseURI).href;
    await mod.default({ module_or_path: wasmUrl });
    cached = mod;
    window.__vdg_wasm = mod;
    globalizeBridgeExports(mod);
    window.dispatchEvent(new Event('vdg:wasm-ready'));
    return mod;
  } catch (err) {
    console.debug('[wasm-loader]', err); // DEV
    return null;
  }
}
