// store-router.js — SharedWorker router for the SQLite engine. OPFS sahpool sync-access handles
// are EXCLUSIVE per context: with one dedicated worker per tab, the first tab holds the database
// and every other tab's engine dies at install ("NoModificationAllowedError", 2-tab CDP repro).
// That made a second tab look like a blank machine — login screen again, views timing out, the
// "đang đồng bộ" chip spinning forever. This router is the fix: every tab connects HERE, and the
// router owns the ONE nested dedicated engine worker (store-worker.js, unchanged) that holds the
// OPFS lock. Transport-only — no SQL, no storage logic (that all stays in Rust).
//
// rid routing: each tab numbers its own requests, so raw rids collide across tabs. The router
// rewrites rid to a composite before forwarding and maps the engine's echo back to the right
// (port, original-rid) pair.

const engine = new Worker(new URL('./store-worker.js', import.meta.url), { type: 'module' });

let _seq = 0;
const _routes = new Map(); // composite rid -> { port, rid }

engine.onmessage = (ev) => {
  const { rid, ok, result, err } = ev.data || {};
  const route = _routes.get(rid);
  if (!route) return;
  _routes.delete(rid);
  route.port.postMessage({ rid: route.rid, ok, result, err });
};

// An engine crash must fail every in-flight op on every tab — never leave callers waiting on a
// response the dead engine can no longer send (their client-side timers would fire anyway, but an
// immediate reject is honest and fast).
engine.onerror = (e) => {
  const err = 'sqlite engine crashed: ' + ((e && e.message) || 'unknown');
  for (const [, route] of _routes) route.port.postMessage({ rid: route.rid, ok: false, err });
  _routes.clear();
};

self.onconnect = (ev) => {
  const port = ev.ports[0];
  port.onmessage = (mev) => {
    const m = mev.data || {};
    const composite = 'r' + (++_seq);
    _routes.set(composite, { port, rid: m.rid });
    engine.postMessage({ ...m, rid: composite });
  };
};
