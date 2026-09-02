// suggestions-banner.js — shows the repeated manual overrides wasm found, and promotes one.
//
// This file used to hold the whole detection: it grouped commission entries by
// (pct, recipient, kind), decided that three of a kind is a pattern, spelled the rule id
// `auto-flat-{pct}-{slug}`, named the rule and built its `Flat { sales_pct, company_pct }` split.
// That is the commission-rule FORMAT authored in a view file, next to the markup. All of it lives
// in `operators/data/report_reads/commission.rs` now; what is left here is the banner.

import { t } from '../../../../../kernel/core_abstractions/i18n/index.js';
import { commissionRuleSuggestions, promoteCommissionSuggestion }
  from '../../../../core_abstractions/ports/data/report-reads.js';

const SESSION_DISMISS_PREFIX = 'vdg_commission_suggest_dismissed_';
const DEFAULT_PROMOTE_PRIORITY = 5;
/// vdg:entity-changed topic the promote announces on — an event name, not a read.
const KIND_COMMISSION_RULES = 'commission_rules';

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
        <label class="text-[10px] text-slate-500">${t('commission.suggest.priority')}</label>
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

/**
 * @param {HTMLElement} container  target element
 */
export async function renderSuggestionsBanner(container) {
  if (!container) return;
  container.innerHTML = '';

  let suggestions;
  try {
    suggestions = await commissionRuleSuggestions();
  } catch (err) {
    console.warn('[suggestions-banner] read failed:', err); // DEV
    return;
  }

  for (const s of suggestions) {
    if (sessionStorage.getItem(SESSION_DISMISS_PREFIX + s.key)) continue;

    const tmp     = document.createElement('div');
    tmp.innerHTML = bannerHtml(s.key, s.pattern, s.count, DEFAULT_PROMOTE_PRIORITY);
    const banner  = tmp.firstElementChild;
    container.appendChild(banner);

    banner.querySelector('.banner-dismiss')?.addEventListener('click', () => {
      sessionStorage.setItem(SESSION_DISMISS_PREFIX + s.key, '1');
      banner.remove();
    });

    banner.querySelector('.banner-promote')?.addEventListener('click', async () => {
      const pri     = parseInt(banner.querySelector('.banner-priority')?.value, 10);
      const safePri = isNaN(pri) ? DEFAULT_PROMOTE_PRIORITY : pri;
      try {
        await promoteCommissionSuggestion({
          salesPct: s.salesPct, recipient: s.recipient, kind: s.kind, priority: safePri,
        });
        window.dispatchEvent(new CustomEvent('vdg:entity-changed', {
          detail: { kind: KIND_COMMISSION_RULES },
        }));
        banner.remove();
      } catch (err) {
        console.error('[suggestions-banner] promote failed:', err); // DEV
      }
    });
  }
}
