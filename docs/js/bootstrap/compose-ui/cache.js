// compose-ui/cache.js — binds the ui's cache ports to the wasm freight_app exports.

import { bindBulkOrchestrator } from '../../implementations/ui/core_abstractions/ports/cache/bulk-orchestrator.js';
import { bindMasterDeduper } from '../../implementations/ui/core_abstractions/ports/cache/master-deduper.js';
import { bindMasterRegistry } from '../../implementations/ui/core_abstractions/ports/cache/master-registry.js';
import { bindRoutePrefetch } from '../../implementations/ui/core_abstractions/ports/cache/route-prefetch.js';

export function composeCache(wasm) {
  bindBulkOrchestrator({
    bulkPut: async (_repo, kind, entities) => {
      if (!entities?.length) return;
      const res = await wasm.cache_bulk_put({ kind, entities });
      // A partial write is not a success: the caller re-renders off what it believes it saved.
      if (!res.ok) throw new Error(res.error || `bulkPut(${kind}): stopped after ${res.written}`);
    },
  });

  bindMasterRegistry({
    // A role set, not one role — a Manager+SalesRep is judged on the whole hand, not one hat.
    canWriteMaster: (kind, roles) => wasm.cache_can_write_master({ kind, roles: roles || [] }).allowed,
  });

  bindMasterDeduper({
    findMatch: (name, existing) => wasm.cache_find_match({ name, existing: existing || [] }),
  });

  bindRoutePrefetch({
    prefetchDashboard: async () => { await wasm.cache_route_prefetch({}); },
  });
}
