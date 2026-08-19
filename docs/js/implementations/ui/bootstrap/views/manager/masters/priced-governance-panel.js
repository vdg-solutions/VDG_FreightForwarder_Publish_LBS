// Shared propose/pending governance component — F-28-12 (E-28 sub-c).
// One factory drives BOTH local-charges and air-rates: (a) the direct-vs-propose routing
// derivation, (b) the Pending panel with a display-only keep-mine/use-theirs diff whose
// Approve/Reject act on the WHOLE proposal via PricedRefRepo (frozen whole-record merge FSM,
// F-28-04 §B — no per-field cherry-pick). Never writes state.json itself.

import { t } from '../../../../../kernel/core_abstractions/i18n/index.js';
import { currentUserId } from '../../../../../freight_app/operators/manager/route-guard.js';
import { showConfirm } from '../../../helpers/show-confirm.js';

const TOAST_MS      = 4_000;
const PROPOSAL_KEEP = 'keep-mine';
const PROPOSAL_USE  = 'use-theirs';

function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toast(message, type = 'success') {
  window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { type, message, duration: TOAST_MS } }));
}

function diffRowHtml(key, currentVal, proposedVal) {
  return `
    <tr class="border-b border-slate-100">
      <td class="py-1.5 px-2 text-[10px] font-mono text-slate-500">${escHtml(key)}</td>
      <td class="py-1.5 px-2 text-xs text-slate-600" data-diff="${PROPOSAL_KEEP}">${escHtml(currentVal)}</td>
      <td class="py-1.5 px-2 text-xs text-slate-900 font-medium" data-diff="${PROPOSAL_USE}">${escHtml(proposedVal)}</td>
    </tr>`;
}

function proposalCardHtml(proposal, currentRecord) {
  const keys = Object.keys(proposal.diff || {});
  const rows = keys.map((k) => diffRowHtml(k, currentRecord?.[k], proposal.diff[k])).join('');
  return `
    <div class="border border-slate-200 rounded-lg p-3 mb-3" data-proposal-id="${escHtml(proposal.proposal_id)}">
      <div class="text-[10px] text-slate-400 mb-2">${escHtml(proposal.record_id)} — ${escHtml(proposal.author_user)} (${escHtml(proposal.author)})</div>
      <table class="w-full mb-2">
        <thead><tr class="text-[9px] uppercase text-slate-400">
          <th class="text-left py-1 px-2"></th>
          <th class="text-left py-1 px-2">${t('priced.diff.current')}</th>
          <th class="text-left py-1 px-2">${t('priced.diff.proposed')}</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="flex gap-2">
        <button class="btn-pgp-approve px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
                data-id="${escHtml(proposal.proposal_id)}">${t('priced.action.approve')}</button>
        <button class="btn-pgp-reject px-3 py-1.5 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50"
                data-id="${escHtml(proposal.proposal_id)}">${t('priced.action.reject')}</button>
      </div>
    </div>`;
}

/// AC-01/02/03/05/06: role read by the host from window.__vdg_current_user.role
/// (currentUserRole()), never the private auth-gate resolvedRole (QA simulability).
/// `liveRepo` (optional, D-2) = window.__vdg_repo — lets Approve upsert the merged record
/// into the store the master table actually reads, keyed by `refName` (== the repo `KIND`).
export function createPricedGovernancePanel({ pricedRepo, refName, role, secondEyes = false, liveRepo = null }) {
  // Unknown/unprovisioned role (e.g. a viewer without a parseable Role variant) degrades to
  // non-maintainer rather than throwing — the panel must still render for a read-only visitor.
  // Belt-and-suspenders (D-1): fall back to window.__vdg_wasm.permission_can_merge, the same
  // seam PricedRefRepo reads, in case a boot path ever globalizes the wasm module without
  // running the window[name]=mod[name] loop again.
  let isMaintainer = false;
  try {
    const permissionCanMerge = window.permission_can_merge ?? window.__vdg_wasm?.permission_can_merge;
    isMaintainer = !!permissionCanMerge?.(role, refName);
  } catch { /* unparseable role -> treat as non-maintainer, never crash the master view */ }

  const canWriteDirect = !secondEyes && isMaintainer;

  function primaryActionLabel() {
    return canWriteDirect ? t('common.action.save') : t('priced.action.propose');
  }

  /// Two windows for one pricing key would make "the rate on this date" ambiguous, and the
  /// resolver has no tie-break — so the collision is refused at write time, where the person
  /// who caused it is still looking at the form.
  async function assertWritable(recordId, body) {
    try {
      await pricedRepo.assertNoOverlapAgainstRef(recordId, body);
    } catch (err) {
      // Rethrown, so the modal stays open on the form the user must fix — but toasted
      // first, because the raw wasm error envelope is not a sentence anyone can act on.
      console.error('[priced-governance-panel] write refused:', err.message); // DEV — user sees the toast
      toast(t('priced.overlap.denied'), 'error');
      throw err;
    }
  }

  /// THE write seam. Hosts call this and nothing else — they do not branch on canWriteDirect
  /// and then remember to guard the branch they took. That arrangement is what left the flag
  /// wired to one master and would leave the overlap check wired to one branch: a rule every
  /// caller must re-apply is a rule that holds until the next caller. `canWriteDirect` stays
  /// exported for the button LABEL, which is a display question, not a routing one.
  async function commit(recordId, entity) {
    await assertWritable(recordId, entity);
    if (canWriteDirect) {
      if (!liveRepo) throw new Error('priced panel: direct write with no liveRepo');
      await liveRepo.put(refName, recordId, entity);
      return { routed: 'direct' };
    }
    await submitProposal(recordId, entity);
    return { routed: 'proposal' };
  }

  /// AC-01: writes ONLY `_pending/{id}.json` (via PricedRefRepo) — never repo.put, never
  /// state.json. Toasts the "pending, not saved" affordance exactly once per submit.
  async function submitProposal(recordId, body) {
    await assertWritable(recordId, body);
    const dto = await pricedRepo.propose(recordId, body, role, currentUserId());
    toast(t('priced.pending.not_saved'));
    return dto;
  }

  async function _renderMaintainerView(containerEl, onChanged) {
    const [pending, refState] = await Promise.all([pricedRepo.listPending(), pricedRepo.getRefState()]);
    if (!pending.length) {
      containerEl.innerHTML = `<div class="text-xs text-slate-400 py-3">${t('priced.pending.empty')}</div>`;
      return;
    }
    containerEl.innerHTML = `
      <div class="text-xs font-semibold text-slate-700 mb-2">${t('priced.pending.title')}</div>
      ${pending.map((p) => proposalCardHtml(p, refState.records?.[p.record_id])).join('')}`;

    containerEl.querySelectorAll('.btn-pgp-approve').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const result = await pricedRepo.merge(btn.dataset.id, role, currentUserId());
        await _upsertMergedRecord(result);
        await onChanged?.();
      });
    });
    containerEl.querySelectorAll('.btn-pgp-reject').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const result = await showConfirm({
          title: t('priced.reject.reason_prompt'),
          confirmLabel: t('priced.action.reject'),
          cancelLabel: t('common.action.cancel'),
          destructive: true,
          reasonField: true,
        });
        if (!result?.confirmed) return;
        try {
          await pricedRepo.reject(btn.dataset.id, role, currentUserId(), result.reason);
          await onChanged?.();
        } catch (err) {
          console.error('[priced-governance-panel] reject failed:', err.message); // DEV — surfaced to user via toast below, not swallowed
          toast(t('priced.reject.failed'), 'error');
        }
      });
    });
  }

  /// D-2: the merge FSM writes the whole-record post-image to the governance
  /// state.json only — it never touches window.__vdg_repo, so the on-screen master
  /// table (which reads liveRepo, not the governance ref) would otherwise never show
  /// the approved row. Upsert it into the same store the table's own saveEntity uses.
  async function _upsertMergedRecord(mergeResult) {
    if (!liveRepo) return;
    const recordId = mergeResult?.proposal?.record_id;
    const merged   = recordId ? mergeResult.ref_state?.records?.[recordId] : null;
    if (merged) await liveRepo.put(refName, recordId, merged);
  }

  async function _renderProposerBanner(containerEl) {
    const pending = await pricedRepo.listPending();
    const mine = pending.filter((p) => p.author_user === currentUserId());
    containerEl.innerHTML = mine.length
      ? `<div class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">${t('priced.pending.proposer_banner', { n: mine.length })}</div>`
      : '';
  }

  /// AC-02/03: maintainer sees the diff + Approve/Reject; a proposer (writer, non-maintainer)
  /// sees only their own outstanding-count banner; anyone else sees nothing.
  async function renderPendingPanel(containerEl, onChanged) {
    if (isMaintainer) { await _renderMaintainerView(containerEl, onChanged); return; }
    await _renderProposerBanner(containerEl);
  }

  return { isMaintainer, canWriteDirect, primaryActionLabel, submitProposal, renderPendingPanel, assertWritable, commit };
}
