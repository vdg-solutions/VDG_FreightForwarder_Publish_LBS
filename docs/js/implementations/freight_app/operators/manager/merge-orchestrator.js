// Merge orchestrator — back-ref repoint for master entity merges

const BACK_REF_KINDS = ['quotations', 'shipment'];

// Fields on each kind that may hold the master entity ID
const BACK_REF_FIELDS = {
  customers: ['customer_id', 'customer', 'Customer'],
  carriers:  ['carrier_id', 'carrier',  'Carrier'],
  services:  ['service_id', 'service',  'Service'],
};

function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Returns { field, targetVal, sourceVal }[] for fields that differ
export function diffFields(target, source) {
  const keys = new Set([...Object.keys(target), ...Object.keys(source)]);
  const diffs = [];
  for (const k of keys) {
    if (k === 'id' || k.startsWith('_')) continue;
    if (String(target[k] ?? '') !== String(source[k] ?? '')) {
      diffs.push({ field: k, targetVal: target[k], sourceVal: source[k] });
    }
  }
  return diffs;
}

// Merge source into target: keep all target fields, fill nulls from source
export function mergeRecords(target, source) {
  const merged = { ...target };
  for (const k of Object.keys(source)) {
    if (k === 'id' || k.startsWith('_')) continue;
    if (merged[k] == null && source[k] != null) merged[k] = source[k];
  }
  return merged;
}

// Repoint back-refs in quotations + shipments from sourceId → targetId
// Returns count of updated records
export async function repointRefs(repo, masterKind, sourceId, targetId) {
  const fields = BACK_REF_FIELDS[masterKind] || [];
  if (!fields.length) return 0;

  let updated = 0;
  for (const refKind of BACK_REF_KINDS) {
    const items = await repo.list(refKind, null).catch(() => []);
    for (const item of items) {
      let dirty = false;
      const patch = { ...item };
      for (const f of fields) {
        if (patch[f] === sourceId) { patch[f] = targetId; dirty = true; }
      }
      if (dirty) {
        await repo.put(refKind, item.id, patch);
        updated++;
      }
    }
  }
  return updated;
}

// Build and show the merge modal — returns Promise that resolves when done/cancelled
export function openMergeModal(root, masterKind, items, onDone) {
  root.querySelector('#merge-modal')?.remove();

  const entityLabel = masterKind.slice(0, -1); // 'customers' → 'customer'
  const opts = items.map((e) => `<option value="${escHtml(e.id)}">${escHtml(e.name)} (${escHtml(e.id)})</option>`).join('');

  root.insertAdjacentHTML('beforeend', `
    <dialog id="merge-modal" class="rounded-xl border border-slate-200 shadow-xl p-6 w-full max-w-lg backdrop:bg-black/30">
      <div class="text-base font-semibold text-slate-900 mb-4">Merge ${masterKind}</div>
      <div class="space-y-3 mb-4 text-xs">
        <div>
          <label class="block font-medium text-slate-700 mb-1">Target (keep)</label>
          <select id="mg-target" class="w-full border rounded-lg px-3 py-2 text-sm">${opts}</select>
        </div>
        <div>
          <label class="block font-medium text-slate-700 mb-1">Source (delete)</label>
          <select id="mg-source" class="w-full border rounded-lg px-3 py-2 text-sm">${opts}</select>
        </div>
      </div>
      <div id="mg-diff" class="mb-4 text-xs space-y-1"></div>
      <div class="flex gap-3">
        <button id="btn-merge-confirm" class="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg">Merge</button>
        <button id="btn-merge-cancel" class="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">Cancel</button>
      </div>
    </dialog>`);

  const dialog   = root.querySelector('#merge-modal');
  const selTarget = dialog.querySelector('#mg-target');
  const selSource = dialog.querySelector('#mg-source');
  const diffEl   = dialog.querySelector('#mg-diff');

  // Default: first → target, second (or same) → source; prevent same selection
  if (items.length >= 2) selSource.selectedIndex = 1;

  function renderDiff() {
    const tId = selTarget.value;
    const sId = selSource.value;
    if (tId === sId) { diffEl.innerHTML = '<div class="text-red-600">Target and source must differ.</div>'; return; }
    const t = items.find((i) => i.id === tId);
    const s = items.find((i) => i.id === sId);
    if (!t || !s) return;
    const diffs = diffFields(t, s);
    if (!diffs.length) {
      diffEl.innerHTML = '<div class="text-slate-400">No field differences.</div>';
    } else {
      diffEl.innerHTML = `<div class="font-medium text-slate-700 mb-1">Field differences (target wins):</div>` +
        diffs.map((d) =>
          `<div class="grid grid-cols-3 gap-1 bg-slate-50 rounded px-2 py-1">
            <span class="font-mono text-slate-500">${escHtml(d.field)}</span>
            <span class="text-emerald-700">${escHtml(String(d.targetVal ?? '—'))}</span>
            <span class="text-red-500 line-through">${escHtml(String(d.sourceVal ?? '—'))}</span>
          </div>`
        ).join('');
    }
  }

  dialog.showModal();
  renderDiff();
  selTarget.addEventListener('change', renderDiff);
  selSource.addEventListener('change', renderDiff);

  dialog.querySelector('#btn-merge-cancel').addEventListener('click', () => dialog.close());

  dialog.querySelector('#btn-merge-confirm').addEventListener('click', async () => {
    const tId = selTarget.value;
    const sId = selSource.value;
    if (tId === sId) return;
    const target = items.find((i) => i.id === tId);
    const source = items.find((i) => i.id === sId);
    if (!target || !source) return;
    dialog.close();
    await onDone(target, source, entityLabel);
  });
}
