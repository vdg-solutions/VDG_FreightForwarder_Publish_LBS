// suggestions-banner.js — pattern-detect + promote-to-rule CTA

import { t } from '../../../i18n/index.js';

const KIND_COMMISSION_ENTRY  = 'commission_entry';
const KIND_COMMISSION_RULES  = 'commission_rules';
const PATTERN_THRESHOLD      = 3;
const SESSION_DISMISS_PREFIX = 'vdg_commission_suggest_dismissed_';
const DEFAULT_PROMOTE_PRIORITY = 5;

function groupKey(pct, recipient, kind) {
  return `${pct}|${recipient}|${kind}`;
}

function buildGroups(entries) {
  const map = new Map();
  for (const e of entries) {
    if (e.source !== 'Override') continue;
    if (e.commission_pct == null || !e.recipient) continue;
    const key = groupKey(e.commission_pct, e.recipient, e.kind || '');
    const cur = map.get(key) || { pct: e.commission_pct, recipient: e.recipient, kind: e.kind, count: 0 };
    cur.count++;
    map.set(key, cur);
  }
  return map;
}

function autoSlug(recipient) {
  return recipient.toLowerCase().replace(/\s+/g, '-');
}

function bannerHtml(gk, pattern, count, priority) {
  const msg = t('commission.suggest_promote')
    .replace('{pattern}', pattern)
    .replace('{count}', count);
  return `
    <div class="commission-suggest-banner flex items-center justify-between gap-3
      px-4 py-3 rounded-lg border border-blue-200 bg-blue-50 mb-3"
      data-gk="${gk}">
      <span class="text-xs text-blue-800">${msg}</span>
      <div class="flex items-center gap-2 shrink-0">
        <label class="text-[10px] text-slate-500">Priority</label>
        <input type="number" class="banner-priority w-12 border border-slate-200 rounded px-1 py-0.5 text-xs"
          value="${priority}" min="0" max="999" />
        <button type="button" class="banner-promote
          px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
          ${t('commission.create_rule')}
        </button>
        <button type="button" class="banner-dismiss
          px-2 py-1 text-xs text-slate-500 hover:text-slate-800">✕</button>
      </div>
    </div>`;
}

async function createRule(repo, pct, recipient, kind, priority) {
  const pctDisplay = Math.round(pct * 100);
  const companyPct = 1 - pct;
  const ruleId = `auto-flat-${pctDisplay}-${autoSlug(recipient)}`;
  const rule = {
    rule_id:        ruleId,
    name:           `Flat ${pctDisplay}% to ${recipient}`,
    applies_to:     [],
    when:           ['Always'],
    split_strategy: { Flat: { sales_pct: pct, company_pct: companyPct } },
    priority,
    kind_hint:      kind || null,
  };
  await repo.put(KIND_COMMISSION_RULES, ruleId, rule);
  window.dispatchEvent(new CustomEvent('vdg:entity-changed', {
    detail: { kind: KIND_COMMISSION_RULES },
  }));
}

/**
 * @param {HTMLElement} container  target element
 * @param {object} repo            CachedEntityRepo
 */
export async function renderSuggestionsBanner(container, repo) {
  if (!container || !repo) return;
  container.innerHTML = '';

  let allEntries;
  try {
    allEntries = await repo.list(KIND_COMMISSION_ENTRY, null);
  } catch (err) {
    console.warn('[suggestions-banner] list failed:', err); // DEV
    return;
  }

  const groups = buildGroups(allEntries || []);

  for (const [gk, { pct, recipient, kind, count }] of groups) {
    if (count < PATTERN_THRESHOLD) continue;
    if (sessionStorage.getItem(SESSION_DISMISS_PREFIX + gk)) continue;

    const pctDisplay = Math.round(pct * 100);
    const pattern    = `Flat ${pctDisplay}% to ${recipient}`;
    const tmp        = document.createElement('div');
    tmp.innerHTML    = bannerHtml(gk, pattern, count, DEFAULT_PROMOTE_PRIORITY);
    const banner     = tmp.firstElementChild;
    container.appendChild(banner);

    banner.querySelector('.banner-dismiss')?.addEventListener('click', () => {
      sessionStorage.setItem(SESSION_DISMISS_PREFIX + gk, '1');
      banner.remove();
    });

    banner.querySelector('.banner-promote')?.addEventListener('click', async () => {
      const pri = parseInt(banner.querySelector('.banner-priority')?.value, 10);
      const safePri = isNaN(pri) ? DEFAULT_PROMOTE_PRIORITY : pri;
      try {
        await createRule(repo, pct, recipient, kind, safePri);
        banner.remove();
      } catch (err) {
        console.error('[suggestions-banner] createRule failed:', err); // DEV
      }
    });
  }
}
