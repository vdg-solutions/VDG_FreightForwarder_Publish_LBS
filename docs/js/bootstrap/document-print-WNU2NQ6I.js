import {
  NOTE_TYPE_DEBIT,
  loadNoteData
} from "./chunk-5MWQ74TZ.js";
import "./chunk-EPS4ANRF.js";
import {
  getShipment
} from "./chunk-U4BJYZQA.js";
import {
  t
} from "./chunk-NPO6NGQC.js";

// output/web/js.tmp/implementations/ui/bootstrap/views/document-print-data.js
var FIELD_ABSENT = "\u2014";
var DOC_TYPE_HBL = "HBL";
var DOC_TYPE_MBL = "MBL";
var DOC_TYPE_DO = "D/O";
var DOC_TYPE_AN = "AN";
var DOC_TYPE_DEBIT = "Debit Note";
var DOC_TYPES = [DOC_TYPE_HBL, DOC_TYPE_MBL, DOC_TYPE_DO, DOC_TYPE_AN, DOC_TYPE_DEBIT];
var OWN_LEGAL_NAME = "VDG Freight Services Co., Ltd";
var BANK_LINE = "Vietcombank \u2014 HCM Branch \u2014 Acc 0071001234567";
function val(v) {
  return v === null || v === void 0 || v === "" ? FIELD_ABSENT : String(v);
}
function vesselVoy(s) {
  return val(s.vessel);
}
function weight(s) {
  return s.weight_actual_kg ? `${s.weight_actual_kg} KGS` : FIELD_ABSENT;
}
var BUILDERS = {
  [DOC_TYPE_HBL]: (s) => [
    ["sales_new.field.shipper", val(s.shipper)],
    ["sales_new.field.consignee", val(s.consignee)],
    ["document_print.field.notify_party", val(s.notify_party)],
    ["document_print.field.vessel_voy", vesselVoy(s)],
    ["document_print.field.port_of_load", val(s.pol)],
    ["document_print.field.port_of_disch", val(s.pod)],
    ["document_print.field.marks_nos", val(s.container_spec || s.shipment_ref)],
    ["document_print.field.description", val(s.commodity_description)],
    ["document_print.field.gross_weight", weight(s)],
    ["document_print.field.measurement", FIELD_ABSENT]
    // not captured on the shipment yet
  ],
  [DOC_TYPE_MBL]: (s) => [
    ["budget_print.field.carrier", val(s.carrier)],
    ["document_print.field.bl_number", val(s.mbl)],
    ["sales_new.field.shipper", OWN_LEGAL_NAME],
    ["sales_new.field.consignee", val(s.handling_agent || s.consignee)],
    ["document_print.field.vessel_voy", vesselVoy(s)],
    ["document_print.field.port_of_load", val(s.pol)],
    ["document_print.field.port_of_disch", val(s.pod)],
    ["document_print.field.no_of_bls", FIELD_ABSENT],
    // not captured on the shipment yet
    ["document_print.field.freight", val(s.freight_terms)]
  ],
  [DOC_TYPE_DO]: (s) => [
    ["document_print.field.do_no", val(s.do_no)],
    ["note_print.recipient.issued_to", val(s.customer)],
    ["document_print.field.container_no", val(s.container_spec)],
    ["document_print.field.seal_no", FIELD_ABSENT],
    ["document_print.field.terminal", val(s.pod)],
    ["document_print.field.free_time", FIELD_ABSENT],
    ["document_print.field.release_date", val(s.eta)],
    ["document_print.field.remarks", FIELD_ABSENT]
  ],
  [DOC_TYPE_AN]: (s) => [
    ["document_print.field.an_no", val(s.job_no)],
    ["sales_new.field.consignee", val(s.consignee)],
    ["sales_new.field.vessel", val(s.vessel)],
    ["document_print.field.voyage", val(s.flight_no)],
    // air leg; sea voyage not stored
    ["ETD", val(s.etd)],
    ["ETA", val(s.eta)],
    ["document_print.field.port_of_disch", val(s.pod)],
    ["Container", val(s.container_spec)],
    ["document_print.field.freight_status", val(s.freight_terms)]
  ]
};
function debitFields(shipment, note) {
  const total = note.lines.reduce((sum, l) => sum + l.total, 0);
  return [
    ["document_print.field.debit_note_no", note.noteNo],
    ["note_print.recipient.issued_to", val(note.customer?.name || shipment.customer)],
    ["document_print.field.ref_shipment", val(shipment.shipment_ref)],
    ["sales_drop.preview.col.description", note.lines.length ? note.lines.map((l) => l.description).filter(Boolean).join(" \xB7 ") : FIELD_ABSENT],
    ["quote_new.col.amount", note.lines.length ? `${note.currency} ${total.toFixed(2)}` : FIELD_ABSENT],
    ["currency", val(note.currency)],
    ["document_print.field.due_date", FIELD_ABSENT],
    // no payment-term field on the shipment
    ["document_print.field.bank", BANK_LINE]
  ];
}
async function loadDocumentData(docId, docType, repo = typeof window !== "undefined" ? window.__vdg_repo : null) {
  if (!repo || !docId) return { shipment: null, fields: [] };
  const shipment = await getShipment(repo, docId).catch(() => null);
  if (!shipment) return { shipment: null, fields: [] };
  if (docType === DOC_TYPE_DEBIT) {
    const note = await loadNoteData(docId, NOTE_TYPE_DEBIT, repo);
    return { shipment, fields: debitFields(shipment, note) };
  }
  const build = BUILDERS[docType] || BUILDERS[DOC_TYPE_HBL];
  return { shipment, fields: build(shipment) };
}

// output/web/js.tmp/implementations/ui/bootstrap/views/document-print.js
function docTypeLabel(docType) {
  return docType === "Debit Note" ? t("note_print.title.debit_note") : docType;
}
function draftBanner() {
  return `
    <div class="mb-6 border-2 border-red-500 rounded-lg p-3 text-center">
      <div class="text-base font-bold uppercase tracking-wider text-red-600">${t("note_print.draft_watermark")}</div>
      <div class="text-xs text-red-500 mt-0.5">${t("note_print.draft_explain")}</div>
    </div>
  `;
}
function docHeader(docId, docType) {
  return `
    <div class="doc-header flex justify-between items-start mb-6">
      <div>
        <div class="doc-title">${docTypeLabel(docType)}</div>
        <div class="doc-subtitle">VDG Freight Services Co., Ltd \xB7 ${t("document_print.header.ref")}: ${docId}</div>
      </div>
      <div class="text-right text-xs text-slate-500">
        <div class="font-semibold text-slate-800">VDG FREIGHT SERVICES CO., LTD</div>
        <div>123 Nguyen Hue, Dist 1, Ho Chi Minh City, Vietnam</div>
        <div>${t("document_print.header.tel")}: +84 28 3822 0000 \xB7 ops@vdgfreight.vn</div>
      </div>
    </div>
  `;
}
function fieldTable(fields) {
  const rows = fields.map(([label, value]) => `
    <tr>
      <th class="w-1/3 text-left font-semibold bg-slate-50">${t(label)}</th>
      <td>${value}</td>
    </tr>
  `).join("");
  return `<table class="w-full text-sm">${rows}</table>`;
}
function signatureBlock(docType) {
  return `
    <div class="mt-10 flex justify-between text-xs text-slate-600">
      <div>
        <div class="border-t border-slate-400 pt-1 mt-8 w-48">${t("document_print.field.shipper_consignor")}</div>
      </div>
      <div>
        <div class="border-t border-slate-400 pt-1 mt-8 w-48">
          For VDG Freight Services Co., Ltd
          ${docType === "HBL" ? `<br>${t("document_print.field.agent_for_carrier")}` : ""}
        </div>
      </div>
    </div>
  `;
}
function docTypeSelector(activeType, docId) {
  const tabs = DOC_TYPES.map((dt) => {
    const active = dt === activeType;
    return `
      <a href="#/document/${docId}/print?type=${encodeURIComponent(dt)}"
         class="px-3 py-1.5 rounded text-xs font-medium no-print transition
                ${active ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}">
        ${docTypeLabel(dt)}
      </a>
    `;
  }).join("");
  return `<div class="flex gap-2 mb-6 no-print">${tabs}</div>`;
}
function emptyState(docId) {
  return `
    <div class="bg-white rounded-xl border border-slate-200 p-10 text-center">
      <div class="text-sm font-semibold text-slate-900">${t("document_print.empty.no_shipment")}</div>
      <div class="text-xs text-slate-500 mt-1">${docId}</div>
      <a href="#/documents" class="inline-block mt-4 text-xs text-blue-600 hover:underline">\u2190 ${t("common.back")}</a>
    </div>
  `;
}
function chrome(docId, docType, hasDoc) {
  return `
    <div class="flex items-center justify-between mb-4 no-print">
      <div>
        <div class="text-xs text-slate-500">F-03-03 \xB7 ${t("document_print.preview_caption")}</div>
        <div class="text-base font-semibold text-slate-900">${docId}</div>
      </div>
      <div class="flex items-center gap-2">
        <a href="#/documents" class="text-xs text-slate-500 hover:underline no-print">\u2190 ${t("common.back")}</a>
        ${hasDoc ? `<vdg-print-button doc-id="${docId}" doc-type="${docType}"></vdg-print-button>` : ""}
      </div>
    </div>
  `;
}
async function render(root, docId) {
  const params = new URLSearchParams(location.hash.split("?")[1] || "");
  const docType = params.get("type") || DOC_TYPE_HBL;
  const data = await loadDocumentData(docId, docType);
  root.innerHTML = `
    <div class="p-6 max-w-[900px] mx-auto">
      ${chrome(docId, docType, Boolean(data.shipment))}
      ${docTypeSelector(docType, docId)}
      ${data.shipment ? `
      <div class="print-doc bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
        ${draftBanner()}
        ${docHeader(docId, docType)}
        ${fieldTable(data.fields)}
        ${signatureBlock(docType)}
      </div>` : emptyState(docId)}
    </div>
  `;
  if (data.shipment) await customElements.whenDefined("vdg-print-button");
  root.querySelectorAll('[href*="?type="]').forEach((a) => {
    a.addEventListener("click", async (e) => {
      e.preventDefault();
      const newType = new URL(a.href, location.href).searchParams.get("type") || DOC_TYPE_HBL;
      location.hash = `/document/${docId}/print?type=${encodeURIComponent(newType)}`;
    });
  });
}
export {
  render
};
