// output/web/js.tmp/implementations/ui/core_abstractions/ports/flows/note-lines.js
var _impl = null;
function bindNoteLines(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/note-lines: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var deriveNoteLines = (...a) => _i().derive(...a);

export {
  bindNoteLines,
  deriveNoteLines
};
