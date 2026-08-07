// Diff-before-emit for stale-while-revalidate background pulls (F-45-01) — kills the
// no-op vdg:entity-changed spam that made exceptions.js's chart flicker (also benefits
// the other 11 views listening to the same event). Pure orchestration, DI'd IO — no
// direct store import, no circular dep.

// canonical, key-order-independent equality for two entity rows (or undefined)
function rowsEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return canonicalJson(a) === canonicalJson(b);
}

function canonicalJson(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(v[k])}`).join(',')}}`;
}

/**
 * @param {string} kind
 * @param {{
 *   driveList:  (kind: string) => Promise<object[]>,
 *   readCached: (kind: string) => Promise<Map<string, object>>,
 *   writeCached: (kind: string, row: object) => Promise<void>,
 *   writeMeta:  (kind: string) => Promise<void>,
 *   dispatchChanged: (kind: string) => void,
 * }} deps
 */
export async function runBackgroundPull(kind, deps) {
  const { driveList, readCached, writeCached, writeMeta, dispatchChanged } = deps;
  const driveRows = await driveList(kind);
  const cached    = await readCached(kind);

  let changed = false;
  for (const row of driveRows) {
    if (!rowsEqual(cached.get(row.id), row)) changed = true;
    await writeCached(kind, row);
  }

  await writeMeta(kind);
  if (changed) dispatchChanged(kind);
}
