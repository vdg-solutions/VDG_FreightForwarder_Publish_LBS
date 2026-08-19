// Shipment ref — F-15-16, reworked by #13 (owner decision 2026-08-08).
// The counted sequence died: `shipment` is a per-user kind, every rep counted only its own
// cache, so two reps minted the same EX-YYMMDD-001 on the same day. Refs are now minted in
// WASM (data_repo/ref_gen.rs): EX|IM-YYMMDD-{HASH8 base36}, hash(rep salt + time + crypto
// nonce), local same-id regen guard — zero network, offline-safe, cross-rep unique by entropy.
// This module keeps only the pure JS glue: direction mapping + the dual-format validator.

const DIRECTION_EX_MODES = new Set(['FCL EXPORT', 'AIR EXPORT']);
const DIRECTION_IM_MODES = new Set(['IMPORT FCL', 'AIR IMPORT']);
const DEFAULT_DIRECTION  = 'EX';

// Old counted refs (EX-260618-001) stay valid forever — documents already carry them.
// New refs are EX-260808-K7M2Q9DX (8 base36 uppercase).
export const REF_REGEX = /^(EX|IM)-\d{6}-(\d{3}|[0-9A-Z]{8})$/;

// 'FCL EXPORT' → 'EX', 'IMPORT FCL' → 'IM', default 'EX'
export function directionFromMode(mode) {
  if (DIRECTION_EX_MODES.has(mode)) return 'EX';
  if (DIRECTION_IM_MODES.has(mode)) return 'IM';
  return DEFAULT_DIRECTION;
}
