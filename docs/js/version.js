// The running build's version, substituted at `make dist` from the git tag — the same
// v0.3.61 the sidebar and login screen show, so there is one answer to "which build is
// this" no matter who asks.
//
// It used to be a hardcoded '1.0.0', which broke the only two things that read it: every error-log
// record stamped 1.0.0 regardless of the deployed build (making the field useless for telling
// which release produced a crash), and the "what's new" banner keyed off it fired once ever and
// then never again, because the value it compares against never changed.
export const APP_VERSION = 'v0.3.61';
