// compose-ui/cache.js — binds the ui's cache ports to the wasm freight_app exports.

import { registerSeedKeys } from '../platform/cache.js';
import { bindBulkOrchestrator } from '../../implementations/ui/core_abstractions/ports/cache/bulk-orchestrator.js';
import { bindMasterDeduper } from '../../implementations/ui/core_abstractions/ports/cache/master-deduper.js';
import { bindMasterRegistry } from '../../implementations/ui/core_abstractions/ports/cache/master-registry.js';
import { bindRoutePrefetch } from '../../implementations/ui/core_abstractions/ports/cache/route-prefetch.js';
import { bindSeedMigrator } from '../../implementations/ui/core_abstractions/ports/cache/seed-migrator.js';

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
    canWriteMaster: (kind, role) => wasm.cache_can_write_master({ kind, role: role ?? null }).allowed,
  });

  bindMasterDeduper({
    findMatch: (name, existing) => wasm.cache_find_match({ name, existing: existing || [] }),
  });

  // The view declares its migrations; the row-key projection stays a JS function (it is the view's
  // vocabulary), so it is registered on the platform and the engine calls back for each row.
  const runSeedMigrations = async (_repo, migrations) => {
    const list = migrations || [];
    registerSeedKeys(list);
    return wasm.cache_run_seed_migrations({
      migrations: list.map((m) => ({ id: m.id, kind: m.kind, url: m.url })),
    });
  };
  bindSeedMigrator({ runSeedMigrations });

  bindRoutePrefetch({
    prefetchDashboard: async () => { await wasm.cache_route_prefetch({}); },
  });
}
