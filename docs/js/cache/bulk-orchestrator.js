// Cache utility — bulk repo writes for imports + batch state patches. All writes go through the
// Rust repo (rebase + outbox), so no IndexedDB path remains here.

// Writes entities one-by-one via repo.put, then batches a single outbox-changed event.
export async function bulkPut(repo, kind, entities) {
  if (!repo || !entities.length) return;
  for (const entity of entities) {
    await repo.put(kind, entity.id, entity);
  }
  window.dispatchEvent(new CustomEvent('vdg:outbox-changed', {
    detail: { kind, count: entities.length },
  }));
}

// Read-modify-write a set of ids by kind through the repo — each put flows through the Rust rebase
// + outbox, so a bulk state flip (e.g. period lock) stays conflict-safe. One entity-changed at the end.
export async function bulkPatch(repo, kind, ids, patchFn) {
  if (!repo) return;
  for (const id of ids) {
    const existing = await repo.get(kind, id);
    if (!existing) continue;
    await repo.put(kind, id, patchFn({ ...existing }));
  }
  window.dispatchEvent(new CustomEvent('vdg:entity-changed', { detail: { kind } }));
}
