// output/web/js.tmp/implementations/ui/core_abstractions/ports/manager/document-board-composer.js
var KIND_DOCUMENT = "document";
var KIND_SHIPPING_INSTRUCTION = "shipping_instruction";
var KIND_ARRIVAL_NOTICE = "arrival_notice";
var KIND_RELEASE_ORDER = "release_order";
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
  KIND_DOCUMENT,
  KIND_SHIPPING_INSTRUCTION,
  KIND_ARRIVAL_NOTICE,
  KIND_RELEASE_ORDER,
  bindDocumentBoardComposer,
  composeDocumentBoard
};
