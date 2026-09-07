// output/web/js.tmp/implementations/storage/core_abstractions/identity-cache-keys.js
var _keys = {
  role_cache: "vdg.role.cache",
  id_token: "vdg.auth.id_token",
  profile: "vdg.auth.profile",
  access_token: "vdg.auth.access_token",
  access_token_exp: "vdg.auth.access_token_exp",
  access_token_issued: "vdg.auth.access_token_issued",
  session_token: "vdg.session-token"
};
function resolveIdentityCacheKeys(wasm) {
  const resolved = wasm.auth_identity_cache_keys();
  _keys = {
    role_cache: resolved.role_cache,
    id_token: resolved.id_token,
    profile: resolved.profile,
    access_token: resolved.access_token,
    access_token_exp: resolved.access_token_exp,
    access_token_issued: resolved.access_token_issued,
    session_token: resolved.session_token
  };
}
var roleCacheKey = () => _keys.role_cache;
var idTokenKey = () => _keys.id_token;
var profileKey = () => _keys.profile;
var accessTokenKey = () => _keys.access_token;
var accessTokenExpKey = () => _keys.access_token_exp;
var accessTokenIssuedKey = () => _keys.access_token_issued;
var sessionTokenKey = () => _keys.session_token;

export {
  resolveIdentityCacheKeys,
  roleCacheKey,
  idTokenKey,
  profileKey,
  accessTokenKey,
  accessTokenExpKey,
  accessTokenIssuedKey,
  sessionTokenKey
};
