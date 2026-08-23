// workspace-config.js — what the build was published FOR: the tenant's workspace name and, in a
// bound build, the id of its actual root. Stamped into the bundle at publish time (make dist
// substitutes the placeholders from tenants/<id>.json); an unsubstituted value is a dev build.

// Legacy-only: used by onboarding's checkWorkspaceExists() to offer a one-time migrate/bind
// prompt for a pre-license folder (greenfield rule — NOT a fallback for findWorkspaceRoot).
export const WORKSPACE_NAME = (() => {
  const raw = 'LBS';
  return raw.startsWith('WORKSPACE_NAME_') ? 'LBS' : raw;
})();

// F-42-07: the tenant's ACTUAL Drive folder, stamped into the bundle at publish time from
// tenants/<id>.json. Until this existed a tenant build carried only a NAME, and every signed-in
// account resolved that name against ITS OWN Drive, owner-first — so a user who happened to own a
// folder called "LBS" was bound to their own private folder instead of the customer's workspace,
// and the first-run rule ("admin/ not seeded → the creator is Manager") then made them Manager of
// it. Observed live: sol.vdg01 opening the customer's published build landed in sol.vdg01's own
// retired LBS folder. A name is a search term; identity is an id.
export const BUILD_ROOT_ID = (() => {
  const raw = 'LBS';
  return raw.startsWith('WORKSPACE_ROOT_ID_') ? '' : raw; // unsubstituted = dev build, resolve by name
})();

/// A tenant build knows its root by id; a dev build resolves it by name.
export function isBoundBuild() { return BUILD_ROOT_ID !== ''; }

// The API origin the server adapter talks to. Empty (unsubstituted) = same origin as the page:
// a localhost run of vdg-server serving its own bundle, or a serverless deploy where the health
// probe finds nothing and the Drive adapter is selected. A GitHub Pages deploy that talks to a
// tunneled vdg-server sets it at publish time.
export const API_BASE = (() => {
  const raw = 'https://vdg-lbs-edge.lbs-vdg.workers.dev';
  return raw.startsWith('VDG_API_BASE_') ? '' : raw.replace(/\/+$/, '');
})();
