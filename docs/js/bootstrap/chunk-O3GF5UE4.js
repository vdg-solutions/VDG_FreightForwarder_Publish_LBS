// output/web/js.tmp/implementations/storage/core_abstractions/workspace-config.js
var WORKSPACE_NAME = (() => {
  const raw = "LBS";
  return raw.startsWith("WORKSPACE_NAME_") ? "LBS" : raw;
})();
var API_BASE = (() => {
  const raw = "https://vdg-lbs-edge.lbs-vdg.workers.dev";
  return raw.startsWith("VDG_API_BASE_") ? "" : raw.replace(/\/+$/, "");
})();

// output/web/js.tmp/implementations/storage/core_abstractions/workspace-registry.js
function activeWorkspaceName() {
  return WORKSPACE_NAME;
}

export {
  API_BASE,
  activeWorkspaceName
};
