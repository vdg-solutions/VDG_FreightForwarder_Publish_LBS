// compose-ui/data-masters.js — binds the ui's master-repo port to the wasm freight_app exports.
//
// Split out of compose-ui/data.js rather than added to it: the shipment half of that file is about
// one record with two halves and a period gate, this half is about eighteen tables that share one
// registry. Nothing is shared between them but the `wasm` handle.
import { bindMasterRepo } from '../../implementations/ui/core_abstractions/ports/data/master-repo.js';

/// A refusal from wasm is a REASON CODE (`master.kind.unregistered:<kind>`, `master.key.missing:
/// <field>`, `master.write.denied:<kind>`), not a sentence. Thrown as-is: the screens do not
/// branch on it today, and a swallowed refusal here would look exactly like a successful save.
function orThrow(reply) {
  if (!reply.ok) throw new Error(reply.error || 'the master write was refused');
  return reply;
}

export function bindMastersData(wasm) {
  bindMasterRepo({
    saveMaster: async (kind, entity) => orThrow(await wasm.data_save_master({ kind, entity })).record,
    listMasters: async (kind) => orThrow(await wasm.data_list_masters({ kind })).rows,
    getMaster: async (kind, id) => orThrow(await wasm.data_get_master({ kind, id })).record ?? null,
    deleteMaster: async (kind, id) => orThrow(await wasm.data_delete_master({ kind, id })).deleted,
  });
}
