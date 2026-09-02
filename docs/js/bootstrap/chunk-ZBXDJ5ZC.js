import {
  currentUserId
} from "./chunk-M3ODLRBG.js";
import {
  saveMaster
} from "./chunk-NRZYXZMH.js";
import {
  showConfirm
} from "./chunk-HKNQBDY4.js";
import {
  t
} from "./chunk-5L442NSS.js";

// output/web/js.tmp/implementations/ui/bootstrap/views/manager/masters/priced-governance-panel.js
var TOAST_MS = 4e3;
var PROPOSAL_KEEP = "keep-mine";
var PROPOSAL_USE = "use-theirs";
function escHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function toast(message, type = "success") {
  window.dispatchEvent(new CustomEvent("vdg:toast", { detail: { type, message, duration: TOAST_MS } }));
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
  const rows = keys.map((k) => diffRowHtml(k, currentRecord?.[k], proposal.diff[k])).join("");
  return `
    <div class="border border-slate-200 rounded-lg p-3 mb-3" data-proposal-id="${escHtml(proposal.proposal_id)}">
      <div class="text-[10px] text-slate-400 mb-2">${escHtml(proposal.record_id)} \u2014 ${escHtml(proposal.author_user)} (${escHtml(proposal.author)})</div>
      <table class="w-full mb-2">
        <thead><tr class="text-[9px] uppercase text-slate-400">
          <th class="text-left py-1 px-2"></th>
          <th class="text-left py-1 px-2">${t("priced.diff.current")}</th>
          <th class="text-left py-1 px-2">${t("priced.diff.proposed")}</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="flex gap-2">
        <button class="btn-pgp-approve px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
                data-id="${escHtml(proposal.proposal_id)}">${t("priced.action.approve")}</button>
        <button class="btn-pgp-reject px-3 py-1.5 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50"
                data-id="${escHtml(proposal.proposal_id)}">${t("priced.action.reject")}</button>
      </div>
    </div>`;
}
function createPricedGovernancePanel({ pricedRepo, refName, role, secondEyes = false }) {
  let isMaintainer = false;
  try {
    const permissionCanMerge = window.permission_can_merge ?? window.__vdg_wasm?.permission_can_merge;
    isMaintainer = !!permissionCanMerge?.(role, refName);
  } catch {
  }
  const canWriteDirect = !secondEyes && isMaintainer;
  function primaryActionLabel() {
    return canWriteDirect ? t("common.action.save") : t("priced.action.propose");
  }
  async function assertWritable(recordId, body) {
    try {
      await pricedRepo.assertNoOverlapAgainstRef(recordId, body);
    } catch (err) {
      console.error("[priced-governance-panel] write refused:", err.message);
      toast(t("priced.overlap.denied"), "error");
      throw err;
    }
  }
  async function commit(recordId, entity) {
    await assertWritable(recordId, entity);
    if (canWriteDirect) {
      await saveMaster(refName, entity);
      return { routed: "direct" };
    }
    await submitProposal(recordId, entity);
    return { routed: "proposal" };
  }
  async function submitProposal(recordId, body) {
    await assertWritable(recordId, body);
    const dto = await pricedRepo.propose(recordId, body, role, currentUserId());
    toast(t("priced.pending.not_saved"));
    return dto;
  }
  async function _renderMaintainerView(containerEl, onChanged) {
    const [pending, refState] = await Promise.all([pricedRepo.listPending(), pricedRepo.getRefState()]);
    if (!pending.length) {
      containerEl.innerHTML = `<div class="text-xs text-slate-400 py-3">${t("priced.pending.empty")}</div>`;
      return;
    }
    containerEl.innerHTML = `
      <div class="text-xs font-semibold text-slate-700 mb-2">${t("priced.pending.title")}</div>
      ${pending.map((p) => proposalCardHtml(p, refState.records?.[p.record_id])).join("")}`;
    containerEl.querySelectorAll(".btn-pgp-approve").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const result = await pricedRepo.merge(btn.dataset.id, role, currentUserId());
        await _upsertMergedRecord(result);
        await onChanged?.();
      });
    });
    containerEl.querySelectorAll(".btn-pgp-reject").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const result = await showConfirm({
          title: t("priced.reject.reason_prompt"),
          confirmLabel: t("priced.action.reject"),
          cancelLabel: t("common.action.cancel"),
          destructive: true,
          reasonField: true
        });
        if (!result?.confirmed) return;
        try {
          await pricedRepo.reject(btn.dataset.id, role, currentUserId(), result.reason);
          await onChanged?.();
        } catch (err) {
          console.error("[priced-governance-panel] reject failed:", err.message);
          toast(t("priced.reject.failed"), "error");
        }
      });
    });
  }
  async function _upsertMergedRecord(mergeResult) {
    const recordId = mergeResult?.proposal?.record_id;
    const merged = recordId ? mergeResult.ref_state?.records?.[recordId] : null;
    if (merged) await saveMaster(refName, merged);
  }
  async function _renderProposerBanner(containerEl) {
    const pending = await pricedRepo.listPending();
    const mine = pending.filter((p) => p.author_user === currentUserId());
    containerEl.innerHTML = mine.length ? `<div class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">${t("priced.pending.proposer_banner", { n: mine.length })}</div>` : "";
  }
  async function renderPendingPanel(containerEl, onChanged) {
    if (isMaintainer) {
      await _renderMaintainerView(containerEl, onChanged);
      return;
    }
    await _renderProposerBanner(containerEl);
  }
  return { isMaintainer, canWriteDirect, primaryActionLabel, submitProposal, renderPendingPanel, assertWritable, commit };
}

export {
  createPricedGovernancePanel
};
