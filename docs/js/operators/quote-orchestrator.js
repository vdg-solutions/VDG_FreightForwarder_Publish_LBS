// Quote orchestrator — Draft creation, state transitions, validation

const QUOTE_ID_PREFIX        = 'QT';
const OVERRIDE_THRESHOLD_PCT = 0.15; // 15% lower → manager approval required
const KIND_QUOTATIONS        = 'quotations';
const KIND_SHIPMENT          = 'shipment';
const KIND_APPROVAL_REQUEST  = 'approval_request';

// ── ID generation ─────────────────────────────────────────────────────────────

function todayYMD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

export async function generateQuoteId(repo) {
  const today = todayYMD();
  const all = await repo.list(KIND_QUOTATIONS, null).catch(() => []);
  const todayQuotes = all.filter((q) => (q.id || '').startsWith(`${QUOTE_ID_PREFIX}-${today}`));
  const seq = String(todayQuotes.length + 1).padStart(3, '0');
  return `${QUOTE_ID_PREFIX}-${today}-${seq}`;
}

// ── total amount ──────────────────────────────────────────────────────────────

function totalAmount(lines) {
  return lines.reduce((sum, l) => sum + Number(l.amount || 0), 0);
}

// ── last accepted quote for same lane ─────────────────────────────────────────

async function lastAcceptedAmount(repo, customer, pol, pod) {
  const all = await repo.list(KIND_QUOTATIONS, null).catch(() => []);
  const matches = all
    .filter((q) =>
      q.state === 'Accepted' &&
      (q.customer || '').toLowerCase() === customer.toLowerCase() &&
      (q.pol || '') === pol &&
      (q.pod || '') === pod
    )
    .sort((a, b) => (b.created_at_ms || 0) - (a.created_at_ms || 0));
  if (!matches.length) return null;
  return totalAmount(matches[0].lines || []);
}

// ── save draft ────────────────────────────────────────────────────────────────

export async function saveDraft(repo, salesRepId, formData) {
  const { customer, pol, pod, container_type, carrier, lines, validity_days, notes } = formData;
  const id    = await generateQuoteId(repo);
  const now   = Date.now();
  const validMs = Number(validity_days) * 86400000;
  const total = totalAmount(lines);

  let pending_manager_approval = false;
  const lastAmt = await lastAcceptedAmount(repo, customer, pol, pod);
  if (lastAmt !== null && lastAmt > 0) {
    const drop = (lastAmt - total) / lastAmt;
    if (drop > OVERRIDE_THRESHOLD_PCT) pending_manager_approval = true;
  }

  const quote = {
    id,
    state: 'Draft',
    customer,
    pol,
    pod,
    container_type,
    carrier: carrier || null,
    lines,
    validity_days: Number(validity_days),
    valid_until_ms: now + validMs,
    notes: notes || null,
    created_at_ms: now,
    created_by: salesRepId,
    pending_manager_approval,
  };

  await repo.put(KIND_QUOTATIONS, id, quote);

  if (pending_manager_approval) {
    const arId = `AR-${id}`;
    const ar = {
      id:               arId,
      type:             'QuoteOverride',
      requester:        salesRepId,
      requester_rep_id: salesRepId,
      requested_at:     new Date(now).toISOString(),
      created_at_ms:    now,
      target_kind:      'quotation',
      target_id:        id,
      reason:           `Quote total dropped >${Math.round(OVERRIDE_THRESHOLD_PCT * 100)}% vs last accepted`,
      status:           'Pending',
    };
    await repo.put(KIND_APPROVAL_REQUEST, arId, ar).catch(() => { /* non-fatal */ });
  }

  return { id, quote, pending_manager_approval };
}

// ── send to customer ──────────────────────────────────────────────────────────

export async function sendToCustomer(repo, quote) {
  const updated = { ...quote, state: 'Sent', sent_at_ms: Date.now() };
  await repo.put(KIND_QUOTATIONS, quote.id, updated);
  return updated;
}

// ── mark accepted ─────────────────────────────────────────────────────────────

export async function markAccepted(repo, quote) {
  const updated = { ...quote, state: 'Accepted', accepted_at_ms: Date.now() };
  await repo.put(KIND_QUOTATIONS, quote.id, updated);
  return updated;
}

// ── convert guard ─────────────────────────────────────────────────────────────

export async function checkAlreadyConverted(repo, quoteId) {
  const shipments = await repo.list(KIND_SHIPMENT, (s) => s.quote_ref === quoteId).catch(() => []);
  return shipments[0] || null;
}
