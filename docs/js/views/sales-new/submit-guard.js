// submit-guard.js — re-entrancy guard for the shared NI-form submit handler (F-32-02).
// Double-click Save (or a slow network) fired the #ni-form submit handler twice, each
// call minting its own shipment_ref/job_no → two shipments with duplicate legal doc
// numbers. One guard instance per form render(); the in-flight flag flips to true
// synchronously, before any await, so a second invocation racing in while the first is
// still pending sees it immediately and no-ops.

export function createSubmitGuard() {
  let inFlight = false;

  // buttons: array of button-like elements (may contain null/undefined — skipped).
  // fn: the async submit body to guard.
  return async function guardedSubmit(buttons, fn) {
    if (inFlight) return; // second call while pending — no-op (AC-01)
    inFlight = true;
    for (const btn of buttons) if (btn) btn.disabled = true;
    try {
      return await fn();
    } finally {
      // both success and thrown-error paths re-enable — never a permanent lock (AC-02)
      inFlight = false;
      for (const btn of buttons) if (btn) btn.disabled = false;
    }
  };
}
