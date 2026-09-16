// compose-ui/data.js — binds the ui's data ports to the wasm freight_app exports.
//
// The screens keep the signatures they already call, `repo` first: the repo the Rust use-cases
// write through is the SAME one, installed on the platform at boot, so the argument is accepted
// and ignored rather than removed — a rename across forty call sites would be the change, and the
// change is that the decisions moved.
import { t } from '../../implementations/kernel/core_abstractions/i18n/index.js';
import {
  bindShipmentRepo, KIND_SHIPMENT, REVENUE_SEEN,
} from '../../implementations/ui/core_abstractions/ports/data/shipment-repo.js';
import {
  bindWriteGate, LicenseReadOnlyError, PeriodLockedError,
} from '../../implementations/ui/core_abstractions/ports/data/write-gate.js';
import { bindBillingPublish } from '../../implementations/ui/core_abstractions/ports/data/billing-publish-repo.js';
import { bindRepoQuery } from '../../implementations/ui/core_abstractions/ports/data/repo-query.js';
import { bindPnlLineId } from '../../implementations/ui/core_abstractions/ports/data/pnl-line-id.js';
// One lane, one binding file: the masters half is eighteen registry-backed tables, unrelated to
// the shipment record this file otherwise composes.
import { bindMastersData } from './data-masters.js';
import { bindReportReads } from './data-reports.js';
import { bindSalesData } from './data-sales.js';

const REASON_PERIOD_LOCKED    = 'period-locked';
const REASON_LICENSE_READONLY = 'license-readonly';

// cas-write-path.md §5.3: CharterDB is the only thing that knows what version a record is at. Each
// read hands a token out with the record; this map carries it, unexamined, from getShipment to the
// matching putShipment. Keyed by ref. Nothing here mints one, and wasm refuses a save that carries
// none rather than reading one at save time — the v0.4.96 silent lost update.
const _formBases = new Map();

/// The reason code, in the reader's language. Rust decides; the words are ours.
function gateError(gate) {
  if (!gate || gate.allowed) return null;
  if (gate.reason === REASON_LICENSE_READONLY) {
    const days = gate.grace_days_left ?? 0;
    return new LicenseReadOnlyError(days, t('license.readonly_error', { d: days }));
  }
  if (gate.reason === REASON_PERIOD_LOCKED) {
    return new PeriodLockedError(gate.period, t('period.locked_error', { k: gate.period }));
  }
  return null;
}

function throwIfRefused(reply) {
  if (reply.ok) return reply;
  const refusal = gateError(reply.gate);
  if (refusal) throw refusal;
  throw new Error(reply.error || 'the write was refused');
}

/// The read RECEIPT, non-enumerable so it survives neither JSON.stringify nor a spread — it is not
/// part of the record, and persisting it would make the differ report it as a field somebody
/// changed every time a reader with different access saved the job.
function stamp(record, seen) {
  if (!record) return record;
  Object.defineProperty(record, REVENUE_SEEN, { value: seen, enumerable: false, configurable: true });
  return record;
}

function stampRows(reply) {
  if (!reply.ok) throw new Error(reply.error || 'the read failed');
  return reply.rows.map((row, i) => stamp(row, !!reply.revenue_seen[i]));
}

function applyPredicate(rows, predicate) {
  return typeof predicate === 'function' ? rows.filter(predicate) : rows;
}

export function composeData(wasm) {
  /// Read `ref` and keep the tokens that read handed out. Called after a save too: the token a save
  /// spends goes with it, and a form left open on the screen has to stand on a base CharterDB just
  /// issued rather than on nothing.
  const rememberBases = async (ref) => {
    const reply = await wasm.data_get_shipment({ shipment_ref: ref });
    if (reply.ok) _formBases.set(ref, reply.bases || {});
    return reply;
  };

  const joinLoaded = async (_repo, envelopes) =>
    stampRows(await wasm.data_join_loaded({ envelopes: envelopes || [] }));

  bindShipmentRepo({
    // opts: { commissionLines, pnlLines, ledgerVersion, occurredAt, createdBy, freshRef } —
    // cas-write-path.md §5.4: one intent carries the shipment plus its side rows, so a create or
    // amend is one atomic batch, not a save followed by a separate side-record write that can land
    // half-done.
    putShipment: async (_repo, shipment, opts = {}) => {
      const ref = shipment.shipment_ref;
      const bases = _formBases.get(ref) || {};
      const reply = throwIfRefused(await wasm.data_put_shipment({
        shipment,
        bases,
        commission_lines: opts.commissionLines ?? shipment.commission_lines ?? [],
        pnl_lines:        opts.pnlLines ?? shipment.pnl_lines ?? [],
        // Absent, not null: the wasm request types these as a number and a string, and a null
        // crossing the bridge is a decode failure, not a default.
        ledger_version:   opts.ledgerVersion ?? shipment._ledger_version ?? 0,
        occurred_at:      opts.occurredAt ?? '',
        created_by:       opts.createdBy ?? null,
        fresh_ref:        opts.freshRef ?? false,
      }));
      // This token is spent with the save. Read again so the screen — which stays on the form —
      // carries a base for its next Lưu, instead of one this layer worked out for itself.
      _formBases.delete(ref);
      await rememberBases(ref);
      return { envelope: reply.envelope, revenue: reply.revenue };
    },
    putEnvelope: async (_repo, ref, shipmentLike) => {
      const reply = throwIfRefused(await wasm.data_put_envelope({ shipment_ref: ref, shipment: shipmentLike }));
      return reply.envelope;
    },
    getEnvelope: async (_repo, ref) => {
      const reply = await wasm.data_get_envelope({ shipment_ref: ref });
      if (!reply.ok) throw new Error(reply.error || 'the read failed');
      return reply.record;
    },
    listEnvelopes: async (_repo, predicate = null) => {
      const reply = await wasm.data_list_envelopes({});
      if (!reply.ok) throw new Error(reply.error || 'the read failed');
      return applyPredicate(reply.rows, predicate);
    },
    deleteShipment: async (_repo, ref) => {
      throwIfRefused(await wasm.data_delete_shipment({ shipment_ref: ref }));
    },
    getShipment: async (_repo, ref) => {
      // Remembers the read's base tokens for the save that fills this form — replaces whatever
      // this ref held before (§5.3: the base is the token of the read the content came from).
      const reply = await rememberBases(ref);
      if (!reply.ok) throw new Error(reply.error || 'the read failed');
      return reply.record ? stamp(reply.record, reply.revenue_seen) : null;
    },
    // Narrow the ENVELOPES, then join: a screen that wants one rep's jobs should not pay a
    // cross-owner revenue read for everybody else's. `mine` is wasm's decision, not a predicate
    // this layer applies.
    listShipments: async (repo) => {
      const reply = await wasm.data_list_envelopes({ mine: false });
      if (!reply.ok) throw new Error(reply.error || 'the read failed');
      return joinLoaded(repo, reply.rows);
    },
    listMyShipments: async (repo) => {
      const reply = await wasm.data_list_envelopes({ mine: true });
      if (!reply.ok) throw new Error(reply.error || 'the read failed');
      return joinLoaded(repo, reply.rows);
    },
    joinLoaded,
    anyRevenueVisible: (rows) => (rows || []).some((row) => row?.[REVENUE_SEEN]),
  });

  bindWriteGate({
    assertWritable: async (_repo, etd, kind = KIND_SHIPMENT) => {
      const refusal = gateError(await wasm.data_write_gate({ etd: etd ?? null, kind }));
      if (refusal) throw refusal;
    },
  });

  bindBillingPublish({
    publishBilling: async (_repo, shipment, { publishedBy = null, publishedAt = null } = {}) => {
      const reply = await wasm.data_publish_billing({
        shipment, published_by: publishedBy, published_at: publishedAt,
      });
      if (!reply.ok) throw new Error(reply.error || 'publish failed');
      return reply.snapshot;
    },
    readPublishedFor: async (_repo, shipment) => (await wasm.data_published_for({ shipment })).rows,
    currentRevision: async (_repo, shipment) => (await wasm.data_current_revision({ shipment })).record,
  });

  bindMastersData(wasm);
  bindReportReads(wasm);
  bindSalesData({ wasm });

  bindRepoQuery({
    listWhere: async (_repo, kind, predicate = null) => {
      const reply = await wasm.data_list_where({ kind, column: null, equals: null, ignore_case: false });
      if (!reply.ok) throw new Error(reply.error || 'the read failed');
      return applyPredicate(reply.rows, predicate);
    },
  });

  bindPnlLineId({
    pnlLineId: (ref, index) => wasm.data_pnl_line_id({ shipment_ref: ref, index }).id,
  });
}
