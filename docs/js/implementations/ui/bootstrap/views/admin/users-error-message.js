// users-error-message.js — turns a failed /api/users call into the sentence a manager reads.
// F-46-03/i18n: the server answers a refusal with {reason, params} (CDB-API-09) -- reason is a
// CODE (user_errors.rs), never a sentence, because a sentence minted in Rust has no language but
// the one it was typed in. One helper here so the add/edit/deactivate call sites each get the
// same lookup instead of growing their own copy of the same `if`.

import { t } from '../../../../kernel/core_abstractions/i18n/index.js';
import { ROLE_LABEL_KEYS } from '../../../core_abstractions/ports/manager/users-view-composer.js';

// Every reason server/src/core_abstractions/user_errors.rs can send for create_user/patch_user.
// Kept in sync by hand -- a code missing here falls through to the generic line below instead of
// painting the raw code on screen.
const KNOWN_CODES = new Set([
  'role_unknown', 'roles_required',
  'already_exists', 'last_manager', 'email_invalid', 'roles_empty_use_deactivate', 'write_conflict',
]);

// A bare reason code reads as one run of lowercase/underscore (`not_found`, `role_unknown`) --
// used only to tell "a code this list forgot to map" (-> generic fallback) apart from "a message
// a lower layer already built as a full sentence" (-> show it as-is, e.g. a network failure).
const CODE_SHAPE = /^[a-z][a-z0-9_]*$/;

function roleLabel(role) {
  return role ? t(ROLE_LABEL_KEYS[role] || role) : role;
}

/// ApiError -> the sentence to show for a failed create/patch on /api/users. A recognized code
/// renders through `users.error.<code>` with its params (role names translated to the same labels
/// the checkboxes use); anything else falls back to the raw message when it already reads as a
/// sentence, or a generic refusal when it looks like a code this list forgot -- never a blank
/// string and never the bare code/key painted on screen.
export function usersErrorMessage(err) {
  const code = err?.message || '';
  if (KNOWN_CODES.has(code)) {
    const params = { ...(err.params || {}) };
    for (const key of ['role', 'role_a', 'role_b']) {
      if (key in params) params[key] = roleLabel(params[key]);
    }
    return t(`users.error.${code}`, params);
  }
  if (CODE_SHAPE.test(code)) return t('users.error.generic');
  return code || t('users.error.generic');
}
