// sync-due-soon.js — delivery for the "sắp tới hạn thanh toán" reminder (F-34-01). Whether there
// is anything to say, and what it says, is decided in freight_app/operators/sync/due_soon.rs;
// this file only picks the CHANNEL, which is the one thing Rust cannot see: a live service worker
// shows a notification that survives the tab closing, a direct Notification does not.
//
// Never both — that was the double-fire this collapses — and the once-per-day guard is closed
// only after something was actually delivered.

const WASM_READY_EVENT     = 'vdg:wasm-ready';
const ENTITY_CHANGED_EVENT = 'vdg:entity-changed';
const BILLING_KIND         = 'billing';
const DUE_SOON_NOTIFY_MSG  = 'DUE_SOON_NOTIFY';
const DUE_SOON_WAKE_MSG    = 'DUE_SOON_WAKE';

export function startDueSoonChecker({ getSalesId }) {
  const check = async () => {
    const wasm = window.__vdg_wasm;
    if (!wasm?.sync_due_soon_check) return;
    const reply = await wasm.sync_due_soon_check({ sales_id: getSalesId?.() ?? null });
    if (!reply.notify) return;

    const { title, tag, body } = reply.notify;
    const controller = navigator.serviceWorker?.controller;
    if (controller) {
      controller.postMessage({ type: DUE_SOON_NOTIFY_MSG, title, groups: [{ tag, body }] });
    } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, { body, tag }); // eslint-disable-line no-new
    } else {
      return; // nothing was shown — tomorrow's reminder must not be spent on it
    }
    await wasm.sync_due_soon_mark({});
  };

  const guarded = () => check().catch((err) => console.warn('[due-soon] check failed:', err?.message ?? err)); // DEV

  window.addEventListener(WASM_READY_EVENT, guarded);
  window.addEventListener(ENTITY_CHANGED_EVENT, (e) => { if (e.detail?.kind === BILLING_KIND) guarded(); });
  // A periodicsync/sync wakeup with a live client relays here instead of computing in the service
  // worker (which has no wasm) — this session recomputes and delivers itself.
  navigator.serviceWorker?.addEventListener('message', (ev) => {
    if (ev.data?.type === DUE_SOON_WAKE_MSG) guarded();
  });
  // Run once immediately: this is wired from the deferred boot step, AFTER vdg:wasm-ready already
  // fired on the critical path, so the listener above was registered for an event several awaits
  // in the past. Without this the badge only appeared once the user happened to write a billing
  // entity — i.e. the reminder reached someone already working on billing and never someone who
  // just signed in (F-57-01).
  guarded();
}
