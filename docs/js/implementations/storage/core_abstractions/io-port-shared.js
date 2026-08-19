// io-port-shared.js — the half of the wasm IO port that does not depend on where the bytes go:
// the local cache tier, the app event bus, the author identity, the ledger repo. Every storage
// authority's IoPort (Drive, vdg-server) extends this and adds only the drive_*/ws_* half.

import { localStore } from './local-store.js';
import { dispatchAppEvent } from './events.js';
import { getCurrentUser } from './identity.js';
import { ledgerRepo } from './ledger-repo.js';

const UNKNOWN_AUTHOR = 'unknown';

export class SharedIoPort {
  constructor(userEmail) {
    this.userEmail = userEmail;
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

  async ledger_get_chart()                         { return ledgerRepo().chartOfAccounts(); }
  async ledger_get_rules()                         { return ledgerRepo().postingRules(); }
  async ledger_is_posted(posted_index)             { return ledgerRepo().isAlreadyPosted(posted_index); }
  async ledger_append_leg(year, account_code, leg) { return ledgerRepo().appendLeg(year, account_code, leg); }
  async ledger_record_posted(posted_index, ids)    { return ledgerRepo().recordPosted(posted_index, ids); }
}
