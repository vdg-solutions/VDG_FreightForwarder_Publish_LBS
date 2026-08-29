import {
  ROLE_ACCOUNTANT,
  ROLE_AUDITOR,
  ROLE_CUSTOMER_SERVICE,
  ROLE_MANAGER,
  ROLE_PRICING,
  ROLE_SALES_MANAGER,
  ROLE_SALES_REP
} from "./chunk-CTHPHM7D.js";

// output/web/js.tmp/implementations/ui/core_abstractions/ports/manager/users-view-composer.js
var ROLE_VALUES = [
  ROLE_MANAGER,
  ROLE_SALES_MANAGER,
  ROLE_SALES_REP,
  ROLE_CUSTOMER_SERVICE,
  ROLE_ACCOUNTANT,
  ROLE_AUDITOR
];
var ASSIGNABLE_ROLES = [...ROLE_VALUES, ROLE_PRICING];
var ROLE_LABEL_KEYS = {
  [ROLE_MANAGER]: "admin.users.role.manager",
  [ROLE_SALES_MANAGER]: "admin.users.role.sales_manager",
  [ROLE_SALES_REP]: "admin.users.role.sales_rep",
  [ROLE_CUSTOMER_SERVICE]: "admin.users.role.customer_service",
  [ROLE_ACCOUNTANT]: "admin.users.role.accountant",
  [ROLE_AUDITOR]: "admin.users.role.auditor",
  [ROLE_PRICING]: "admin.users.hat.pricing"
  // a hat, so its label reads as one
};
function rolesFromForm(overlay) {
  const ticked = new Set([...overlay.querySelectorAll("input[data-role]")].filter((el) => el.checked).map((el) => el.dataset.role));
  return ASSIGNABLE_ROLES.filter((r) => ticked.has(r));
}
function roleCheckboxesHtml(current = [], labelFor = (r) => r) {
  const held = new Set(current || []);
  return ASSIGNABLE_ROLES.map((r) => `
    <label class="flex items-center gap-2 text-xs text-slate-600">
      <input type="checkbox" data-role="${r}" ${held.has(r) ? "checked" : ""} class="rounded border-slate-300" />
      ${labelFor(r)}
    </label>`).join("");
}
var _impl = null;
function bindUsersViewComposer(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/users-view-composer: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var isValidEmail = (...a) => _i().isValidEmail(...a);
var filterUsers = (...a) => _i().filterUsers(...a);
var sortUsersByEmail = (...a) => _i().sortUsersByEmail(...a);

export {
  ROLE_VALUES,
  ROLE_LABEL_KEYS,
  rolesFromForm,
  roleCheckboxesHtml,
  bindUsersViewComposer,
  isValidEmail,
  filterUsers,
  sortUsersByEmail
};
