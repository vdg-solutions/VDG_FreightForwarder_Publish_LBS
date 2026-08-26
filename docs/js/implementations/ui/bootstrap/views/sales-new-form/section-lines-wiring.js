// section-lines-wiring.js — interactive wiring for Section B (add-row, tab, input/change/focusout
// listeners, WMA prediction hookup, FX prefill).
//
// Split out of section-lines.js at the 350-line cap (backlog/wiki/file-size-doctrine.md). The
// seam: this is DOM event wiring against a live tbody, independent of the pure row/table template
// functions and the form-to-data collectors that stay in section-lines.js — same split shape as
// section-header.js / section-header-wiring.js in this directory.

import { currentLocale } from '../../../../kernel/core_abstractions/i18n/index.js';
import { kindI18nLabel } from '../../../../kernel/core_abstractions/util/kind-i18n.js';
import { ensureWmaStyle, applyWmaToRow, applyWmaToAllRows, dismissWmaBadge }
  from './section-lines-wma.js';
import { wireLineFx, applyFxDateDefaults, prefillRowFx } from './pnl-line-fx.js';
import { classifyKind, lineRowHtml } from './section-lines.js';

// AC-02..AC-04: exported for unit tests
export function applyKindChange(descInput, newKind) {
  if (!descInput) return;
  if (descInput.dataset.userEdited === 'true') return;
  if (!newKind || newKind === '—') { descInput.value = ''; return; }
  descInput.value = kindI18nLabel(newKind, currentLocale());
}

function onKindChange(rowEl, newKind) {
  applyKindChange(rowEl.querySelector('.col-description input'), newKind);
}

// F-29-10 AC-01/AC-02: prefill blank buy/sell fx_rate cells (add-line/Tab/mount), never
// clobbering a manually-set or persisted rate — see prefillRowFx overwrite guard.
function _prefillRow(row, fxRepo, onChanged) {
  if (!row || !fxRepo) return;
  Promise.all([prefillRowFx(row, 'buy', fxRepo), prefillRowFx(row, 'sell', fxRepo)])
    .then(() => onChanged?.());
}

export function wireLinesSection(root, onChanged, repId, fxRepo, docDate) {
  const tbody = root.querySelector('#lines-tbody');
  if (!tbody) return;

  ensureWmaStyle();
  wireLineFx(tbody, fxRepo, docDate);
  tbody.querySelectorAll('tr[data-line]').forEach((r) => _prefillRow(r, fxRepo, onChanged));

  // Mount: fire-and-forget WMA predictions for blank-kind rows
  if (repId) {
    applyWmaToAllRows(tbody, repId, classifyKind).catch((err) => {
      console.warn('[wma] mount predict failed:', err.message); // DEV
    });
  }

  root.querySelector('#add-line-btn')?.addEventListener('click', () => {
    const idx = tbody.querySelectorAll('tr[data-line]').length;
    const headerCurrency = root.querySelector('[name=currency]')?.value || '';
    const tmp = document.createElement('tbody');
    tmp.innerHTML = lineRowHtml(idx, {}, headerCurrency);
    const newRow = tmp.firstElementChild;
    tbody.appendChild(newRow);
    applyFxDateDefaults(newRow, docDate);
    _prefillRow(newRow, fxRepo, onChanged);
    if (repId) {
      applyWmaToRow(newRow, repId, classifyKind).catch((err) => {
        console.warn('[wma] new row predict failed:', err.message); // DEV
      });
    }
    onChanged?.();
  });

  tbody.addEventListener('input', (e) => {
    // AC-06: real keystroke on desc → mark as user-edited
    if (e.target.name === 'desc' && e.isTrusted) {
      e.target.dataset.userEdited = 'true';
    }
    // UX enhancement: auto-mirror buy_qty and buy_unit to sell side when sell side is blank
    const row = e.target.closest('tr[data-line]');
    if (row && e.isTrusted) {
      if (e.target.name === 'buy_qty') {
        const sellQty = row.querySelector('[name=sell_qty]');
        if (sellQty && (!sellQty.value || sellQty.dataset.autoSynced === 'true')) {
          sellQty.value = e.target.value;
          sellQty.dataset.autoSynced = 'true';
        }
      } else if (e.target.name === 'buy_unit') {
        const sellUnit = row.querySelector('[name=sell_unit]');
        if (sellUnit && (!sellUnit.value || sellUnit.dataset.autoSynced === 'true')) {
          sellUnit.value = e.target.value;
          sellUnit.dataset.autoSynced = 'true';
        }
      } else if (e.target.name === 'sell_qty' || e.target.name === 'sell_unit') {
        delete e.target.dataset.autoSynced;
      }
    }
    onChanged?.();
  });

  tbody.addEventListener('change', (e) => {
    if (e.target.name === 'kind') {
      e.target.dataset.manuallySet = 'true';
      onKindChange(e.target.closest('tr[data-line]'), e.target.value);
    }
    onChanged?.();
  });

  // AC-10: description blur → auto-classify kind (only if not manually set)
  tbody.addEventListener('focusout', (e) => {
    if (e.target.name !== 'desc') return;
    const row = e.target.closest('tr[data-line]');
    if (!row) return;
    const kindSel = row.querySelector('[name=kind]');
    if (!kindSel || kindSel.dataset.manuallySet === 'true') return;
    kindSel.value = classifyKind(e.target.value);
    onChanged?.();
  });

  // Tab on last input of last row → append new row
  tbody.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || e.shiftKey) return;
    const rows    = tbody.querySelectorAll('tr[data-line]');
    const lastRow = rows[rows.length - 1];
    if (!lastRow) return;
    const inputs = lastRow.querySelectorAll('input,select');
    if (e.target !== inputs[inputs.length - 1]) return;
    e.preventDefault();
    const newIdx = rows.length;
    const headerCurrency = root.querySelector('[name=currency]')?.value || '';
    const tmp = document.createElement('tbody');
    tmp.innerHTML = lineRowHtml(newIdx, {}, headerCurrency);
    const newRow = tmp.firstElementChild;
    tbody.appendChild(newRow);
    applyFxDateDefaults(newRow, docDate);
    _prefillRow(newRow, fxRepo, onChanged);
    newRow.querySelector('input,select')?.focus();
    if (repId) {
      applyWmaToRow(newRow, repId, classifyKind).catch((err) => {
        console.warn('[wma] tab row predict failed:', err.message); // DEV
      });
    }
    onChanged?.();
  });

  tbody.addEventListener('click', async (e) => {
    const badge = e.target.closest('.wma-badge');
    if (badge) {
      if (await dismissWmaBadge(badge, repId)) onChanged?.();
      return;
    }
    const btn = e.target.closest('[data-remove]');
    if (!btn) return;
    btn.closest('tr[data-line]')?.remove();
    onChanged?.();
  });
}
