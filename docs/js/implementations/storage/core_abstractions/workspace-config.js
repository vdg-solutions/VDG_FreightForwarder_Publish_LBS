// workspace-config.js — what the build was published FOR: the tenant's workspace name. Stamped
// into the bundle at publish time (make dist substitutes the placeholder from tenants/<id>.json);
// an unsubstituted value is a dev build.
//
// F-46-06: BUILD_ROOT_ID / isBoundBuild() are gone — they named the tenant's Drive folder id
// (F-42-07's fix for a Drive-only bug: a build carrying just a NAME could resolve against a
// signed-in account's OWN Drive folder of that name instead of the customer's). CharterDB has no
// folder to bind to; grepping the whole frontend/js tree found zero callers of either export.
// The Makefile/publish.sh still know how to stamp a WORKSPACE_ROOT_ID_PLACEHOLDER (client/tools/
// publish.sh, client/Makefile's dist target) — that build-tooling half is untouched here; it is a
// loud failure (`make dist` refuses a bound-tenant publish it can no longer substitute into
// anything) rather than a silent one, and retiring it is a build-pipeline change, not a JS one.
export const WORKSPACE_NAME = (() => {
  const raw = 'LBS';
  return raw.startsWith('WORKSPACE_NAME_') ? 'LBS' : raw;
})();

// The API origin the server adapter talks to. Empty (unsubstituted) = same origin as the page:
// a localhost run of vdg-server serving its own bundle, or a serverless deploy where the health
// probe finds nothing and the Drive adapter is selected. A GitHub Pages deploy that talks to a
// tunneled vdg-server sets it at publish time.
export const API_BASE = (() => {
  const raw = 'https://vdg-lbs-edge.lbs-vdg.workers.dev';
  return raw.startsWith('VDG_API_BASE_') ? '' : raw.replace(/\/+$/, '');
})();
