// platform/flows.js — extra platform methods the Rust flows use-cases import (js_flows.rs extern
// type). Raw passthrough: no decision lives here, only the browser/storage call the operator asked
// for. Every method is async so a value and a promise can never answer the same call differently.
import { storageApi } from '../../implementations/storage/core_abstractions/storage-api.js';
import { ledgerRepo } from '../../implementations/storage/core_abstractions/ledger-repo.js';
import { activeWorkspaceName } from '../../implementations/storage/core_abstractions/workspace-registry.js';
import * as shipments from '../../implementations/ui/core_abstractions/ports/data/shipment-repo.js';
import { todayLocal } from '../../implementations/kernel/core_abstractions/util/today-local.js';
import { safeAwait, SAFE_AWAIT_DEFAULT_MS } from '../../implementations/kernel/core_abstractions/util/safe-await.js';

const JSZIP_CDN         = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
const ZIP_COMPRESSION   = 'DEFLATE';
const ZIP_LEVEL         = 6;
const HTTP_TRANSPORT_FAILURE = 0;

function wasm() { return window.__vdg_wasm; }
function repo()  { return window.__vdg_repo; }

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

  flows_get_or_create_file: async (dirId, name, content) => {
    const api = storageApi();
    return api.getOrCreateFile(api.driveFetch, api.uploadFile, dirId, name, content);
  },

  // A lost CAS race (412) is an expected outcome of a counter claim, so it answers instead of
  // throwing — the operator decides whether to retry.
  flows_cas_upload: async (fileId, name, body, etag) => {
    try {
      await storageApi().uploadFile(fileId, name, body, etag, { isUpdate: true });
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
