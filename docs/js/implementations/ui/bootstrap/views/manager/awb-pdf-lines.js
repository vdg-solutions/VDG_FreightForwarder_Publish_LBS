// awb-pdf-lines.js — F-31-05: the AWB export's text, as data.
//
// A label written straight into `doc.text(\`AWB: ${n}\`)` is invisible to the i18n detector — it
// scans markup and t() calls, not template literals handed to a PDF library. Three labels sat in
// English inside that call for exactly that reason. Building the lines here keeps them where a
// test can read them without a jsPDF stub or a network import.

import { t } from '../../../../kernel/core_abstractions/i18n/index.js';

const TITLE_SIZE = 16;
const BODY_SIZE  = 11;
const EMPTY      = '—';

/// AC-10 fields, in print order: AWB no, shipper, consignee, chargeable weight, pieces, commodity.
/// `y` is the baseline each line prints at; `x` belongs to the renderer.
export function pdfLines(awb) {
  return [
    { size: TITLE_SIZE, y: 20, text: `${t('awb.label.awb_no')}: ${awb.awb_no}` },
    { size: BODY_SIZE,  y: 34, text: `${t('sales_new.field.shipper')}: ${awb.shipper?.name ?? EMPTY}` },
    { size: BODY_SIZE,  y: 43, text: `${t('sales_new.field.consignee')}: ${awb.consignee?.name ?? EMPTY}` },
    { size: BODY_SIZE,  y: 52, text: `${t('awb.label.chargeable_weight')}: ${awb.weight_chargeable_kg ?? 0} kg` },
    { size: BODY_SIZE,  y: 61, text: `${t('awb.label.pieces')}: ${awb.pieces ?? 0}` },
    { size: BODY_SIZE,  y: 70, text: `${t('sales_new.field.commodity')}: ${awb.commodity_desc ?? EMPTY}` },
  ];
}

/// The keys the export depends on. Named once so a test can check every one of them really exists
/// in every locale file — `t()` falls back to the key, so a typo would otherwise ship silently.
export const PDF_LABEL_KEYS = [
  'awb.label.awb_no',
  'sales_new.field.shipper',
  'sales_new.field.consignee',
  'awb.label.chargeable_weight',
  'awb.label.pieces',
  'sales_new.field.commodity',
];
