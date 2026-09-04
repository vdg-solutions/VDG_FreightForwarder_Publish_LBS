// workspace-config.js — what the build was published FOR: the tenant's workspace name. Stamped
// into the bundle at publish time (make dist substitutes the placeholder from tenants/<id>.json);
// an unsubstituted value is a dev build.
//
// F-46-06: BUILD_ROOT_ID / isBoundBuild() are gone — they named the tenant's Drive folder id
// (F-42-07's fix for a Drive-only bug: a build carrying just a NAME could resolve against a
// signed-in account's OWN Drive folder of that name instead of the customer's). CharterDB has no
// folder to bind to; grepping the whole frontend/js tree found zero callers of either export.
// 2026-08-30: the build-tooling half is gone too — client/tools/publish.sh and client/Makefile's
// dist target no longer read/stamp workspace_root_id (tenants/*.json dropped the key), so a
// tenant config can no longer declare a binding this file has nothing left to receive.
export const WORKSPACE_NAME = (() => {
  const raw = 'LBS';
  // Unsubstituted = a build no publish stamped, so it belongs to NO tenant. Naming one here put
  // the customer's workspace name into every other tenant's bundle, and callers already expect
  // the empty case (`|| null`, `|| ''` at the three platform ports). Same shape as API_BASE below.
  return raw.startsWith('WORKSPACE_NAME_') ? '' : raw;
})();

// The API origin the server adapter talks to. Empty (unsubstituted) = same origin as the page: a
// localhost run of vdg-server serving its own bundle. A GitHub Pages deploy that talks to a
// tunneled vdg-server sets it at publish time.
export const API_BASE = (() => {
  const raw = 'https://vdg-lbs-edge.lbs-vdg.workers.dev';
  return raw.startsWith('VDG_API_BASE_') ? '' : raw.replace(/\/+$/, '');
})();
