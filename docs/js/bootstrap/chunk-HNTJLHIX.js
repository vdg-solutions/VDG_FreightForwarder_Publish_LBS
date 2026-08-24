// output/web/js.tmp/implementations/ui/core_abstractions/ports/flows/backup-exporter.js
var _impl = null;
function bindBackupExporter(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/backup-exporter: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var exportWorkspace = (...a) => _i().exportWorkspace(...a);

export {
  bindBackupExporter,
  exportWorkspace
};
