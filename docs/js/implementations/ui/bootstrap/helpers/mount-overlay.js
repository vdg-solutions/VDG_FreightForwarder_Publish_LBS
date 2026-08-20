// mount-overlay.js — body-attached modal overlays outlive the view that opened them (the router
// only swaps <main>), so mounting replaces any overlay already open and closes on route change.

export function mountOverlay(overlay) {
  document.querySelectorAll('[data-vdg-overlay]').forEach((el) => el.remove());
  overlay.setAttribute('data-vdg-overlay', '');
  window.addEventListener('hashchange', () => overlay.remove(), { once: true });
  document.body.appendChild(overlay);
}
