// platform/manager.js — extra platform methods the Rust manager use-cases import (js_manager.rs
// extern type). The reconciler and the repost need the double-entry journal, which lives behind
// the storage module's LedgerRepo rather than behind the entity records port.
import { ledgerRepo } from '../../implementations/storage/core_abstractions/ledger-repo.js';

export const managerPlatform = {
  ledger_chart_of_accounts:   ()                    => ledgerRepo().chartOfAccounts(),
  ledger_posting_rules:       ()                    => ledgerRepo().postingRules(),
  ledger_existing_account_codes: (year)             => ledgerRepo().listAccountCodes(year),
  ledger_list_legs:           (year, acc_code)      => ledgerRepo().listLegs(year, acc_code, null, null),
  ledger_replace_leg:         (year, acc_code, leg) => ledgerRepo().replaceLeg(year, acc_code, leg),
  ledger_remove_entry:        (year, entry_id)      => ledgerRepo().removeEntry(year, entry_id),
  ledger_append_reconciliation: (record)            => ledgerRepo().appendReconciliationRecord(record),
  ledger_last_reconciliation: ()                    => ledgerRepo().getLastReconciliation(),
  ledger_append_repost:       (record)              => ledgerRepo().appendRepostRecord(record),
};
