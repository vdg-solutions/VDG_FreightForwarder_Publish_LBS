// ledger-repost-panel.js — F-29-24: manager-only stale-ledger repost trigger.
// Mounted only when hasRole(ROLE_MANAGER) (checked by the caller, ledger-viewer.js) — mirrors
// views/manager/masters/shipment-states.js's canWrite()-gated migration section.

import { t } from '../../i18n/index.js';
import { planRepost, applyRepost, purgeOrphans } from '../../operators/manager/ledger-repost.js';
import { showConfirm } from '../../helpers/show-confirm.js';

const REPOST_YEAR = new Date().getFullYear();
const MAX_REASON_ROWS_SHOWN = 50; // D3: bound the flagged/orphan row list, never render unbounded
const REASON_KEY_PREFIX = 'ledger.repost.reason.'; // D2 rework: only reasons under this prefix are pre-keyed/localized

const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPE_MAP[c]);
}

function toast(type, message) {
  window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { type, message } }));
}

function fmtRunDate(runAt) { return runAt ? new Date(runAt).toLocaleDateString('vi-VN') : ''; }

function shellHtml() {
  return `
    <div class="border border-slate-200 rounded-lg p-4 bg-white">
      <div class="flex items-center justify-between flex-wrap gap-3 mb-2">
        <div id="repost-status" class="text-xs text-slate-600"></div>
        <div class="flex gap-2">
          <button id="btn-repost-preview"
            class="px-3 py-1.5 text-xs rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100"
            aria-label="${t('ledger.repost.preview_button')}">${t('ledger.repost.preview_button')}</button>
          <button id="btn-repost-apply" disabled
            class="px-3 py-1.5 text-xs rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-40"
            aria-label="${t('ledger.repost.button')}">${t('ledger.repost.button')}</button>
          <button id="btn-purge-orphans" disabled
            class="px-3 py-1.5 text-xs rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-40"
            aria-label="${t('ledger.repost.purge_button')}">${t('ledger.repost.purge_button')}</button>
        </div>
      </div>
      <div id="repost-preview-list" class="text-xs"></div>
    </div>`;
}

// D2 rework: a reason is only rendered verbatim through t() when it's one of the pre-keyed
// static reasons (ledger.repost.reason.*). Everything else (raw err.message, or the dynamic
// "no posting rule matched for kind ..." string from ledger-repost.js) is a diagnostic, not a
// translatable label — render the shared localized generic reason instead, keeping the raw
// diagnostic available to devs only via title="" (not visible body text).
function reasonRowHtml(r) {
  const isKeyedReason = r.reason.startsWith(REASON_KEY_PREFIX);
  const reasonText  = isKeyedReason ? t(r.reason) : t('ledger.repost.reason.other');
  const titleAttr   = isKeyedReason ? '' : ` title="${escapeHtml(r.reason)}"`;
  return `
          <div class="px-2 py-1 font-mono text-amber-900 flex justify-between gap-2"${titleAttr}>
            <span class="font-bold">${r.entry_id}</span>
            <span class="font-sans text-amber-700/80 text-right">${reasonText}</span>
          </div>`;
}

function reasonRowsHtml(label, rows) {
  if (!rows.length) return '';
  const shown    = rows.slice(0, MAX_REASON_ROWS_SHOWN);
  const overflow = rows.length - shown.length;
  return `
    <div class="mt-2">
      <div class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">${label} (${rows.length})</div>
      <div class="border border-amber-200 bg-amber-50 rounded-lg p-2 flex flex-col gap-1">
        ${shown.map(reasonRowHtml).join('')}
        ${overflow > 0 ? `
          <div class="px-2 py-1 text-amber-700/70 italic">${t('ledger.repost.and_more', { n: String(overflow) })}</div>` : ''}
      </div>
    </div>`;
}

function renderPreview(root, plan) {
  const list = root.querySelector('#repost-preview-list');
  const applyBtn = root.querySelector('#btn-repost-apply');
  const purgeBtn = root.querySelector('#btn-purge-orphans');
  if (!plan) { list.innerHTML = ''; applyBtn.disabled = true; purgeBtn.disabled = true; return; }

  const total = plan.replacements.length + plan.unchanged_count + plan.flagged.length + plan.orphans.length;
  applyBtn.disabled = plan.replacements.length === 0;
  // Orphans only. `flagged` entries still have a live source — those are a repost problem.
  purgeBtn.disabled = plan.orphans.length === 0;

  if (!total) { list.innerHTML = `<div class="text-slate-400">${t('ledger.repost.none_found')}</div>`; return; }

  list.innerHTML = `
    <div class="text-slate-600">${t('ledger.repost.result', {
      replaced:  String(plan.replacements.length),
      unchanged: String(plan.unchanged_count),
      flagged:   String(plan.flagged.length),
    })}</div>
    ${reasonRowsHtml(t('ledger.repost.flagged_label'), plan.flagged)}
    ${reasonRowsHtml(t('ledger.repost.orphans_label'), plan.orphans)}`;
}

function renderStatus(root, lastRepost) {
  const status = root.querySelector('#repost-status');
  status.textContent = lastRepost
    ? `${fmtRunDate(lastRepost.run_at)} — ${t('ledger.repost.result', {
        replaced: String(lastRepost.replaced), unchanged: String(lastRepost.left_unchanged), flagged: String(lastRepost.flagged),
      })}`
    : '';
}

export async function mountRepostPanel(root, { ledgerRepo, entityRepo }) {
  root.innerHTML = shellHtml();
  let lastPlan = null;

  async function runPreview() {
    const btn  = root.querySelector('#btn-repost-preview');
    const list = root.querySelector('#repost-preview-list');
    btn.disabled = true;
    if (list) list.innerHTML = `<div class="text-slate-400">${t('ledger.repost.running')}</div>`;
    try {
      lastPlan = await planRepost(entityRepo, ledgerRepo, REPOST_YEAR);
      renderPreview(root, lastPlan);
    } catch (err) {
      console.error('[ledger-repost-panel] preview failed:', err); // DEV
      // D1: actionable fallback, not a silent hang — error stays visible in-panel and the
      // preview button re-enables so the manager can retry.
      if (list) list.innerHTML = `<div class="text-rose-600">${t('ledger.repost.error')}</div>`;
      toast('error', t('ledger.repost.error'));
    } finally {
      btn.disabled = false;
    }
  }

  root.querySelector('#btn-repost-preview').addEventListener('click', runPreview);

  root.querySelector('#btn-repost-apply').addEventListener('click', async () => {
    if (!lastPlan || !lastPlan.replacements.length) return;
    const ok = await showConfirm({
      title: t('ledger.repost.confirm_title'),
      body:  t('ledger.repost.confirm_body', { n: String(lastPlan.replacements.length) }),
      confirmLabel: t('ledger.repost.button'),
    });
    if (!ok) return;

    const previewBtn = root.querySelector('#btn-repost-preview');
    const applyBtn    = root.querySelector('#btn-repost-apply');
    previewBtn.disabled = true;
    applyBtn.disabled    = true;
    try {
      const record = await applyRepost(ledgerRepo, lastPlan);
      renderStatus(root, record);
      toast('success', t('ledger.repost.result', {
        replaced: String(record.replaced), unchanged: String(record.left_unchanged), flagged: String(record.flagged),
      }));
      await runPreview(); // re-run to show the now-converged (idempotent) state
    } catch (err) {
      console.error('[ledger-repost-panel] apply failed:', err); // DEV
      toast('error', t('ledger.repost.error'));
    } finally {
      previewBtn.disabled = false;
    }
  });

  root.querySelector('#btn-purge-orphans').addEventListener('click', async () => {
    if (!lastPlan || !lastPlan.orphans.length) return;
    const ok = await showConfirm({
      title: t('ledger.repost.purge_confirm_title'),
      body:  t('ledger.repost.purge_confirm_body', { n: String(lastPlan.orphans.length) }),
      confirmLabel: t('ledger.repost.purge_button'),
      destructive: true,
    });
    if (!ok) return;

    const purgeBtn = root.querySelector('#btn-purge-orphans');
    purgeBtn.disabled = true;
    try {
      const record = await purgeOrphans(ledgerRepo, lastPlan, REPOST_YEAR);
      toast(record.failed ? 'error' : 'success', t('ledger.repost.purge_result', {
        purged: String(record.purged), failed: String(record.failed),
      }));
      await runPreview(); // orphan list must come back empty, or the purge did not do what it said
    } catch (err) {
      console.error('[ledger-repost-panel] purge failed:', err); // DEV
      toast('error', t('ledger.repost.error'));
      purgeBtn.disabled = false;
    }
  });

  // D1 root-cause fix: the panel must mount and return immediately — this call used to
  // `await runPreview()` here, which blocks the CALLER (ledger-viewer.js render()) past its
  // 5s view-load watchdog on any real (non-empty) ledger (planRepost measured 7.8s live).
  // Status + preview now run in the background after mount, never blocking the ledger view;
  // runPreview() shows its own in-panel loading state and an actionable error fallback.
  ledgerRepo.getLastRepost()
    .then((lastRepost) => renderStatus(root, lastRepost))
    .catch((err) => console.error('[ledger-repost-panel] getLastRepost failed:', err)) // DEV
    .finally(() => runPreview()); // read-only, zero writes — safe to auto-run (AC-04)
}
