// action-bar.js — the shipment form's action buttons, split out of sales-new-form.js at the
// 350-line cap (same move validate-shipment-form.js made).
//
// It decides NOTHING. Which actions exist is `rulesets::shipment_action_bar` in wasm; this maps
// the verdict's `kind` to a status chip and its `actions` to buttons. The version this replaced
// held the decision itself — `if (publishState === 'published')` returning an action bar with one
// DISABLED badge in it, so a published job rendered every field editable and offered no way to
// save. See the Rust module for why a published job gets exactly one action and never a plain save.

import { t } from '../../../../kernel/core_abstractions/i18n/index.js';

const wasm = () => globalThis.window?.__vdg_wasm || globalThis.__vdg_wasm;

// kind -> the status chip shown beside the buttons. Display only; a kind with no chip shows none.
const CHIP = {
  published:  { cls: 'bg-emerald-100 text-emerald-800', key: 'published' },
  publishing: { cls: 'bg-blue-100 text-blue-800',       key: 'publishing' },
};

const EMPHASIS_CLS = {
  primary:   'px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg',
  secondary: 'px-4 py-2 border border-slate-300 text-sm text-slate-700 rounded-lg hover:bg-slate-50',
};

function chipHtml(kind) {
  const chip = CHIP[kind];
  if (!chip) return '';
  return `<span class="px-4 py-2 ${chip.cls} text-sm font-medium rounded-lg flex items-center">
      ${t(`sales_new.action.${chip.key}`)}
    </span>`;
}

function buttonHtml(action) {
  // `intent` is the submit intent verbatim (sales-new.js reads data-intent); `label` is an i18n
  // key suffix. They are carried separately so the shell never infers one from the other -- the
  // amend button's intent IS 'publish' while its wording is not.
  const cls = EMPHASIS_CLS[action.emphasis] || EMPHASIS_CLS.secondary;
  return `<button type="submit" data-intent="${action.intent}" id="ni-${action.label}-btn" class="${cls}">
      ${t(`sales_new.action.${action.label}`)}
    </button>`;
}

export function renderActionBar(publishState) {
  const mod = wasm();
  if (typeof mod?.shipment_action_bar !== 'function') {
    throw new Error('action-bar: wasm not ready — shipment_action_bar missing');
  }
  const bar = mod.shipment_action_bar(publishState || '');
  const buttons = bar.actions.map(buttonHtml).join('');
  return `<div class="flex gap-3 pt-2 items-center">${chipHtml(bar.kind)}${buttons}</div>`;
}
