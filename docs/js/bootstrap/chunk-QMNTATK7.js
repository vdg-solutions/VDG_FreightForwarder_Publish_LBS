import {
  isViewSuperseded
} from "./chunk-6KREJQWP.js";

// output/web/js.tmp/implementations/ui/bootstrap/util/store-repaint.js
var ENTITY_CHANGED_EVENT = "vdg:entity-changed";
var _live = /* @__PURE__ */ new Map();
function repaintOnStoreChange(root, kind, reload) {
  _live.get(kind)?.();
  let busy = false;
  let pending = false;
  const run = () => {
    if (busy) {
      pending = true;
      return;
    }
    busy = true;
    Promise.resolve().then(reload).catch((err) => console.warn("[store-repaint] reload failed", kind, err)).then(() => {
      busy = false;
      if (pending) {
        pending = false;
        run();
      }
    });
  };
  const onEntity = (e) => {
    if (isViewSuperseded(root)) {
      teardown();
      return;
    }
    if (e?.detail?.kind !== kind) return;
    run();
  };
  const teardown = () => {
    window.removeEventListener(ENTITY_CHANGED_EVENT, onEntity);
    if (_live.get(kind) === teardown) _live.delete(kind);
  };
  window.addEventListener(ENTITY_CHANGED_EVENT, onEntity);
  _live.set(kind, teardown);
  return teardown;
}

export {
  repaintOnStoreChange
};
