// platform/flows.js — extra platform methods the Rust flows use-cases import (js_flows.rs extern
// type). Raw passthrough: no decision lives here, only the browser/storage call the operator asked
// for. Every method is async so a value and a promise can never answer the same call differently.
import { apiFetch } from '../../implementations/storage/core_abstractions/backend.js';
import { ApiError } from '../../implementations/storage/core_abstractions/api-error.js';
import { ledgerRepo } from '../../implementations/storage/core_abstractions/ledger-repo.js';
import { activeWorkspaceName } from '../../implementations/storage/core_abstractions/workspace-registry.js';
import * as shipments from '../../implementations/ui/core_abstractions/ports/data/shipment-repo.js';
import { todayLocal } from '../../implementations/kernel/core_abstractions/util/today-local.js';
import { safeAwait, SAFE_AWAIT_DEFAULT_MS } from '../../implementations/kernel/core_abstractions/util/safe-await.js';
import { currentUserEmail } from '../../implementations/ui/core_abstractions/ports/governance/route-guard.js';

const JSZIP_CDN         = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
const ZIP_COMPRESSION   = 'DEFLATE';
const ZIP_LEVEL         = 6;
const HTTP_TRANSPORT_FAILURE = 0;
const HTTP_NOT_FOUND    = 404;
const HTTP_CONFLICT     = 409;

function wasm() { return window.__vdg_wasm; }
function repo()  { return window.__vdg_repo; }

// jobno_lease.rs's `dir_id` used to be a Drive folder id; CharterDB has no folder tree, so it is
// read here as a collection PATH instead — same reinterpretation server-io-adapters.js's
// ws_read_file/ws_write_file already made for `dirPath`. Collapses to '' for a bare id.
function normCollection(dirId) {
  return String(dirId || '').replace(/^\/+|\/+$/g, '');
}

// The shipment repo speaks in TWO records (envelope + the rep's revenue half); the flows
// use-cases reach it by op name so the split, the write gate and the audit stay in one place.
const SHIPMENT_OPS = {
  putShipment:    (shipment)    => shipments.putShipment(repo(), shipment),
  putEnvelope:    (ref, record) => shipments.putEnvelope(repo(), ref, record),
  deleteShipment: (ref)         => shipments.deleteShipment(repo(), ref),
};

async function loadJsZip() {
  if (window.JSZip) return;
  await new Promise((resolve, reject) => {
    const script   = document.createElement('script');
    script.src     = JSZIP_CDN;
    script.onload  = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export const flowsPlatform = {
  // license_arm classifies AND arms the wasm write guard — the boot gate goes through here so the
  // verdict the repo enforces is the one the screen renders. The Rust i64 param is a JS BigInt.
  flows_license_arm: async (license, nowUnix) => wasm().license_arm(license, BigInt(Math.trunc(nowUnix))),

  flows_fsm_register:     async (entityId, state)    => wasm().register_entity(entityId, state) ?? null,
  flows_fsm_auto_advance: async (entityId, shipment) => wasm().shipment_auto_advance(entityId, JSON.stringify(shipment)) ?? null,
  flows_mint_quote_ref:   async (salt)               => repo()?.mint_quote_ref(String(salt || '')) ?? null,

  flows_today_local:       async () => todayLocal(),
  flows_active_workspace:  async () => activeWorkspaceName(),

  // Bounded, and TEXT: a JWT and a JSONL seed are both text, and JSON.parse throws on either.
  flows_fetch_text: async (url) => {
    const result = await safeAwait(fetch(url), SAFE_AWAIT_DEFAULT_MS, null, 'flows:fetch-text');
    if (!result.ok) throw result.error ?? new Error(`fetch timed out: ${url}`);
    const res  = result.value;
    const body = await res.text();
    return { status: res.status, ok: res.ok, body };
  },

  flows_zip_download: async (filename, entries) => {
    await loadJsZip();
    const zip = new window.JSZip();
    for (const { path, content } of entries || []) zip.file(path, content);
    const blob = await zip.generateAsync({ type: 'blob', compression: ZIP_COMPRESSION, compressionOptions: { level: ZIP_LEVEL } });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    return { ok: true };
  },

  // Read-or-create a CharterDB record (jobno_lease.rs's per-rep-code counter file): `dirId` names
  // the collection, `name` is the record id — the same `${collection}/${id}` addressing
  // ws_read_file/ws_write_file already use, so the `id` handed back here round-trips through
  // flows_cas_upload below. etag/content ride along too (the CAS loop's compare-and-swap target),
  // captured straight from the GET/POST response instead of a separate getFile round trip. A 409
  // on create just means another device seeded it first — the record is there either way, which is
  // exactly what "get or create" asks for, but with no etag of its own to hand back: the caller's
  // next CAS attempt re-reads and gets one then.
  flows_get_or_create_file: async (dirId, name, content) => {
    const collection = normCollection(dirId);
    try {
      const existing = await apiFetch('GET', `/records/${encodeURIComponent(collection)}/${encodeURIComponent(name)}`);
      return { id: `${collection}/${name}`, etag: existing.etag ?? null, content: existing.content ?? null };
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== HTTP_NOT_FOUND) throw err;
    }
    try {
      const created = await apiFetch('POST', `/records/${encodeURIComponent(collection)}`, { id: name, owner: currentUserEmail(), content });
      return { id: `${collection}/${name}`, etag: created.etag ?? null, content: created.content ?? content };
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== HTTP_CONFLICT) throw err;
    }
    return { id: `${collection}/${name}` };
  },

  // A lost CAS race (412) is an expected outcome of a counter claim, so it answers instead of
  // throwing — the operator decides whether to retry. `fileId` is the `${collection}/${name}` id
  // flows_get_or_create_file above hands back; CharterDB's own If-Match does the compare-and-swap.
  flows_cas_upload: async (fileId, name, body, etag) => {
    const suffix     = `/${name}`;
    const collection = String(fileId || '').endsWith(suffix) ? fileId.slice(0, -suffix.length) : '';
    try {
      await apiFetch('PUT', `/records/${encodeURIComponent(collection)}/${encodeURIComponent(name)}`, { content: body }, { 'If-Match': etag });
      return { ok: true, status: HTTP_TRANSPORT_FAILURE };
    } catch (err) {
      return { ok: false, status: err?.status ?? HTTP_TRANSPORT_FAILURE };
    }
  },

  flows_shipments_call: async (op, args) => {
    const call = SHIPMENT_OPS[op];
    if (!call) throw new Error(`flows_shipments_call: unknown op ${op}`);
    return (await call(...(Array.isArray(args) ? args : [args]))) ?? null;
  },

  flows_ledger_call: async (op, args) => {
    const led = ledgerRepo();
    if (typeof led[op] !== 'function') throw new Error(`flows_ledger_call: unknown op ${op}`);
    return (await led[op](...(Array.isArray(args) ? args : [args]))) ?? null;
  },
};
