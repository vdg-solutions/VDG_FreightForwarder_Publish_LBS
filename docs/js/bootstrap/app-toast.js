// Lightweight toast renderer — listens vdg:toast, auto-dismiss.
// Split out of app.js at the 350-line cap (backlog/wiki/file-size-doctrine.md). The seam: this
// only listens for a global event and manages its own DOM container — it never touches auth,
// routing, or wasm, so it does not need to live beside app.js's boot sequence. Self-registers on
// import, same convention as platform/sync-schedulers.js.
//
// F-57-02: toasts now go INTO #vdg-toast-container. The container was created here and then
// never used — every toast was appended straight to <body> with its own `fixed bottom-4
// right-4`, so two toasts landed on the exact same pixel and only the last one was readable.
// The flex column + gap the container already declared is the whole fix; individual toasts
// just have to stop positioning themselves. This got more visible once F-57-01 added the
// /manager route guard, which raises how often a denial toast fires.

const TOAST_DEFAULT_MS  = 4_000;
const TOAST_FADE_MS     = 300;  // must match `duration-300` below
const TOAST_MAX_VISIBLE = 4;    // beyond this the oldest is retired early, never a wall of toasts

(function initToastRenderer() {
  const container = document.createElement('div');
  container.id        = 'vdg-toast-container';
  container.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none';
  document.body.appendChild(container);

  const COLORS = {
    success: 'bg-green-600',
    error:   'bg-red-600',
    warn:    'bg-amber-500',
    info:    'bg-slate-800',
  };

  function dismiss(el) {
    if (!el.isConnected) return;
    el.classList.add('opacity-0');
    setTimeout(() => el.remove(), TOAST_FADE_MS);
  }

  window.addEventListener('vdg:toast', (e) => {
    const { message, type = 'info', duration = TOAST_DEFAULT_MS } = e.detail || {};
    if (!message) return;

    const el = document.createElement('div');
    // No `fixed`/`bottom`/`right` here — the container owns placement, the toast owns looks.
    el.className = `${COLORS[type] || COLORS.info} text-white px-4 py-3 rounded shadow-lg `
                 + 'opacity-0 transition-opacity duration-300';
    el.textContent = message;
    container.appendChild(el);

    while (container.childElementCount > TOAST_MAX_VISIBLE) dismiss(container.firstElementChild);

    requestAnimationFrame(() => el.classList.remove('opacity-0'));
    setTimeout(() => dismiss(el), duration);
  });

}());
