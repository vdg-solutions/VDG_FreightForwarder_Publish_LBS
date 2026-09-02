// io-port-shared.js — the half of the wasm IO port that does not depend on where the bytes go:
// the local cache tier, the app event bus, the author identity, the ledger repo. Every network
// method of the port is implemented in Rust (js_io.rs over http_io); this is the local half.

import { localStore } from './local-store.js';
import { dispatchAppEvent } from './events.js';
import { getCurrentUser } from './identity.js';

const UNKNOWN_AUTHOR = 'unknown';
const LEDGER_NOT_MOUNTED = 'ledger repo not mounted yet';

export class SharedIoPort {
  /// `ledgerRepoRef` is a thunk, not the repo: this port is built at build-repo-stack, while the
  /// wasm ledger repo is mounted later in deferred init. The outbox drain that calls the ledger_*
  /// methods below runs after both, so resolving late is the only ordering that works. The
  /// composition root supplies it (bootstrap/compose.js) — no global read from this layer.
  constructor(userEmail, ledgerRepoRef = null) {
    this.userEmail = userEmail;
    this._ledgerRepoRef = ledgerRepoRef;
  }

  _ledger() {
    const repo = this._ledgerRepoRef?.();
    if (!repo) throw new Error(LEDGER_NOT_MOUNTED);
    return repo;
  }

  cache_get(kind, id)       { return localStore().cache_get(kind, id); }
  cache_list(kind)          { return localStore().cache_list(kind); }
  cache_put(kind, id, body) { return localStore().cache_put(kind, id, body); }
  cache_delete(kind, id)    { return localStore().cache_delete(kind, id); }
  cache_get_meta(key)       { return localStore().cache_get_meta(key); }
  cache_put_meta(key, body) { return localStore().cache_put_meta(key, body); }

  async dispatch_event(eventName, detail) {
    dispatchAppEvent(eventName, detail);
  }

  // Author identity for _rev_by provenance (F-28-06) — the live signed-in user, falling back to
  // the boot-time email this port was constructed with.
  async current_user_email() {
    let live = null;
    try { live = getCurrentUser(); } catch { live = null; /* no provider bound yet — the boot-time email stands in */ }
    return live?.email || this.userEmail || UNKNOWN_AUTHOR;
  }

  async ledger_get_chart()                         { return this._ledger().chartOfAccounts(); }
  async ledger_get_rules()                         { return this._ledger().postingRules(); }
  async ledger_is_posted(posted_index)             { return this._ledger().isAlreadyPosted(posted_index); }
  async ledger_append_leg(year, account_code, leg) { return this._ledger().appendLeg(year, account_code, leg); }
  async ledger_record_posted(posted_index, ids)    { return this._ledger().recordPosted(posted_index, ids); }
}
