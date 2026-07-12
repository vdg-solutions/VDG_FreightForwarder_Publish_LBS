// vdg-confirm-dialog.js — branded confirm modal, replaces window.confirm()/alert() (F-24-10).
// Vanilla DOM overlay, same pattern as views/admin/user-edit-modal.js — no Lit dep in this repo.

const BTN_BASE_CLASS    = 'px-4 py-2 text-xs rounded-lg';
const BTN_CANCEL_CLASS  = `btn-cancel ${BTN_BASE_CLASS} bg-slate-100 text-slate-700 hover:bg-slate-200`;
const BTN_PRIMARY_CLASS = `btn-primary ${BTN_BASE_CLASS} bg-blue-600 text-white hover:bg-blue-700`;
const BTN_DANGER_CLASS  = `btn-danger ${BTN_BASE_CLASS} bg-red-600 text-white hover:bg-red-700`;

const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPE_MAP[c]);
}

/// AC-02/AC-03: pure markup builder — destructive flips confirm button to btn-danger; caller
/// is responsible for template substitution (e.g. `{email}`) before passing title/body in.
export function buildConfirmDialogHtml({ title, body, confirmLabel, cancelLabel, destructive = false }) {
  const confirmClass = destructive ? BTN_DANGER_CLASS : BTN_PRIMARY_CLASS;
  return `
    <div class="bg-white rounded-xl shadow-xl p-6 w-96 space-y-4" role="alertdialog" aria-modal="true">
      <div class="text-sm font-semibold text-slate-800">${escapeHtml(title)}</div>
      <div class="text-xs text-slate-600 whitespace-pre-line">${escapeHtml(body)}</div>
      <div class="flex gap-2 justify-end">
        <button id="vdg-confirm-cancel" class="${BTN_CANCEL_CLASS}">${escapeHtml(cancelLabel)}</button>
        <button id="vdg-confirm-ok" class="${confirmClass}">${escapeHtml(confirmLabel)}</button>
      </div>
    </div>`;
}

/// AC-01: mounts overlay on doc.body, wires cancel/confirm/backdrop/Escape -> onResolve(bool).
/// `doc` is injectable so unit tests can pass a fake document without a real DOM.
export function mountConfirmDialog(options, onResolve, doc = document) {
  const overlay = doc.createElement('div');
  overlay.className = 'vdg-confirm-dialog fixed inset-0 z-[60] bg-black/40 flex items-center justify-center';
  overlay.innerHTML = buildConfirmDialogHtml(options);

  const close = (result) => {
    overlay.remove();
    doc.removeEventListener('keydown', onKeydown);
    onResolve(result);
  };

  function onKeydown(e) {
    if (e.key === 'Escape') close(false);
  }

  overlay.querySelector('#vdg-confirm-cancel').addEventListener('click', () => close(false));
  overlay.querySelector('#vdg-confirm-ok').addEventListener('click', () => close(true));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
  doc.addEventListener('keydown', onKeydown);

  doc.body.appendChild(overlay);
  overlay.querySelector('#vdg-confirm-ok').focus?.();
  return overlay;
}
