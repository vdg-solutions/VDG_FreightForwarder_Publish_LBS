// output/web/js.tmp/implementations/ui/core_abstractions/ports/manager/document-board-composer.js
var _impl = null;
function bindDocumentBoardComposer(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/document-board-composer: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var composeDocumentBoard = (...a) => _i().composeDocumentBoard(...a);

export {
  bindDocumentBoardComposer,
  composeDocumentBoard
};
