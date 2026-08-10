// Workspace settings — extracted load/save seam (F-28-12, AC-07).
// settings.js previously kept these as module-private funcs, unreachable for a unit test.
// Extracting to an operator module gives the AC-07 round-trip seam AND lets air-rates.js
// read the second-eyes flag without duplicating the Drive I/O (F-28-04 §F.3).
//
// #31: the store moved from a loose `_shared/workspace.json` to the `workspace_settings` kind in
// the DB. A loose file carries no kind, so the 30s delta engine never refreshed it and every
// reader paid its own driveFetch — including the P&L form, on the path to first paint. As a
// registered kind it is a local read, and an accounting change lands on other people's machines
// within a delta tick. workspace.json is still READ once, to migrate a workspace provisioned
// before this; it is never written again.

const WORKSPACE_JSON_PATH = 'workspace.json';
const SHARED_FOLDER       = '_shared';
const DEFAULT_FX_SOURCE   = 'Manual';
// Accounting's default for a NEW P&L header. Must equal section-header.js's own fallback so a
// workspace that has never saved settings still renders the header and the line cells alike.
const DEFAULT_CURRENCY    = 'USD';

export const SETTINGS_KIND = 'workspace_settings';
/// One row per workspace — the kind is a singleton, so the id is fixed.
export const SETTINGS_ID   = 'workspace';

// AC-05/06/07: single new boolean field, default OFF — the only schema addition authorized.
export const SECOND_EYES_FIELD = 'air_rates_second_eyes';
export const DEFAULT_CURRENCY_FIELD = 'default_currency';

function defaults() {
  return {
    fx_source: DEFAULT_FX_SOURCE,
    [SECOND_EYES_FIELD]: false,
    [DEFAULT_CURRENCY_FIELD]: DEFAULT_CURRENCY,
  };
}

/// Settings as they stand in the local DB. Synchronous-cheap: no Drive call, so a caller on a
/// render path (sales-new.js) can await it without budgeting for the network. `null` repo — or a
/// row that isn't there yet — resolves to defaults, never to a half-populated object.
export async function readSettings(repo) {
  if (!repo?.get) return defaults();
  try {
    const row = await repo.get(SETTINGS_KIND, SETTINGS_ID);
    return row ? { ...defaults(), ...row } : defaults();
  } catch { /* store unavailable — defaults keep the caller rendering */ return defaults(); }
}

async function getSharedFolder(driveApi, wsName) {
  const root = await driveApi.findWorkspaceRoot(wsName);
  if (!root) return null;
  return driveApi.findFolder(root, SHARED_FOLDER);
}

/// Legacy `_shared/workspace.json`, for workspaces provisioned before the kind existed.
/// Returns null when there is nothing to migrate — distinct from "read it and it was empty".
async function readLegacyJson(driveApi, wsName) {
  try {
    const shared = await getSharedFolder(driveApi, wsName);
    if (!shared) return null;
    const q   = `name='${WORKSPACE_JSON_PATH}' and '${shared.id}' in parents and trashed=false`;
    const res = await driveApi.driveFetch('GET', `/files?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive`);
    const f = res?.files?.[0];
    if (!f) return null;
    const data = await driveApi.getFile(f.id);
    return data?.content ? JSON.parse(data.content) : null;
  } catch { /* Drive unavailable or workspace.json absent — nothing to migrate */ return null; }
}

/// AC-07: merges over defaults so an absent row/field always resolves
/// `air_rates_second_eyes === false` (AC-05 default OFF).
///
/// #31: DB first. Only when the row is absent does this fall back to the legacy JSON, and it
/// writes what it found into the DB so the fallback runs at most once per workspace. Migration is
/// best-effort: a reader without write access still gets the right values, just not the write.
export async function loadWorkspaceSettings(driveApi, wsName, repo = null) {
  const store = repo || (typeof window !== 'undefined' ? window.__vdg_repo : null);
  if (store?.get) {
    try {
      const row = await store.get(SETTINGS_KIND, SETTINGS_ID);
      if (row) return { ...defaults(), ...row };
    } catch { /* fall through to the legacy read */ }
  }

  const legacy = await readLegacyJson(driveApi, wsName);
  if (!legacy) return defaults();
  const merged = { ...defaults(), ...legacy };
  if (store?.put) {
    try { await store.put(SETTINGS_KIND, SETTINGS_ID, { ...merged, id: SETTINGS_ID }); }
    catch { /* migration is best-effort — a reader without write access still gets the values */ }
  }
  return merged;
}

/// AC-07: writes the single settings row. The window cache is what already-mounted views read,
/// so it is refreshed here too — the delta tick brings OTHER machines up to date, not this one.
export async function saveWorkspaceSettings(driveApi, wsName, settings, repo = null) {
  const store = repo || (typeof window !== 'undefined' ? window.__vdg_repo : null);
  if (!store?.put) throw new Error('Workspace store not ready');
  await store.put(SETTINGS_KIND, SETTINGS_ID, { ...settings, id: SETTINGS_ID });
  if (typeof window !== 'undefined') window.__vdg_workspace_settings = settings;
}
