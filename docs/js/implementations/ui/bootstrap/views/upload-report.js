// upload-report.js — F-57-02. Runs a dropped workbook through the real WASM importers and
// normalizes their ValidationError[] into rows the upload view can render.
//
// Split out of upload.js so that file stays presentation-only.
//
// Why an importer and not process_excel_file(): process_excel_file() clears app.last_errors and
// then only summarizes sheets — the parser never populates errors, so get_validation_errors()
// always came back empty. Validation lives in the import_*_excel workflows, which run the row
// mapper and aggregate a ValidationError per bad field. That is where the real errors are.

import { t } from '../../../kernel/core_abstractions/i18n/index.js';

// Each importer picks the first sheet whose headers match its own template and throws
// GuardError::Parse("no sheet matches…") otherwise — so trying them in turn IS the template
// detection. Order mirrors the template list shown in the view.
const IMPORTERS = [
  { key: 'booking',  fn: 'import_booking_excel_wasm'  },
  { key: 'document', fn: 'import_document_excel_wasm' },
  { key: 'pnl',      fn: 'import_pnl_excel_wasm'      },
];

// Rust ErrorCategory serializes as its variant name.
const CATEGORY_LABEL_KEYS = {
  MissingRequired: 'upload.sample_err.cat.missing_required',
  InvalidFormat:   'upload.sample_err.cat.invalid_format',
  BusinessRule:    'upload.sample_err.cat.business_rule',
  GuardViolation:  'upload.err.cat.guard_violation',
};

// calamine row_index is 0-based (Excel row N → row_index N−1); the sheet's own header row is
// not counted as data. Users read Excel's 1-based gutter, so display row_index + 1.
const EXCEL_ROW_OFFSET = 1;

/** Column is genuinely unknown for import errors — row_map_to_validation never sets it (the
 *  mapper works by header NAME, not by position). Show the placeholder rather than inventing
 *  a letter; `field` already identifies the column by name. */
export const COL_UNKNOWN = '—';

// Normalize one Rust ValidationError into a render-ready row.
export function toErrorRow(err) {
  return {
    row:      Number.isInteger(err?.row) ? err.row + EXCEL_ROW_OFFSET : COL_UNKNOWN,
    col:      COL_UNKNOWN,
    field:    err?.field   ?? '',
    code:     err?.code    ?? '',
    message:  err?.message ?? '',
    category: t(CATEGORY_LABEL_KEYS[err?.category] ?? 'upload.err.cat.guard_violation'),
  };
}

// The one error that means "wrong template, try the next one" — GuardError::Parse raised by
// import_sheet's pick_sheet(). Anything else (a corrupt archive, a calamine failure) is a real
// parse failure and must surface as itself: reporting "no template matched" for a truncated
// .xlsx would send the user off checking column headers on a file that never opened.
const HEADER_MISMATCH_HINT = 'no sheet matches';

function isHeaderMismatch(err) {
  return String(err?.message || err).includes(HEADER_MISMATCH_HINT);
}

/**
 * Parse `bytes` with whichever importer recognizes the workbook.
 * Throws on a genuine parse failure; a workbook no template recognizes is reported, not thrown.
 * @param {Uint8Array} bytes
 * @param {object} [wasm] injectable for tests; defaults to window.__vdg_wasm
 * @returns {{ matched: string|null, sheet: string, rowsTotal: number, rowsOk: number,
 *             errors: object[], parseError: string|null }}
 */
export function runImport(bytes, wasm = (typeof window !== 'undefined' ? window.__vdg_wasm : null)) {
  const empty = { matched: null, sheet: '', rowsTotal: 0, rowsOk: 0, errors: [], parseError: null };
  if (!wasm) return { ...empty, parseError: 'wasm-unavailable' };

  for (const imp of IMPORTERS) {
    if (typeof wasm[imp.fn] !== 'function') continue;
    try {
      const report = wasm[imp.fn](bytes);
      return {
        matched:    imp.key,
        sheet:      report.sheet ?? '',
        rowsTotal:  report.rows_total ?? 0,
        rowsOk:     report.rows_ok ?? 0,
        errors:     (report.errors ?? []).map(toErrorRow),
        parseError: null,
      };
    } catch (err) {
      if (!isHeaderMismatch(err)) throw err; // real failure — let the caller report it verbatim
    }
  }
  // Every importer read the file fine and none recognized it: that IS the finding, not a crash.
  return { ...empty, parseError: 'no-template-match' };
}
