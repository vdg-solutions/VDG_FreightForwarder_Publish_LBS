// audit-changes.js — E-37 (F-37-02). Rendering for the per-field history on an audit entry.
//
// Split out of audit.js so the shipment screen can show the same thing without importing the whole
// manager grid, and so the two never drift into describing the same entry differently.
//
// Nothing here decides what may be shown. The entry arrived from the store whose readers were
// already settled by the folder ACL — a reader holding a revenue entry was granted that fork. This
// module only formats what it was handed.

import { t } from '../../../../kernel/core_abstractions/i18n/index.js';
import { verifyAuditChain } from '../../../core_abstractions/ports/sync/audit-log.js';

const INLINE_LIMIT = 3;      // fields named in the cell; the rest are in the tooltip
const VALUE_MAX    = 40;     // a pasted address should not stretch the column

/** `null` and `""` are different answers — a cleared field and an empty one read the same
 *  otherwise, and "who blanked this" is exactly the question a blame trail is asked. */
function showValue(value) {
  if (value === null || value === undefined) return '—';
  if (value === '') return '""';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return text.length > VALUE_MAX ? `${text.slice(0, VALUE_MAX)}…` : text;
}

export function changeLine(change) {
  return `${change.field}: ${showValue(change.from)} → ${showValue(change.to)}`;
}

/**
 * One line per change, for a tooltip or a detail panel.
 * An entry with `changes: []` says "we looked and nothing user-visible moved" — different from an
 * entry written before diffing existed, which has no `changes` key at all.
 */
export function changeLines(entry) {
  if (!Array.isArray(entry?.changes)) return [t('audit.changes.not_recorded')];
  if (!entry.changes.length) return [t('audit.changes.none')];
  return entry.changes.map(changeLine);
}

export function changeSummary(entry) {
  if (!Array.isArray(entry?.changes)) return t('audit.changes.not_recorded');
  const { changes } = entry;
  if (!changes.length) return t('audit.changes.none');
  const named = changes.slice(0, INLINE_LIMIT).map((c) => c.field).join(', ');
  return changes.length > INLINE_LIMIT
    ? t('audit.changes.more', { fields: named, count: changes.length - INLINE_LIMIT })
    : named;
}

const CHAIN_OK_CLASS     = 'text-xs text-slate-400';
const CHAIN_BROKEN_CLASS = 'text-xs text-rose-700 font-medium';

/**
 * Say out loud whether the trail still hangs together.
 *
 * Everyone who can write a shipment can write this folder — Drive grants a folder, not an
 * operation — so "nobody tampered with it" is a claim, and a claim has to be checked to be worth
 * anything. A failure to CHECK is reported as its own state: unknown is not clean.
 */
export async function renderChainStatus(el, rows) {
  if (!el) return;
  el.className = CHAIN_OK_CLASS;
  let problems;
  try {
    problems = await verifyAuditChain(rows);
  } catch (err) {
    console.error('[audit] chain check failed:', err); // DEV
    el.textContent = t('audit.chain.unknown');
    return;
  }
  if (!problems.length) {
    el.textContent = t('audit.chain.ok');
    return;
  }
  el.className   = CHAIN_BROKEN_CLASS;
  el.textContent = t('audit.chain.broken', { count: problems.length });
  el.title       = problems.map((p) => `${p.actor} · ${p.id} · ${p.problem}`).join('\n');
}

/** ag-grid cellRenderer. textContent, never innerHTML: field names and values are user data. */
export function changesCell({ data }) {
  const span = document.createElement('span');
  span.className   = 'text-xs';
  span.textContent = changeSummary(data);
  span.title       = changeLines(data).join('\n');
  return span;
}
