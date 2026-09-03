import {
  deriveNoteLines
} from "./chunk-SZYDA4BO.js";
import {
  customerForNote,
  listPnlLinesFor
} from "./chunk-EEMMQROU.js";
import {
  getShipment
} from "./chunk-CDRBIG2D.js";

// output/web/js.tmp/implementations/ui/bootstrap/views/note-print-data.js
var NOTE_TYPE_DEBIT = "debit";
var NOTE_TYPE_CREDIT = "credit";
var DN_PREFIX = "DN";
var CN_PREFIX = "CN";
var NOTE_SEQ_WIDTH = 4;
var DEFAULT_CURRENCY = "USD";
var REF_SEQ_RE = /-(\d+)$/;
function noteNumberFor(shipmentRef, noteType, year) {
  const prefix = noteType === NOTE_TYPE_CREDIT ? CN_PREFIX : DN_PREFIX;
  const seq = REF_SEQ_RE.exec(shipmentRef || "")?.[1] ?? "0";
  return `${prefix}-${year}-${seq.padStart(NOTE_SEQ_WIDTH, "0")}`;
}
async function loadNoteData(shipmentRef, noteType, repo = typeof window !== "undefined" ? window.__vdg_repo : null, year = (/* @__PURE__ */ new Date()).getFullYear()) {
  const empty = {
    shipment: null,
    lines: [],
    customer: null,
    currency: DEFAULT_CURRENCY,
    noteNo: noteNumberFor(shipmentRef, noteType, year),
    total: 0
  };
  if (!repo || !shipmentRef) return empty;
  const shipment = await getShipment(repo, shipmentRef).catch(() => null);
  if (!shipment) return empty;
  let rows = await listPnlLinesFor(shipmentRef).catch(() => []);
  if (!rows?.length) rows = shipment.pnl_lines || [];
  const { lines, total } = deriveNoteLines(rows, noteType);
  const customer = shipment.customer ? await customerForNote(shipment.customer) : null;
  return {
    shipment,
    lines,
    customer,
    currency: lines[0]?.currency || shipment.job_currency || DEFAULT_CURRENCY,
    noteNo: noteNumberFor(shipmentRef, noteType, year),
    total
  };
}

export {
  NOTE_TYPE_DEBIT,
  NOTE_TYPE_CREDIT,
  loadNoteData
};
