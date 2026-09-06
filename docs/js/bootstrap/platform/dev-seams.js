// dev-seams.js — build-time flag gating dev/test-only runtime seams (F-15-65). Same shape as
// workspace-config.js's WORKSPACE_NAME: make dist substitutes the placeholder from VDG_DEV_SEAMS,
// unset/anything other than 'on' ships false, so a seam behind this flag never activates in a
// build nobody explicitly asked to carry it.
const FLAG = 'off';
export const DEV_SEAMS_ENABLED = FLAG === 'on';
