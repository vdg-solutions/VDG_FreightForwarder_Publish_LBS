let cached = null;

const BRIDGE_EXPORTS = [
  'vdg_version',
  'process_excel_file',
  'get_validation_errors',
  'apply_fsm_event',
  'get_entity_state',
  'drain_events',
  'get_transition_log',
  'import_booking_excel_wasm',
  'import_pnl_combined_wasm',
  'import_legacy_pnl_wasm',
  'detect_pnl_format_wasm',
  'verify_license',
];

export async function loadWasm() {
  if (cached) return cached;
  try {
    const mod = await import('/pkg/vdg_freight.js');
    await mod.default();
    cached = mod;
    window.__vdg_wasm = mod;
    for (const name of BRIDGE_EXPORTS) {
      if (typeof mod[name] === 'function') {
        window[name] = mod[name];
      }
    }
    window.dispatchEvent(new Event('vdg:wasm-ready'));
    return mod;
  } catch (err) {
    console.debug('[wasm-loader]', err); // DEV
    return null;
  }
}
