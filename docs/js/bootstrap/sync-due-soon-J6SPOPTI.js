// output/web/js.tmp/bootstrap/platform/sync-due-soon.js
var WASM_READY_EVENT = "vdg:wasm-ready";
var ENTITY_CHANGED_EVENT = "vdg:entity-changed";
var BILLING_KIND = "billing";
var DUE_SOON_NOTIFY_MSG = "DUE_SOON_NOTIFY";
var DUE_SOON_WAKE_MSG = "DUE_SOON_WAKE";
function startDueSoonChecker({ getSalesId }) {
  const check = async () => {
    const wasm = window.__vdg_wasm;
    if (!wasm?.sync_due_soon_check) return;
    const reply = await wasm.sync_due_soon_check({ sales_id: getSalesId?.() ?? null });
    if (!reply.notify) return;
    const { title, tag, body } = reply.notify;
    const controller = navigator.serviceWorker?.controller;
    if (controller) {
      controller.postMessage({ type: DUE_SOON_NOTIFY_MSG, title, groups: [{ tag, body }] });
    } else if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(title, { body, tag });
    } else {
      return;
    }
    await wasm.sync_due_soon_mark({});
  };
  const guarded = () => check().catch((err) => console.warn("[due-soon] check failed:", err?.message ?? err));
  window.addEventListener(WASM_READY_EVENT, guarded);
  window.addEventListener(ENTITY_CHANGED_EVENT, (e) => {
    if (e.detail?.kind === BILLING_KIND) guarded();
  });
  navigator.serviceWorker?.addEventListener("message", (ev) => {
    if (ev.data?.type === DUE_SOON_WAKE_MSG) guarded();
  });
  guarded();
}
export {
  startDueSoonChecker
};
