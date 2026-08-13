// section-docs-ext.js — E-39: the booking/documentation fields the customer's job sheet carries
// beyond the original NI header (booking no, reefer, cut-offs, depots, bill parties, seal, ATD).
//
// Rendered INTO the section-A grid (sales-new-form.js injects it after sectionAHtml) so the cells
// share the same 3-column rhythm — phase-screens.js then decides which cells each screen shows.
// Form input name === persisted record key, one vocabulary end to end (shipment-builder.js).

import { t } from '../../i18n/index.js';
import { fld, txt, num, dateInp, selFld } from './section-header.js';

// contract values — value= stays raw, only the label translates (same rule as PRODUCT_OPTIONS)
export const FREIGHT_TERMS_OPTIONS = ['PREPAID', 'COLLECT'];
export const BILL_TYPE_OPTIONS     = ['SEAWAY', 'TELEX', 'SURRENDER', 'ORIGINAL'];

const FREIGHT_TERMS_LABEL_KEYS = {
  PREPAID: 'sales_new.freight_terms.prepaid',
  COLLECT: 'sales_new.freight_terms.collect',
};
const BILL_TYPE_LABEL_KEYS = {
  SEAWAY:    'sales_new.bill_type.seaway',
  TELEX:     'sales_new.bill_type.telex',
  SURRENDER: 'sales_new.bill_type.surrender',
  ORIGINAL:  'sales_new.bill_type.original',
};

function dtInp(name, val) {
  return `<input type="datetime-local" name="${name}" value="${val || ''}"
    class="w-full border border-slate-200 rounded px-2 py-1 text-xs" />`;
}

// hoisted out of the template — a quoted word inside ${} reads to the i18n gate as a label
// somebody forgot to translate (same rule as phase-timeline.js's POSITION_* consts)
const NAME_COMMODITY = 'commodity';
const NAME_ATD       = 'atd';

/** The extra grid cells, in DOM order: booking extras first, then bill/docs, then ATD. */
export function docsExtHtml(d = {}) {
  return `
    ${fld(t('sales_new.field.booking_no'),        txt('booking_no', d.booking_no))}
    ${fld(t('sales_new.field.commodity'),         txt(NAME_COMMODITY, d.commodity))}
    ${fld(t('sales_new.field.container_qty'),     num('container_qty', d.container_qty))}
    ${fld(t('sales_new.field.reefer_temp'),       txt('reefer_temp', d.reefer_temp))}
    ${fld(t('sales_new.field.reefer_vent'),       txt('reefer_vent', d.reefer_vent))}
    ${fld(t('sales_new.field.closing_si'),        dtInp('closing_si', d.closing_si))}
    ${fld(t('sales_new.field.closing_cy'),        dtInp('closing_cy', d.closing_cy))}
    ${fld(t('sales_new.field.empty_pickup_depot'), txt('empty_pickup_depot', d.empty_pickup_depot))}
    ${fld(t('sales_new.field.full_return_depot'), txt('full_return_depot', d.full_return_depot))}
    ${fld(t('sales_new.field.place_of_receipt'),  txt('place_of_receipt', d.place_of_receipt))}
    ${fld(t('sales_new.field.place_of_delivery'), txt('place_of_delivery', d.place_of_delivery))}
    ${fld(t('sales_new.field.notify_party'),      txt('notify_party', d.notify_party))}
    ${fld(t('sales_new.field.for_delivery'),      txt('for_delivery', d.for_delivery))}
    ${fld(t('sales_new.field.seal_no'),           txt('seal_no', d.seal_no))}
    ${fld(t('sales_new.field.freight_terms'),
          selFld('freight_terms', FREIGHT_TERMS_OPTIONS, d.freight_terms, FREIGHT_TERMS_LABEL_KEYS))}
    ${fld(t('sales_new.field.bill_type'),
          selFld('doc_type', BILL_TYPE_OPTIONS, d.doc_type, BILL_TYPE_LABEL_KEYS))}
    ${fld(t('sales_new.field.volume_cbm'),        num('volume_cbm', d.volume_cbm))}
    ${fld(t('sales_new.field.atd'),               dateInp(NAME_ATD, d.atd))}`;
}

/** collectFormState delta for the ext fields — one list, so the collector cannot drift. */
export const DOCS_EXT_FIELDS = [
  'booking_no', 'commodity', 'container_qty', 'reefer_temp', 'reefer_vent',
  'closing_si', 'closing_cy', 'empty_pickup_depot', 'full_return_depot',
  'place_of_receipt', 'place_of_delivery', 'notify_party', 'for_delivery',
  'seal_no', 'freight_terms', 'doc_type', 'volume_cbm', 'atd',
];
