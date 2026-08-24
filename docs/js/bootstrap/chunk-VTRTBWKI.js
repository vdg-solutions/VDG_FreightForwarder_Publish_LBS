// output/web/js.tmp/implementations/ui/core_abstractions/ports/flows/fsm-ingest.js
var _impl = null;
function bindFsmIngest(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/fsm-ingest: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var registerFsmEntity = (...a) => _i().registerFsmEntity(...a);
var rehydrateFsmStates = (...a) => _i().rehydrateFsmStates(...a);
var persistAdvancedState = (...a) => _i().persistAdvancedState(...a);

export {
  bindFsmIngest,
  registerFsmEntity,
  rehydrateFsmStates,
  persistAdvancedState
};
