// Workspace settings — extracted load/save seam (F-28-12, AC-07).
// settings.js previously kept these as module-private funcs, unreachable for a unit test.
// Extracting to an operator module gives the AC-07 round-trip seam AND lets air-rates.js
// read the second-eyes flag without duplicating the Drive I/O (F-28-04 §F.3).

const WORKSPACE_JSON_PATH = 'workspace.json';
const SHARED_FOLDER       = '_shared';
const DEFAULT_FX_SOURCE   = 'Manual';

// AC-05/06/07: single new boolean field, default OFF — the only schema addition authorized.
export const SECOND_EYES_FIELD = 'air_rates_second_eyes';

function defaults() {
  return { fx_source: DEFAULT_FX_SOURCE, [SECOND_EYES_FIELD]: false };
}

async function getSharedFolder(driveApi, wsName) {
  const root = await driveApi.findWorkspaceRoot(wsName);
  if (!root) return null;
  return driveApi.findFolder(root, SHARED_FOLDER);
}

/// AC-07: merges over defaults so an absent file/field always resolves
/// `air_rates_second_eyes === false` (AC-05 default OFF).
export async function loadWorkspaceSettings(driveApi, wsName) {
  try {
    const shared = await getSharedFolder(driveApi, wsName);
    if (!shared) return defaults();
    const q   = `name='${WORKSPACE_JSON_PATH}' and '${shared.id}' in parents and trashed=false`;
    const res = await driveApi.driveFetch('GET', `/files?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive`);
    const f = res?.files?.[0];
    if (!f) return defaults();
    const data = await driveApi.getFile(f.id);
    if (!data?.content) return defaults();
    return { ...defaults(), ...JSON.parse(data.content) };
  } catch { /* Drive unavailable or workspace.json absent — use defaults */ return defaults(); }
}

/// AC-07: etag-gated PATCH — same store + pattern as fx_source (settings.js legacy saveSettings).
export async function saveWorkspaceSettings(driveApi, wsName, settings) {
  const root = await driveApi.findWorkspaceRoot(wsName);
  if (!root) throw new Error('Workspace root not found');
  const shared  = await driveApi.getOrCreateFolder(root, SHARED_FOLDER);
  const content = JSON.stringify(settings, null, 2);
  const q   = `name='${WORKSPACE_JSON_PATH}' and '${shared.id}' in parents and trashed=false`;
  const res = await driveApi.driveFetch('GET', `/files?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive`);
  const f = res?.files?.[0];
  if (f) {
    const existing = await driveApi.getFile(f.id);
    const etag     = existing?.etag || `etag-${Date.now()}`;
    await driveApi.uploadFile(f.id, WORKSPACE_JSON_PATH, content, etag);
  } else {
    await driveApi.uploadFile(shared.id, WORKSPACE_JSON_PATH, content, null);
  }
  window.__vdg_workspace_settings = settings;
}
