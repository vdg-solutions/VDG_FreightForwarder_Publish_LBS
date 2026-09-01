// users-view-composer — port: the admin Users CRUD view (F-24-04). The role vocabulary and the
// checkbox markup are the ui's own — a view must not reach into another module to learn the names
// of the roles it renders.

import { ROLE_MANAGER, ROLE_SALES_MANAGER, ROLE_SALES_REP, ROLE_CUSTOMER_SERVICE,
         ROLE_ACCOUNTANT, ROLE_AUDITOR } from '../../roles.js';

export { ROLE_MANAGER, ROLE_SALES_MANAGER, ROLE_SALES_REP, ROLE_CUSTOMER_SERVICE,
         ROLE_ACCOUNTANT, ROLE_AUDITOR };

export const ROLE_VALUES = [ROLE_MANAGER, ROLE_SALES_MANAGER, ROLE_SALES_REP,
                            ROLE_CUSTOMER_SERVICE, ROLE_ACCOUNTANT, ROLE_AUDITOR];

// #28: roles are a FLAT SET — one person holds as many as the job needs (a manager who also sells;
// a sales rep who also keeps the rate cards). ROLE_VALUES stays the filter-bar vocabulary;
// ASSIGNABLE_ROLES is what the add/edit form offers as checkboxes.
// Every role is assignable; the two-tier primary/hat split died with `Pricing` (2026-08-30).
export const ASSIGNABLE_ROLES = [...ROLE_VALUES];

// The add and edit modals used to keep one copy of this map each, and both had to be remembered
// when a role was added — a role missing here renders its raw enum name in the checkbox list.
export const ROLE_LABEL_KEYS = {
  [ROLE_MANAGER]:          'admin.users.role.manager',
  [ROLE_SALES_MANAGER]:    'admin.users.role.sales_manager',
  [ROLE_SALES_REP]:        'admin.users.role.sales_rep',
  [ROLE_CUSTOMER_SERVICE]: 'admin.users.role.customer_service',
  [ROLE_ACCOUNTANT]:       'admin.users.role.accountant',
  [ROLE_AUDITOR]:          'admin.users.role.auditor',
};

/// Ticked roles, returned in ASSIGNABLE_ROLES order so the wire format is stable. Reads the form
/// the caller hands in — markup is the view's, which is why it never left the ui.
export function rolesFromForm(overlay) {
  const ticked = new Set([...overlay.querySelectorAll('input[data-role]')]
    .filter((el) => el.checked)
    .map((el) => el.dataset.role));
  return ASSIGNABLE_ROLES.filter((r) => ticked.has(r));
}

/// Checkbox list shared by the add and edit modals.
export function roleCheckboxesHtml(current = [], labelFor = (r) => r) {
  const held = new Set(current || []);
  return ASSIGNABLE_ROLES.map((r) => `
    <label class="flex items-center gap-2 text-xs text-slate-600">
      <input type="checkbox" data-role="${r}" ${held.has(r) ? 'checked' : ''} class="rounded border-slate-300" />
      ${labelFor(r)}
    </label>`).join('');
}

let _impl = null;

/// Root bootstrap binds { isValidEmail, filterUsers,
/// sortUsersByEmail } once.
export function bindUsersViewComposer(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/users-view-composer: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (email) -> well-formed enough to submit (Google OAuth is the real identity check)
export const isValidEmail = (...a) => _i().isValidEmail(...a);
/// (users, { search, role, activeFilter }) -> the matching users
export const filterUsers = (...a) => _i().filterUsers(...a);
/// (users) -> alphabetical by address
export const sortUsersByEmail = (...a) => _i().sortUsersByEmail(...a);
