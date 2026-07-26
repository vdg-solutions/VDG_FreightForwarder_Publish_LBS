// status-i18n.js — value-keyed i18n label for a status-badge FSM state (F-19-19 AC-04)
// Follows the kanban-board.js pattern: t('<family>.<state>'), key-as-fallback = raw state.
import { t } from '../i18n/index.js';

const FALLBACK_PREFIX = 'shipment.status';

const PREFIX = {
  shipment:  'shipment.status',
  document:  'document.status',
  billing:   'billing.status',
  exception: 'exception.severity',
};

export function statusBadgeLabel(fsm, state) {
  if (!state) return '';
  return t(`${PREFIX[fsm] ?? FALLBACK_PREFIX}.${state}`);
}
