// F-15-12 — Dunning template CRUD (/manager/dunning-templates)

import { isManager } from '../../auth/auth-gate.js';
import { navigate }  from '../../router.js';
import { DUNNING_DEFAULT_TEMPLATES, DUNNING_LADDER_DAYS } from '../../operators/manager/dunning-constants.js';
import { showConfirm } from '../../helpers/show-confirm.js';

const KIND      = 'dunning_templates';
const STAGES    = Object.keys(DUNNING_LADDER_DAYS); // reminder_1,reminder_2,escalate,legal,blacklist
const LOCALES   = ['vi', 'en'];

let _items = [];

function getRepo() { return window.__vdg_repo; }

function genId() { return `DTMPL-${Date.now()}`; }

function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── seed defaults on first open ───────────────────────────────────────────────

async function seedIfEmpty(repo) {
  const existing = await repo.list(KIND, null).catch(() => []);
  if (existing.length > 0) return;

  const defaults = [];
  for (const [key, locs] of Object.entries(DUNNING_DEFAULT_TEMPLATES)) {
    // map template key → stage key
    const stage = key === 'gentle' ? 'reminder_1' : key === 'firm' ? 'reminder_2' : 'escalate';
    for (const [locale, tmpl] of Object.entries(locs)) {
      defaults.push({
        id:       genId(),
        stage,
        locale,
        subject:  tmpl.subject,
        body:     tmpl.body,
        _seeded:  true,
      });
    }
  }
  for (const d of defaults) {
    await repo.put(KIND, d.id, d);
  }
}

// ── modal ─────────────────────────────────────────────────────────────────────

function buildModal(entity) {
  const e = entity || {};
  return `
    <dialog id="tmpl-modal" class="rounded-xl border border-slate-200 shadow-xl p-0 w-full max-w-lg backdrop:bg-black/30">
      <form id="tmpl-form" method="dialog" class="p-6 space-y-4">
        <div class="text-base font-semibold text-slate-900">${entity ? 'Edit Template' : 'New Template'}</div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Stage <span class="text-red-500">*</span></label>
            <select id="t-stage" class="w-full border rounded-lg px-3 py-2 text-sm">
              ${STAGES.map((s) => `<option value="${s}" ${e.stage === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Locale</label>
            <select id="t-locale" class="w-full border rounded-lg px-3 py-2 text-sm">
              ${LOCALES.map((l) => `<option value="${l}" ${e.locale === l ? 'selected' : ''}>${l.toUpperCase()}</option>`).join('')}
            </select>
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">Subject <span class="text-red-500">*</span></label>
          <input id="t-subject" type="text" value="${escHtml(e.subject)}" required
                 class="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">Body</label>
          <textarea id="t-body" rows="6"
                    class="w-full border rounded-lg px-3 py-2 text-sm font-mono resize-y">${escHtml(e.body)}</textarea>
          <p class="text-[10px] text-slate-400 mt-1">
            Placeholders: {customer_name}, {total_outstanding}, {days_overdue}, {invoice_list}
          </p>
        </div>
        <div class="flex gap-3 pt-2 border-t border-slate-100">
          <button type="submit" class="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700">Save</button>
          <button type="button" id="btn-tmpl-cancel" class="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">Cancel</button>
        </div>
      </form>
    </dialog>`;
}

function openModal(root, entity, onSave) {
  root.querySelector('#tmpl-modal')?.remove();
  root.insertAdjacentHTML('beforeend', buildModal(entity));
  const dialog = root.querySelector('#tmpl-modal');
  dialog.showModal();
  dialog.querySelector('#btn-tmpl-cancel').addEventListener('click', () => dialog.close());
  dialog.querySelector('#tmpl-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const subject = dialog.querySelector('#t-subject').value.trim();
    if (!subject) return;
    const updated = {
      ...(entity || {}),
      id:      entity?.id || genId(),
      stage:   dialog.querySelector('#t-stage').value,
      locale:  dialog.querySelector('#t-locale').value,
      subject,
      body:    dialog.querySelector('#t-body').value,
    };
    await onSave(updated);
    dialog.close();
  });
}

// ── row ───────────────────────────────────────────────────────────────────────

function rowHtml(e) {
  return `
    <tr class="border-t border-slate-100 hover:bg-slate-50 text-xs" data-id="${e.id}">
      <td class="px-3 py-2 font-mono">${escHtml(e.stage)}</td>
      <td class="px-3 py-2 uppercase">${escHtml(e.locale)}</td>
      <td class="px-3 py-2">${escHtml(e.subject)}</td>
      <td class="px-3 py-2">
        <button class="btn-edit text-xs text-blue-600 hover:underline mr-2" data-id="${e.id}">Edit</button>
        <button class="btn-delete text-xs text-red-500 hover:underline" data-id="${e.id}">Delete</button>
      </td>
    </tr>`;
}

// ── render ─────────────────────────────────────────────────────────────────────

export async function render(root) {
  if (!isManager()) { navigate('/dashboard'); return; }

  const repo = getRepo();
  if (repo) await seedIfEmpty(repo).catch(() => {});

  root.innerHTML = `
    <div class="p-6 max-w-[1000px] mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div class="text-lg font-semibold text-slate-900">Dunning Templates</div>
        <button id="btn-add" class="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700">
          + New Template
        </button>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table class="w-full">
          <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-3 py-2 text-left">Stage</th>
              <th class="px-3 py-2 text-left">Locale</th>
              <th class="px-3 py-2 text-left">Subject</th>
              <th class="px-3 py-2 text-left w-28">Actions</th>
            </tr>
          </thead>
          <tbody id="tmpl-tbody"></tbody>
        </table>
        <div id="tmpl-empty" class="hidden text-center text-xs text-slate-400 py-8">No templates. Seed defaults first.</div>
      </div>
      <div id="tmpl-status" class="text-xs text-slate-400 mt-2">Loading…</div>
    </div>`;

  async function reload() {
    _items = repo ? await repo.list(KIND, null).catch(() => []) : [];
    const tbody = root.querySelector('#tmpl-tbody');
    const emptyEl = root.querySelector('#tmpl-empty');
    if (tbody) tbody.innerHTML = _items.map(rowHtml).join('');
    if (emptyEl) emptyEl.classList.toggle('hidden', _items.length > 0);
    root.querySelector('#tmpl-status').textContent = '';
  }

  await reload();

  root.querySelector('#btn-add').addEventListener('click', () => {
    openModal(root, null, async (entity) => {
      await repo.put(KIND, entity.id, entity);
      await reload();
    });
  });

  root.querySelector('#tmpl-tbody').addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.btn-edit');
    if (editBtn) {
      const entity = _items.find((i) => i.id === editBtn.dataset.id);
      if (entity) openModal(root, entity, async (updated) => { await repo.put(KIND, updated.id, updated); await reload(); });
    }
    const delBtn = e.target.closest('.btn-delete');
    if (delBtn) {
      const ok = await showConfirm({
        title: 'Delete this template?',
        body:  'This cannot be undone.',
        confirmLabel: 'Delete',
        cancelLabel:  'Cancel',
        destructive:  true,
      });
      if (!ok) return;
      await repo.delete(KIND, delBtn.dataset.id);
      await reload();
    }
  });
}
