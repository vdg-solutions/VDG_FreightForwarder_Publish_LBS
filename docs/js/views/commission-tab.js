// commission-tab.js — per-shipment commission entries with override audit


const KIND_COMMISSION_ENTRY = 'commission_entry';

function fmtNum(n) {
  return Number(n ?? 0).toLocaleString('vi-VN');
}

function overrideAuditHtml(entry) {
  const by     = entry.created_by || '—';
  const reason = entry.remark    || '—';
  return `
    <div class="col-span-3 mt-1 text-[10px] text-amber-700 bg-amber-50 rounded px-2 py-1">
      Override · by <strong>${by}</strong> · reason: ${reason}
    </div>`;
}

function rowHtml(entry) {
  const isOverride = entry.source === 'Override';
  const badge = isOverride
    ? `<span class="px-1.5 py-0.5 rounded text-[9px] bg-amber-100 text-amber-700 font-medium">Override</span>`
    : `<span class="px-1.5 py-0.5 rounded text-[9px] bg-slate-100 text-slate-500">Rule</span>`;
  const ruleInfo = entry.rule_applied
    ? `<span class="text-[10px] text-slate-400">Rule: ${entry.rule_applied}</span>`
    : '';

  return `
    <div class="grid grid-cols-3 gap-2 text-xs py-2 border-b border-slate-100 last:border-none">
      <div>
        <div class="font-medium text-slate-800">${entry.kind || '—'}</div>
        <div class="text-[10px] text-slate-400">${entry.recipient || '—'}</div>
      </div>
      <div class="text-right">
        <div class="font-mono text-slate-700">${fmtNum(entry.gross_amount)}</div>
        ${ruleInfo}
      </div>
      <div class="flex justify-end items-start gap-1">
        ${badge}
      </div>
      ${isOverride ? overrideAuditHtml(entry) : ''}
    </div>`;
}

/**
 * @param {HTMLElement} root
 * @param {string} shipmentRef
 * @param {object} repo
 */
export async function renderCommissionTab(root, shipmentRef, repo) {
  if (!root) return;
  root.innerHTML = `<p class="text-xs text-slate-400">Loading…</p>`;

  let entries = [];
  try {
    const all = await repo.list(KIND_COMMISSION_ENTRY, null);
    entries = (all || []).filter((e) => e.shipment_ref === shipmentRef);
  } catch (err) {
    root.innerHTML = `<p class="text-xs text-red-500">Failed to load commission entries.</p>`;
    console.error('[commission-tab] list failed:', err); // DEV
    return;
  }

  if (!entries.length) {
    root.innerHTML = `<p class="text-xs text-slate-400">No commission entries for this shipment.</p>`;
    return;
  }

  root.innerHTML = `
    <div class="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">Commission</div>
    <div>${entries.map(rowHtml).join('')}</div>`;
}
