// Shipment ref generation — F-15-16

const DIRECTION_EX_MODES  = new Set(['FCL EXPORT', 'AIR EXPORT']);
const DIRECTION_IM_MODES  = new Set(['IMPORT FCL', 'AIR IMPORT']);
const DEFAULT_DIRECTION   = 'EX';
const SEQ_PAD_LEN         = 3;
const DATE_PART_LEN       = 6; // YYMMDD
const SESSION_SEQ_KEY_SEP = '-';
// session guard: prevents seq reset when IDB freshness (30s) expires before outbox syncs
const _sessionSeq = new Map(); // `${dir}-${YYMMDD}` → maxSeqUsed

export const REF_REGEX = /^(EX|IM)-\d{6}-\d{3}$/;

// 'FCL EXPORT' → 'EX', 'IMPORT FCL' → 'IM', default 'EX'
export function directionFromMode(mode) {
  if (DIRECTION_EX_MODES.has(mode)) return 'EX';
  if (DIRECTION_IM_MODES.has(mode)) return 'IM';
  return DEFAULT_DIRECTION;
}

// dateMs → 'YYMMDD'
function toYYMMDD(dateMs) {
  const d = new Date(dateMs);
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

// Returns 'EX-260618-001'
export function genShipmentRef(direction, dateMs, seq) {
  const datePart = toYYMMDD(dateMs);
  const seqPart  = String(seq).padStart(SEQ_PAD_LEN, '0');
  return `${direction}-${datePart}-${seqPart}`;
}

// Call after successful repo.put to record seq for this session
export function recordSeq(dir, dateMs, seq) {
  const key = `${dir}${SESSION_SEQ_KEY_SEP}${toYYMMDD(dateMs)}`;
  const cur  = _sessionSeq.get(key) || 0;
  if (seq > cur) _sessionSeq.set(key, seq);
}

// Query repo + session max, return max + 1; pre-records to guard concurrent same-tick calls
export async function nextSeq(repo, direction, dateMs) {
  if (!repo) return 1;
  const key        = `${direction}${SESSION_SEQ_KEY_SEP}${toYYMMDD(dateMs)}`;
  const sessionMax = _sessionSeq.get(key) || 0;
  const prefix     = `${direction}-${toYYMMDD(dateMs).slice(0, DATE_PART_LEN - 2)}`; // EX-2606
  let repoMax = 0;
  try {
    const all = await repo.list('shipment', (s) => {
      const ref = s.shipment_ref || '';
      return ref.startsWith(prefix);
    });
    for (const s of all) {
      const ref   = s.shipment_ref || '';
      const parts = ref.split('-');
      const seq   = parseInt(parts[parts.length - 1], 10);
      if (!Number.isNaN(seq) && seq > repoMax) repoMax = seq;
    }
  } catch { /* repo unavailable — use session max */ }
  const max = Math.max(repoMax, sessionMax);
  const seq = max + 1;
  _sessionSeq.set(key, seq); // pre-record: guard concurrent same-tick calls
  return seq;
}
