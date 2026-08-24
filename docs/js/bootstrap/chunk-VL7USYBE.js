// output/web/js.tmp/implementations/storage/core_abstractions/storage-api.js
var _api = null;
function bindStorageApi(api) {
  _api = api;
}
function storageApi() {
  if (!_api) throw new Error("storage/storage-api: no adapter bound (the storage bootstrap binds it)");
  return _api;
}
var getFile = (...a) => storageApi().getFile(...a);
var findWorkspaceRoot = (...a) => storageApi().findWorkspaceRoot(...a);
var findSharedFilesByNamePrefix = (...a) => storageApi().findSharedFilesByNamePrefix(...a);

// output/web/js.tmp/implementations/kernel/core_abstractions/util/fork-id.js
function forkId(email) {
  return (email || "").trim().toLowerCase();
}

// output/web/js.tmp/implementations/ui/core_abstractions/ports/governance/workspace-bootstrap.js
var _impl = null;
function bindWorkspaceBootstrap(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/workspace-bootstrap: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var bootstrapAclTargetFolders = (...a) => _i().bootstrapAclTargetFolders(...a);

export {
  bindStorageApi,
  storageApi,
  getFile,
  findWorkspaceRoot,
  findSharedFilesByNamePrefix,
  forkId,
  bindWorkspaceBootstrap,
  bootstrapAclTargetFolders
};
