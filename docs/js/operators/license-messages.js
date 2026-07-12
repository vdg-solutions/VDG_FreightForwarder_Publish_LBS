// F-17-03 — error_kind -> i18n key mapping. Pure, no DOM/Drive deps.
// Keys mirror the WASM contract exactly (license_dto::error_kind_str) — no invented states.

import { t as defaultT } from '../i18n/index.js';

export const LICENSE_ERR_KEYS = Object.freeze({
  Expired:           'license.err.Expired',
  BadIat:             'license.err.BadIat',
  BadSignature:       'license.err.BadSignature',
  BadFormat:          'license.err.BadFormat',
  MissingField:       'license.err.MissingField',
  WorkspaceMismatch:  'license.err.WorkspaceMismatch',
});

export const LICENSE_ERR_FALLBACK_KEY = 'license.err.Unknown';

// AC-04: distinct key per kind; defined fallback for unknown/undefined (never undefined)
export function errorKindKey(kind) {
  return LICENSE_ERR_KEYS[kind] ?? LICENSE_ERR_FALLBACK_KEY;
}

export function errorKindMessage(kind, translate = defaultT) {
  return translate(errorKindKey(kind));
}
