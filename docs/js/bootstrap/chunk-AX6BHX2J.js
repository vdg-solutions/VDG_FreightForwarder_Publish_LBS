// output/web/js.tmp/implementations/ui/bootstrap/helpers/mount-overlay.js
function mountOverlay(overlay) {
  document.querySelectorAll("[data-vdg-overlay]").forEach((el) => el.remove());
  overlay.setAttribute("data-vdg-overlay", "");
  window.addEventListener("hashchange", () => overlay.remove(), { once: true });
  document.body.appendChild(overlay);
}

export {
  mountOverlay
};
