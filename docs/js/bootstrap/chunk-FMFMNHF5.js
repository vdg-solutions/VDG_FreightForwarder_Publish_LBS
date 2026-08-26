import {
  t
} from "./chunk-MGTH6QM4.js";

// output/web/js.tmp/implementations/kernel/core_abstractions/util/kind-i18n.js
var KIND_EMPTY = "\u2014";
function kindI18nLabel(kind, locale) {
  if (!kind || kind === KIND_EMPTY) return "";
  const key = `pnl.kind.${kind}`;
  const label = t(key);
  return label === key ? kind : label;
}

export {
  kindI18nLabel
};
