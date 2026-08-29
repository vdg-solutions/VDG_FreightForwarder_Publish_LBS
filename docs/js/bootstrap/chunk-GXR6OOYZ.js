import {
  ROLE_MANAGER
} from "./chunk-V5JGKO5Q.js";
import {
  t
} from "./chunk-MGTH6QM4.js";

// output/web/js.tmp/implementations/kernel/core_abstractions/util/sales-rep-i18n.js
var MANAGER_SENTINEL = "__MANAGER__";
var SENTINEL_SHAPE = /^__.*__$/;
var MANAGER_ROLE_LABEL_KEY = "admin.users.role.manager";
var SAFE_FALLBACK = "\u2014";
function managerRoleLabel(tFn) {
  const label = tFn(MANAGER_ROLE_LABEL_KEY);
  return label === MANAGER_ROLE_LABEL_KEY ? ROLE_MANAGER : label;
}
function resolveSalesRepLabel(token, currentUser = null, tFn = t) {
  if (!token) return "";
  if (!SENTINEL_SHAPE.test(token)) return token;
  if (token === MANAGER_SENTINEL) {
    const name = currentUser?.name || currentUser?.email;
    return name || managerRoleLabel(tFn);
  }
  return SAFE_FALLBACK;
}

export {
  resolveSalesRepLabel
};
