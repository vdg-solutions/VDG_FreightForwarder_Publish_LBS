// Operator — Notification compute. Pure, no I/O.

const PERIOD_CLOSE_WARN_DAYS = 7;
const CUTOFF_WARN_HOURS      = 24;

const NOTIFICATION_TYPES = [
  'approval_request',
  'exception_escalated',
  'commission_settle_request',
  'credit_state_change',
  'cutoff_approaching',
  'period_close_due',
];

// ── event → notification ──────────────────────────────────────────────────────

/**
 * Maps a vdg:entity-changed event detail to a Notification or null.
 * @param {{ kind: string, id: string }} eventDetail
 * @param {Map<string, object>} entities  current entity cache (kind → id → entity)
 */
export function computeFromEvent(eventDetail, entities) {
  const { kind, id } = eventDetail || {};
  if (!kind || !id) return null;

  const entity = entities?.get?.(`${kind}::${id}`);

  if (kind === 'approval_request' && entity?.status === 'Pending') {
    return _make('approval_request',
      `Approval request: ${entity.type || kind} from ${entity.requester || '?'}`,
      { entityKind: kind, entityId: id });
  }

  if (kind === 'exception' && entity?.severity === 'High') {
    return _make('exception_escalated',
      `Exception escalated: ${entity.shipment_ref || id} → ${entity.severity}`,
      { entityKind: kind, entityId: id });
  }

  if (kind === 'commission_settlement' && entity?.status === 'Pending') {
    return _make('commission_settle_request',
      `Commission settle request from ${entity.sales_rep || '?'}`,
      { entityKind: kind, entityId: id });
  }

  if (kind === 'customers' && entity?.credit_state) {
    return _make('credit_state_change',
      `Credit alert: ${entity.name || id} → ${entity.credit_state}`,
      { entityKind: kind, entityId: id });
  }

  return null;
}

// ── time-based ────────────────────────────────────────────────────────────────

/**
 * Compute time-based notifications from shipments.
 * @param {object[]} shipments
 * @param {Date} today
 * @returns {object[]}
 */
export function computeTimeBased(shipments, today) {
  const notifs = [];
  const now    = today.getTime();

  // period_close_due — within PERIOD_CLOSE_WARN_DAYS of month-end
  const monthEnd  = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const daysLeft  = Math.ceil((monthEnd.getTime() - now) / 86_400_000);
  if (daysLeft <= PERIOD_CLOSE_WARN_DAYS && daysLeft >= 0) {
    notifs.push(_make('period_close_due',
      `Period close due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
      {}));
  }

  // cutoff_approaching — shipments with cutoff_datetime within 24h
  const warnMs = CUTOFF_WARN_HOURS * 3_600_000;
  for (const s of shipments) {
    const cutoff = s.cutoff_datetime ? new Date(s.cutoff_datetime).getTime() : null;
    if (cutoff && cutoff > now && (cutoff - now) < warnMs) {
      notifs.push(_make('cutoff_approaching',
        `Cutoff in 24h: ${s.shipment_ref || s.id} · ${s.carrier || '?'}`,
        { entityKind: 'shipment', entityId: s.id }));
    }
  }

  return notifs;
}

// ── internal ──────────────────────────────────────────────────────────────────

function _make(type, title, meta) {
  return {
    id:         crypto.randomUUID?.() || `n-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    title,
    created_at: new Date().toISOString(),
    read:       false,
    dismissed:  false,
    ...meta,
  };
}

export { NOTIFICATION_TYPES, PERIOD_CLOSE_WARN_DAYS, CUTOFF_WARN_HOURS };
