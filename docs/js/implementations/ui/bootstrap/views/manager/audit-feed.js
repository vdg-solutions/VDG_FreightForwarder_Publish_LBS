// audit-feed.js — dashboard activity feed HTML, split out of audit.js (350-line cap).

import { t } from '../../../../kernel/core_abstractions/i18n/index.js';
import { relTime } from '../../../../kernel/core_abstractions/util/rel-time.js';

const ACTIVITY_FEED_MAX = 20;

/**
 * @param {object[]} entries
 * @returns {string}
 */
export function buildFeedHtml(entries) {
  if (!entries.length) return `<li class="py-2 text-xs text-slate-400">${t('dashboard.activity.none')}</li>`;

  // group by entity
  const groups = new Map();
  for (const e of entries) {
    const key = `${e.entity_kind || e.kind}::${e.entity_id || e.id}`;
    (groups.get(key) || (() => { const a = []; groups.set(key, a); return a; })()).push(e);
  }

  const items = [...groups.values()].slice(0, ACTIVITY_FEED_MAX);
  return items.map((group) => {
    const first = group[0];
    const label = `${first.entity_kind || first.kind || '?'} ${first.entity_id || first.id || '?'}`;
    if (group.length === 1) {
      return `<li class="py-1.5 text-xs text-slate-600 border-b border-slate-50">
        ${relTime(first.created_at || first.ts)} — ${label} · ${first.event || first.op || '?'}
      </li>`;
    }
    return `<li class="py-1.5 text-xs border-b border-slate-50">
      <details>
        <summary class="cursor-pointer text-slate-600">${relTime(first.created_at || first.ts)} — ${label} · ${first.event || first.op || '?'}</summary>
        <ul class="pl-4 mt-1 space-y-0.5">
          ${group.slice(1).map((e) => `<li class="text-slate-500">${relTime(e.created_at || e.ts)} — ${e.event || e.op || '?'}</li>`).join('')}
          <li class="text-blue-500 text-[11px] cursor-pointer">${t('audit.feed.show_more', { n: group.length - 1 })}</li>
        </ul>
      </details>
    </li>`;
  }).join('');
}
