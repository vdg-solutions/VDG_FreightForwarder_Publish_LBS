// workspace-settings — port: the workspace's accounting configuration as the forms read it. The
// store and the defaults live in Rust; this is the shape the views already call.

/// One row per workspace — the kind is a singleton, so the id is fixed.
export const SETTINGS_KIND = 'workspace_settings';
export const SETTINGS_ID   = 'workspace';
/// AC-05/06/07: a single boolean over the priced refs as a SET, default OFF.
export const SECOND_EYES_FIELD      = 'priced_second_eyes';
export const DEFAULT_CURRENCY_FIELD = 'default_currency';

let _impl = null;

/// Root bootstrap binds { readSettings, loadWorkspaceSettings, saveWorkspaceSettings } once.
export function bindWorkspaceSettings(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/workspace-settings: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (repo) -> settings as they stand locally; defaults when the row is absent or the store wedged.
export const readSettings = (...a) => _i().readSettings(...a);
/// (driveApi, wsName, repo) -> settings, migrating the legacy shared workspace.json once.
export const loadWorkspaceSettings = (...a) => _i().loadWorkspaceSettings(...a);
/// (driveApi, wsName, settings, repo) -> writes the single settings row.
export const saveWorkspaceSettings = (...a) => _i().saveWorkspaceSettings(...a);
