// output/web/js.tmp/implementations/ui/core_abstractions/ports/flows/quote-void-delete.js
var CANCELLED_STATE = "Cancelled";
var _impl = null;
function bindQuoteVoidDelete(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/quote-void-delete: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var chooseQuoteAffordance = (...a) => _i().chooseQuoteAffordance(...a);
var runQuoteAffordance = (...a) => _i().runQuoteAffordance(...a);

export {
  CANCELLED_STATE,
  bindQuoteVoidDelete,
  chooseQuoteAffordance,
  runQuoteAffordance
};
