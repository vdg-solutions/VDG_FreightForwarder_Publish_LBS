// F-15-12 — Dunning ladder pure functions

import { DUNNING_LADDER_DAYS, DUNNING_DEFAULT_TEMPLATES } from './dunning-constants.js';

// stage keys in order of severity
const STAGE_ORDER = ['reminder_1', 'reminder_2', 'escalate', 'legal', 'blacklist'];

/**
 * Returns the dunning stage for a given days_overdue.
 * @param {number} days
 * @param {Partial<typeof DUNNING_LADDER_DAYS>|null} thresholdOverride
 * @returns {string|null} stage key or null (not yet overdue)
 */
export function classifyOverdue(days, thresholdOverride) {
  const ladder = thresholdOverride
    ? { ...DUNNING_LADDER_DAYS, ...thresholdOverride }
    : DUNNING_LADDER_DAYS;

  let result = null;
  for (const stage of STAGE_ORDER) {
    if (days >= ladder[stage]) result = stage;
  }
  return result;
}

/**
 * Pick the best template for a stage + locale.
 * @param {string} stage — 'reminder_1' | 'reminder_2' | 'escalate' | 'legal' | 'blacklist'
 * @param {string} locale — 'vi' | 'en'
 * @param {object[]} customTemplates — templates from dunning_templates master kind
 * @returns {{ subject: string, body: string }}
 */
export function pickTemplate(stage, locale, customTemplates) {
  if (customTemplates?.length) {
    const match = customTemplates.find(
      (t) => t.stage === stage && t.locale === locale && !t._deleted,
    );
    if (match) return { subject: match.subject, body: match.body };
  }

  // map escalate/legal/blacklist → final default
  const defaultKey = ['escalate', 'legal', 'blacklist'].includes(stage) ? 'final'
    : stage === 'reminder_2' ? 'firm'
    : 'gentle';

  const tmpl = DUNNING_DEFAULT_TEMPLATES[defaultKey];
  return tmpl?.[locale] || tmpl?.vi || { subject: '', body: '' };
}

/**
 * Merge template placeholders with customer + billing context.
 * @param {{ subject: string, body: string }} template
 * @param {{ name: string, email?: string }} customer
 * @param {object[]} billings
 * @returns {{ subject: string, body: string }}
 */
export function mergeFields(template, customer, billings) {
  const totalOutstanding = billings.reduce((sum, b) => sum + Number(b.amount_vnd ?? b.AmountVnd ?? 0), 0);
  const latestDue        = billings.reduce((max, b) => {
    const inv = b.invoice_date || b.InvoiceDate;
    if (!inv) return max;
    const d = new Date(inv).getTime();
    return d > max ? d : max;
  }, 0);
  const daysOverdue = latestDue
    ? Math.floor((Date.now() - latestDue) / 86_400_000)
    : 0;
  const invoiceList = billings.map((b) => b.invoice_no || b.id || '').filter(Boolean).join(', ');

  const replace = (s) => s
    .replace(/\{customer_name\}/g, customer?.name || '')
    .replace(/\{total_outstanding\}/g, totalOutstanding.toLocaleString('vi-VN'))
    .replace(/\{days_overdue\}/g,     String(daysOverdue))
    .replace(/\{invoice_list\}/g,     invoiceList);

  return {
    subject: replace(template.subject),
    body:    replace(template.body),
  };
}
