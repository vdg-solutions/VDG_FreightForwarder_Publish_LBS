// output/web/js.tmp/implementations/ui/core_abstractions/ports/governance/workspace-settings.js
var SECOND_EYES_FIELD = "priced_second_eyes";
var DEFAULT_CURRENCY_FIELD = "default_currency";
var _impl = null;
function bindWorkspaceSettings(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/workspace-settings: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var readSettings = (...a) => _i().readSettings(...a);
var loadWorkspaceSettings = (...a) => _i().loadWorkspaceSettings(...a);
var saveWorkspaceSettings = (...a) => _i().saveWorkspaceSettings(...a);

export {
  SECOND_EYES_FIELD,
  DEFAULT_CURRENCY_FIELD,
  bindWorkspaceSettings,
  readSettings,
  loadWorkspaceSettings,
  saveWorkspaceSettings
};
