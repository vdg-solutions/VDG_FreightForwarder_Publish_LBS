// F-15-12 — Dunning scheduler: daily tick on app-open

import { classifyOverdue } from '../operators/manager/dunning-ladder.js';
import { DUNNING_CHECK_INTERVAL_MS } from '../operators/manager/dunning-constants.js';
import { appendDunning } from './dunning-log.js';

const DUNNING_LS_KEY = 'vdg.dunning.last_check';

// stages that trigger credit FSM cross-events
const OVERDUE_THRESHOLD_STAGE    = 'legal';     // day 60
const BLACKLIST_THRESHOLD_STAGE  = 'blacklist'; // day 95

let _repo = null;

/**
 * Call once after delta-poll starts.
 * @param {object} repo — EntityRepo
 */
export function initDunningScheduler(repo) {
  _repo = repo;
  _maybeTick();
}

// ── private ────────────────────────────────────────────────────────────────────

function _maybeTick() {
  const last = Number(localStorage.getItem(DUNNING_LS_KEY) || 0);
  const now  = Date.now();
  if (now - last < DUNNING_CHECK_INTERVAL_MS) return;
  _runTick().catch((err) => {
    console.error('[dunning-scheduler] tick failed:', err); // DEV
  });
}

async function _runTick() {
  if (!_repo) return;

  const now      = Date.now();
  const billings = await _repo.list('billing', null).catch(() => []);
  const customers = await _repo.list('customers', null).catch(() => []);

  const custMap = new Map(customers.map((c) => [c.id, c]));

  // group unpaid billing by customer_id
  const byCustomer = new Map();
  for (const b of billings) {
    if (b.status === 'Paid' || b._deleted) continue;
    const cid = b.customer_id || b.customer || '';
    if (!byCustomer.has(cid)) byCustomer.set(cid, []);
    byCustomer.get(cid).push(b);
  }

  for (const [customerId, custBillings] of byCustomer) {
    const customer        = custMap.get(customerId) || { id: customerId };
    const thresholdOverride = customer.dunning_threshold_days_override
      ? _buildOverride(customer.dunning_threshold_days_override)
      : null;

    // compute worst-case days for customer
    const maxDays = custBillings.reduce((max, b) => {
      const inv = b.invoice_date || b.InvoiceDate;
      if (!inv) return max;
      const d = Math.floor((now - new Date(inv).getTime()) / 86_400_000);
      return d > max ? d : max;
    }, 0);

    const stage = classifyOverdue(maxDays, thresholdOverride);
    if (!stage) continue;

    // emit credit FSM cross-event via WASM bridge if applicable
    if (stage === BLACKLIST_THRESHOLD_STAGE) {
      _emitCreditEvent('BlacklistThresholdReached', customerId, maxDays);
    } else if (stage === OVERDUE_THRESHOLD_STAGE) {
      _emitCreditEvent('OverdueThresholdReached', customerId, maxDays);
    }

    // log dunning event (fire-and-forget)
    const billingIds = custBillings.map((b) => b.id || '').filter(Boolean);
    appendDunning({
      customer_id: customerId,
      stage,
      sent_at:     new Date().toISOString(),
      channel:     'scheduler',
      sent_by:     'system',
      template_id: '',
      billing_ids: billingIds,
    });

    // notify UI
    window.dispatchEvent(new CustomEvent('vdg:dunning-staged', {
      detail: { customer_id: customerId, stage, days_overdue: maxDays, billing_ids: billingIds },
    }));
  }

  localStorage.setItem(DUNNING_LS_KEY, String(now));
}

function _buildOverride(overrideDays) {
  // customer has a single threshold override for the reminder_1 rung
  return { reminder_1: overrideDays };
}

function _emitCreditEvent(eventName, customerId, daysOverdue) {
  const wasm = window.__vdg_wasm;
  if (!wasm?.dispatch_credit_event) return;
  try {
    wasm.dispatch_credit_event(customerId, eventName, daysOverdue, Date.now());
  } catch (err) {
    console.warn('[dunning-scheduler] credit FSM emit failed:', err); // DEV
  }
}
