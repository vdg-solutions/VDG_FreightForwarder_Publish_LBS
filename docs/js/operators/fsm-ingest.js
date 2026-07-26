// F-19-88 — create -> FSM-ingest wiring. Choke point for registering shipments into the
// WASM FSM state map and writing an advanced state back to the repo of record. `window`
// guarded throughout so this module imports cleanly under node:test (no DOM/WASM there).

export async function registerFsmEntity(ref, state) {
  if (!ref || !state) return;
  const fn = typeof window !== 'undefined' ? window.register_entity : undefined;
  if (typeof fn !== 'function') return;
  try { await fn(ref, state); }
  catch (err) { console.debug('[fsm-ingest] register', ref, err); } // DEV — ingest is non-fatal
}

// AC-04/05: reload rehydration + pre-existing orphan backlog. register-if-absent in the
// Rust export makes this safe to call over every repo shipment on every boot.
export async function rehydrateFsmStates(repo) {
  if (!repo) return;
  for (const s of await repo.list('shipment', null)) {
    const ref = s.shipment_ref || s.ref;
    if (ref && s.state) await registerFsmEntity(ref, s.state);
  }
}

// PM Q1: repo stays authoritative — mirror an FSM advance back into the shipment record.
export async function persistAdvancedState(repo, ref, newState) {
  if (!repo || !ref || !newState) return;
  const rec = await repo.get('shipment', ref).catch(() => null);
  if (rec && rec.state !== newState) await repo.put('shipment', ref, { ...rec, state: newState });
}
