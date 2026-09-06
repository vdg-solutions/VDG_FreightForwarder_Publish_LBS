/* tslint:disable */
/* eslint-disable */

/**
 * The AWB storage adapter the manager AWB grid reads and writes through.
 */
export class AwbRepo {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    append(awb: any): Promise<any>;
    deleteByAwbNo(awb_no: string, ym: string): Promise<any>;
    listByMonth(ym: string): Promise<any>;
}

export class CustomerIndex {
    free(): void;
    [Symbol.dispose](): void;
    add_customer(json_str: string): boolean;
    constructor();
    search(query: string, top_k: number): string;
}

/**
 * The fx-rate storage adapter the manager grid, the sales-new form and period close read through.
 */
export class FxRateRepo {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    appendRate(entry_json: string, role: string): Promise<any>;
    deleteEntry(valid_from: string, valid_to: string, pair: string): Promise<any>;
    /**
     * `direction`: 'Buy'|'Sell' — Circular 200 values assets at the buying rate and liabilities at
     * the selling rate; every caller states which side it wants. Returns the resolved rate.
     */
    getRate(date_str: string, pair: string, direction: string): Promise<any>;
    /**
     * B-15-38-02: does the loaded rate table hold rows the parser refused? The deviation gate
     * asks before deciding what an absent reference MEANS — an unread row is a blind check, an
     * unfilled date is not. Answers for the months already ingested; the gate runs after a save
     * has loaded them.
     */
    hasUnreadableRates(): boolean;
    invalidateMonth(ym: string): void;
    listAll(): Promise<any>;
    listByMonth(ym: string): Promise<any>;
    pnlFxCacheClear(): void;
    pnlFxCacheGet(date_str: string, pair: string, direction: string): any;
    pnlFxCachePut(date_str: string, pair: string, direction: string, rate?: number | null): void;
    pnlFxLookupPair(currency: string): string | undefined;
    pnlFxRequireDirection(direction: string): void;
}

/**
 * `window.__vdg_ledger_repo`. Method names are the JS ones the accounting views, the close-period
 * screen, the repost panel and `flows_ledger_call`'s dynamic dispatch already use.
 */
export class LedgerRepo {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    appendLeg(year: number, acc_code: string, leg: any): Promise<any>;
    appendReconciliationRecord(record: any): Promise<any>;
    appendRepostRecord(record: any): Promise<any>;
    /**
     * The chart, as the array the views iterate. Bundled, so this never touches the network.
     */
    chartOfAccounts(): Promise<any>;
    /**
     * Write both seeds into the store if they are not there yet. Content comes from the binary,
     * not from two fetches.
     */
    ensureSeedFiles(): Promise<any>;
    /**
     * F1: the posted-index row (with entry_ids) for a dedup key, or null.
     */
    findPosted(posted_index: string): Promise<any>;
    getBalance(acc_code: string, as_of: string): Promise<any>;
    getLastReconciliation(): Promise<any>;
    getLastRepost(): Promise<any>;
    isAlreadyPosted(posted_index: string): Promise<any>;
    listAccountCodes(year: number): Promise<any>;
    listAllLegsInEntry(entry_id: string): Promise<any>;
    /**
     * `dateFrom`/`dateTo` are nullable at the call sites (reports.js passes null,null) — an
     * absent bound collapses to the empty string the operator reads as "no bound", same as the
     * JS `dateFrom || ''` it replaces.
     */
    listLegs(year: number, acc_code: string, date_from?: string | null, date_to?: string | null): Promise<any>;
    /**
     * PostingRulesSeed (pnl_lines / tax_accrual / commissions / pnl_kind_live). Bundled.
     */
    postingRules(): Promise<any>;
    recordPosted(posted_index: string, entry_ids: any): Promise<any>;
    /**
     * F1: drop a posted-index row — only after its entries were reversed.
     */
    releasePosted(posted_index: string): Promise<any>;
    removeEntry(year: number, entry_id: string): Promise<any>;
    replaceLeg(year: number, acc_code: string, leg: any): Promise<any>;
}

/**
 * `window.__vdg_user_repo` — the grants/ staff table, one record per person.
 */
export class UserRepo {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Bootstrap: seed the table with the current user iff it is empty. The workspace label comes
     * from the licensed workspace, the same answer the governance use-cases read.
     */
    ensureSeeded(current_user: any): Promise<any>;
    get(email: string): Promise<any>;
    /**
     * Active users, latest `_ledger_version` per email.
     */
    list(): Promise<any>;
    /**
     * Every user including deactivated ones — the admin table filters them, it does not hide them.
     */
    listAll(): Promise<any>;
    /**
     * H4-e: the raw stored shape, no Users-screen projection — the workspace backup export's reach.
     */
    listRaw(): Promise<any>;
    /**
     * Soft-delete (`active:false`) — never a hard delete. A row that really went inactive earns a
     * `deactivate_user` trail entry carrying the role it held.
     */
    remove(email: string): Promise<any>;
    /**
     * A first-time add earns an `add_user` trail row carrying the role it was created with.
     */
    upsert(user: any): Promise<any>;
}

export class WasmEntityRepo {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Mount point for the ui `awbRepo` port (compose-ui/storage.js).
     */
    awbRepo(): AwbRepo;
    awb_append(awb_json: string): Promise<any>;
    awb_delete(awb_no: string, ym: string): Promise<any>;
    /**
     * H4-d: every AWB across every month — same shape as `fx_list_all` above.
     */
    awb_list_all(): Promise<any>;
    awb_list_by_month(ym: string): Promise<any>;
    delete(kind: string, id: string): Promise<any>;
    drain_outbox(): Promise<any>;
    /**
     * A CLOSED period outside the eager set (period_window.rs) -- a screen reaching back before
     * current/previous calls this before it reads the kind, so a period never fetched gets
     * loaded exactly once; a period already cached, or still inside the eager set, is a no-op.
     * No-op for a kind that is not period-scoped (cache_policy::is_period_scoped) -- load-all
     * already covers every period for those.
     */
    ensure_period_loaded(kind: string, period: string): Promise<any>;
    /**
     * Compare-and-swap through CharterDB's own `If-Match`. A lost race (412) ANSWERS rather than
     * failing — jobno_lease.rs re-reads and claims again on exactly that status.
     */
    flows_cas_put(file_id: string, body: string, etag: string): Promise<any>;
    /**
     * Read the counter record or seed it. `owner` is the shell's signed-in identity — the one
     * fact JS still supplies, and not a CharterDB read (CDB-DM-04: an owner is declared, never
     * minted server-side from the session).
     */
    flows_get_or_create_record(collection: string, name: string, content: string, owner: string): Promise<any>;
    /**
     * Mount point for the ui `fxRateRepo` port (compose-ui/storage.js).
     */
    fxRateRepo(): FxRateRepo;
    /**
     * Apply fx_rate_prepare_append's pending writes (JSON [{path, line}]).
     */
    fx_apply_writes(writes_json: string): Promise<any>;
    fx_delete_entry(valid_from: string, valid_to: string, pair: string): Promise<any>;
    fx_invalidate_month(ym: string): void;
    fx_list_all(): Promise<any>;
    fx_list_by_month(ym: string): Promise<any>;
    /**
     * [{ym, content}] for every month not yet handed to the fx domain island.
     */
    fx_months_to_ingest(): Promise<any>;
    get(kind: string, id: string): Promise<any>;
    /**
     * Ids of every record of `kind` whose `column` equals `value`.
     *
     * Resolves `{ ids, reads }`. `reads` is how many record files had to be downloaded to answer
     * — the honest measure of whether the index earned its keep, and the number a test asserts on
     * instead of trusting a log line. 0 = the index covered the folder; N = it covered nothing and
     * this was a plain scan, which is still the RIGHT answer, just the slow one.
     */
    index_ids_where(kind: string, column: string, value: string): Promise<any>;
    /**
     * Same, for a record that left the table.
     */
    index_note_delete(kind: string, id: string): Promise<any>;
    /**
     * Fold a written record into every index its table declares. Best-effort by contract: the
     * read path reconciles, so a skipped update is a slower query and never a wrong one.
     */
    index_note_write(kind: string, id: string, version: string, row_json: string): Promise<any>;
    /**
     * The record already holding `value` on a UNIQUE column, or null. Null means the value is
     * free, and that is only trustworthy because the reader reconciles against the folder listing
     * before answering.
     */
    index_unique_holder(kind: string, column: string, value: string, by_id: string): Promise<any>;
    /**
     * A reopened period (period_close.rs's own reopen_period) invalidates THIS session's "fully
     * cached" marker for it -- see `ensure_period_loaded`'s own doc comment for the cross-client
     * gap this does not close.
     */
    invalidate_period_cache(kind: string, period: string): Promise<any>;
    /**
     * Mount point for `window.__vdg_ledger_repo` (repo-init-steps.js, deferred init).
     */
    ledgerRepo(): LedgerRepo;
    lgr_append_leg(year: number, acc_code: string, leg_json: string): Promise<any>;
    lgr_append_log(file: string, record_json: string): Promise<any>;
    lgr_ensure_seed_file(file_name: string, content: string): Promise<any>;
    /**
     * F1: posted-index row (with entry_ids) for a dedup key, or null — powers reopen's reverse.
     */
    lgr_find_posted(posted_index: string): Promise<any>;
    lgr_get_balance(acc_code: string, as_of: string): Promise<any>;
    lgr_is_posted(posted_index: string): Promise<any>;
    lgr_last_log(file: string): Promise<any>;
    /**
     * D17: which account codes have a file for this year — one listing so a repost scan skips
     * reading (and 404ing) every chart code against an empty book.
     */
    lgr_list_account_codes(year: number): Promise<any>;
    lgr_list_entry_legs(year: number, entry_id: string): Promise<any>;
    lgr_list_legs(year: number, acc_code: string, from: string, to: string): Promise<any>;
    lgr_record_posted(posted_index: string, entry_ids_json: string): Promise<any>;
    /**
     * F1: drop a posted-index row after its entries were reversed — see release_posted's doc.
     */
    lgr_release_posted(posted_index: string): Promise<any>;
    /**
     * Orphan purge only — see LedgerStoreOperator::remove_entry for why this is not a general delete.
     */
    lgr_remove_entry(year: number, entry_id: string): Promise<any>;
    lgr_replace_leg(year: number, acc_code: string, leg_json: string): Promise<any>;
    lgr_set_chart(chart_json: string): void;
    list(kind: string, owner?: string | null): Promise<any>;
    mint_quote_ref(salt: string): Promise<any>;
    mint_shipment_ref(direction: string, salt: string): Promise<any>;
    constructor(io: any);
    /**
     * (pending, quarantined) outbox row counts — the wasm boundary's initial-mount query so a
     * page reload sees a pre-existing quarantine on the very first paint (`OutboxOperator::
     * snapshot`'s own doc comment). Every LATER change already rides the existing
     * `vdg:outbox-changed`/`vdg:sync-complete` events, which now carry the same `quarantined`
     * field — this is only for the moment before either has fired yet this session.
     */
    outbox_snapshot(): Promise<any>;
    pref_get_state(ref_name: string): Promise<any>;
    pref_list_pending(ref_name: string): Promise<any>;
    pref_move_closed(ref_name: string, id: string, dto_json: string): Promise<any>;
    pref_read_pending(ref_name: string, id: string): Promise<any>;
    pref_seed_if_empty(ref_name: string, records_json: string): Promise<any>;
    pref_write_pending(ref_name: string, dto_json: string): Promise<any>;
    pref_write_state(ref_name: string, dto_json: string): Promise<any>;
    put(kind: string, id: string, body: any): Promise<any>;
    /**
     * CDB-DM-15: same as `put`, plus labels -- the ONE extra capability a period-bound kind
     * needs (freight_app's `Records::put_labeled`, e.g. `ShipmentRepo` stamping `period` at
     * create). `labels` only matters when this call is a CREATE (`EntityStoreOperator::put`'s own
     * rule); an edit of an existing record drops them silently, same as `put` always has.
     */
    put_labeled(kind: string, id: string, body: any, labels: any): Promise<any>;
    /**
     * CDB-DM-04: `put`, plus WHOSE row it is.
     *
     * `put` leaves the owner undeclared and the bridge falls back to the session, which is right
     * only while the writer and the owner are the same person. They are not when a Manager enters
     * a rep's revenue: charterdb-retire-the-fork.md §2 calls that default "silently makes a
     * Manager's entry steal the rep's job". This is the seam `storage_bridge.rs` already promised
     * -- "a future caller that DOES know its own owner is honored without a second, competing
     * derivation".
     */
    put_owned(kind: string, id: string, body: any, owner: string): Promise<any>;
    sync_delta(): Promise<any>;
    /**
     * Every kind currently failing this session (`sync_health::mark_failed`, armed from both
     * the pull side — `SyncDeltaOperator::bootstrap_once`/`run_delta` — and the push side —
     * `OutboxOperator::emit_sync_error`). Synchronous: it is an in-memory thread_local read, no
     * I/O — a view or the topbar can check it on every render without a Promise round trip.
     */
    sync_failed_kinds(): any;
    /**
     * One reason string for the chip tooltip — see `sync_health::first_failed_reason`'s own doc
     * comment for why one line, not the full per-kind list.
     */
    sync_failed_reason(): string | undefined;
    /**
     * H4-b: the server itself is unreachable this session (`sync_health::is_unreachable`) —
     * distinct from `sync_failed_kinds` being non-empty, which also fires on a single master
     * kind's bootstrap failing narrowly while everything else still works. Synchronous, same
     * shape as `sync_failed_kinds` above: the chip reads this on every render, no round trip.
     */
    sync_server_unreachable(): boolean;
    /**
     * Distinct records skipped for `kind` this session — the count a view's partial-data notice
     * names (`empty_state.load_failed.partial` / `pivot-table.js`'s own `skippedCount`).
     */
    sync_skipped_count(kind: string): number;
    /**
     * Every kind with at least one remote-skipped record this session (`SyncEvent::
     * RecordSkipped`, armed by `event_bridge.rs::emit`) — the same shape as `sync_failed_kinds`,
     * so a view (pnl-report.js's own load-outcome check) reads both registries the same way
     * instead of trusting an empty result as "no data for this period" (D13).
     */
    sync_skipped_kinds(): any;
    /**
     * Mount point for `window.__vdg_user_repo` (repo-init-steps.js, deferred init).
     */
    userRepo(): UserRepo;
    users_ensure_seeded(email: string, name: string, workspace: string): Promise<any>;
    users_get(email: string): Promise<any>;
    users_list(): Promise<any>;
    users_list_all(): Promise<any>;
    /**
     * H4-e: every grant, RAW stored shape, no UI projection — the workspace backup export's own
     * reach (see `UserStoreOperator::list_raw`'s own doc comment).
     */
    users_list_raw(): Promise<any>;
    users_remove(email: string): Promise<any>;
    users_upsert(user_json: string): Promise<any>;
}

export function __wasm_init(): void;

export function access_can_route(route: string, roles: string): boolean;

export function access_home_route(roles: string): string;

/**
 * Is this token an ACCOUNT — the thing a person signs in as? The sales-rep select stores it on a
 * job, and `account-id.js` used to answer it with a JS copy of the rule (its own header said
 * "Mirrors Rust"). One rule, one place.
 */
export function access_is_account(token: string): boolean;

export function access_redirect_for(route: string, roles: string): string;

/**
 * Roles carried by a users.jsonl record, as the comma-joined wire set. `roles` is the contract;
 * a legacy record with a single `role` reads back as a one-element set, so nothing needs
 * migrating. An unparsable record yields an EMPTY set — never a permissive default.
 */
export function access_roles_from_record(record_json: string): string;

/**
 * Applies a lifecycle event to the entity's stored state via the real
 * ShipmentFsm, persists the new state, and appends a transition record.
 */
export function apply_fsm_event(entity_id: string, event: string): any;

export function auth_adopt_session(req: any): Promise<any>;

export function auth_clear_role_cache(req: any): Promise<any>;

export function auth_detect_role(req: any): Promise<any>;

/**
 * The raw `/me` body, fetched in Rust. `server-role.js` used to call it with `apiFetch` and derive
 * the verdict itself — including a JS copy of `derive_fork`. Both are gone.
 *
 * A FREE export, not a method on the repo store, and that is the whole point. It never read
 * `self`: `me_http::fetch_me()` takes the API base from `option_env!` and the session from the
 * cookie, so no repo state was ever involved. Hanging it off the store nonetheless invented a
 * dependency that boot cannot satisfy — `requireAuth` runs BEFORE `runRepoInit`, so
 * `window.__vdg_repo` does not exist yet when the auth gate probes, and every cold-cache boot
 * died on "WASM repo not ready" (prod v0.4.52/v0.4.53). A warm RoleCache skipped the probe, which
 * is why it survived testing: the failure needed a first-ever load to show itself.
 *
 * `window.__vdg_wasm` is set by `wasm-loader.js` before `requireAuth` is reached, so the caller
 * this serves is satisfied by construction rather than by ordering luck.
 */
export function auth_fetch_me(): Promise<any>;

export function auth_has_role(req: any): any;

export function auth_require_auth(req: any): Promise<any>;

/**
 * Boot's final principal resolution: JS hands over the signed-in email, this reads the staff
 * table and republishes the whole principal — no role or identity decision left on the JS side.
 */
export function auth_resolve_principal(req: any): Promise<any>;

/**
 * `DELETE /session` — resolves `{ ok, status }`, never rejects: sign-out proceeds locally
 * whatever the server said.
 */
export function auth_session_close(): Promise<any>;

/**
 * `POST /session` — resolves `{ token: string|null }`; rejects on any refusal so the sign-in
 * flow fails whole instead of minting a local identity with no server session behind it.
 */
export function auth_session_open(google_token: string): Promise<any>;

export function auth_session_roles(req: any): any;

export function auth_set_resolved_roles(req: any): any;

export function cache_bulk_put(req: any): Promise<any>;

export function cache_can_write_master(req: any): any;

export function cache_find_match(req: any): any;

export function cache_route_prefetch(req: any): Promise<any>;

export function check_air_rate_transition(from: string, event: string): boolean;

export function check_air_shipment_transition(from: string, event: string, ctx_json: string): boolean;

export function check_allocation_within_mgw(tare_kg: number, mgw_kg: number, total_chargeable_kg: number): boolean;

export function check_awb_doc_transition(from: string, event: string): boolean;

/**
 * `items_json` = JSON array of `{id, code}` (JS projects whichever field the master keys on —
 * iata_code/scac/code/id — onto `code` before calling). Returns true when `code` is a
 * duplicate of some OTHER item's code (skip_id excluded).
 */
export function check_code_unique(items_json: string, code: string, skip_id?: string | null): boolean;

/**
 * F-14-xx kanban drag guard — affordance only, telling the board whether a drag target has ANY
 * transition wired between the two states. The FSM still runs its real guards on the move via
 * `shipment_move_to` and may refuse it even when this returns true (credit hold, open exception,
 * missing dependency, ...). Unknown/corrupt state names are simply not offered.
 */
export function check_shipment_transition(from_state: string, to_state: string): boolean;

/**
 * AC-10: case-insensitive prefix classify of a mục B description; falls back to `"Other"`.
 */
export function classify_pnl_line_kind(desc: string): string;

/**
 * Section C's prefilled TNCN pct before a manager edits a row (15, never enforced).
 */
export function commission_default_personal_tax_pct(): number;

/**
 * net_after_tax = gross - bank_charge - tax (Section C "Thực nhận").
 */
export function commission_net_after_tax(gross_vnd: number, bank_charge: number, tax_amount: number): number;

/**
 * TNCN withheld on a commission gross (whole VND, banker's rounding — see personal_tax.rs).
 */
export function commission_personal_tax(gross_vnd: number, tncn_pct_0_100: number): number;

/**
 * sales_share_pct precedence: shipment override > user config > workspace default (50).
 * `None` (JS `null`/`undefined`) means "not set" at that tier.
 */
export function commission_resolve_sales_share_pct(override_pct?: number | null, user_config_pct?: number | null): number;

/**
 * A rule is removable until a commission line has already been booked under it —
 * `entry_sales_ids_json` is a JSON array of the `created_by` of every loaded `commission_entry`
 * row. Returns the block reason, or null/undefined when the rule is safe to delete.
 */
export function commission_rule_block_reason(sales_id: string, entry_sales_ids_json: string): string | undefined;

/**
 * Validates `sales_pct_0_100` (0..100, `None`/undefined = default) and returns the verdict
 * `{ sales_pct, company_pct }` — company_pct is ALWAYS `100 - sales_pct` via the same `Split`
 * invariant the payout waterfall trusts. JS never computes `100 - x` itself.
 */
export function commission_rule_split(sales_pct_0_100?: number | null): any;

/**
 * Single-source profit waterfall for the UI: margin → TNDN(20%) → net → sales/LBS split.
 * `sales_pct_0_100` is the manager-set share (0–100). Returns whole-VND figures.
 * `clamp_negatives`: true for payout (loss → zero), false for the sales-form
 * preview (keep signed loss). This is the ONLY commission math JS may display.
 */
export function commission_waterfall(margin_vnd: number, com_deductions_vnd: number, sales_pct_0_100: number, clamp_negatives: boolean): any;

export function compute_dashboard_exceptions(shipments_json: string, now_ms: number, tz_offset_min: number): any;

export function compute_due_soon(billing_json: string, today_str: string, warn_days: number): any;

export function data_add_receivable_note(req: any): Promise<any>;

export function data_append_customer_note(req: any): Promise<any>;

export function data_approval_decision_log(req: any): Promise<any>;

export function data_audit_trail(req: any): Promise<any>;

export function data_cash_flow_inputs(req: any): Promise<any>;

export function data_cass_reconciliation_inputs(req: any): Promise<any>;

export function data_commission_basis_lines(req: any): Promise<any>;

export function data_commission_payouts(req: any): Promise<any>;

export function data_commission_rule_editor_inputs(req: any): Promise<any>;

export function data_commission_rule_suggestions(req: any): Promise<any>;

export function data_current_revision(req: any): Promise<any>;

export function data_customer360_inputs(req: any): Promise<any>;

export function data_delete_commission_rule(req: any): Promise<any>;

/**
 * Remove one row of one registered master kind — through the SAME registry + writer gate `save`
 * takes. The views reached the platform's generic delete before this existed, which asked the
 * registry nothing.
 */
export function data_delete_master(req: any): Promise<any>;

export function data_delete_pnl_lines(req: any): Promise<any>;

export function data_delete_shipment(req: any): Promise<any>;

export function data_exception_caseload(req: any): Promise<any>;

export function data_get_envelope(req: any): Promise<any>;

export function data_get_master(req: any): Promise<any>;

export function data_get_shipment(req: any): Promise<any>;

export function data_join_loaded(req: any): Promise<any>;

export function data_list_envelopes(req: any): Promise<any>;

export function data_list_masters(req: any): Promise<any>;

export function data_list_where(req: any): Promise<any>;

export function data_manifest_filings(req: any): Promise<any>;

export function data_mark_receivable_followed_up(req: any): Promise<any>;

/**
 * Replace a shipment's whole commission-entry set — the delete-then-write procedure, its id
 * scheme and its record shape, all decided in `CommissionEntries` rather than in a view file.
 */
export function data_overwrite_commission_entries(req: any): Promise<any>;

export function data_pending_approvals(req: any): Promise<any>;

export function data_period_close_record(req: any): Promise<any>;

export function data_pipeline_shipments(req: any): Promise<any>;

export function data_pnl_line_id(req: any): any;

export function data_pnl_report_inputs(req: any): Promise<any>;

export function data_promote_commission_suggestion(req: any): Promise<any>;

export function data_publish_billing(req: any): Promise<any>;

export function data_published_for(req: any): Promise<any>;

export function data_put_envelope(req: any): Promise<any>;

export function data_put_shipment(req: any): Promise<any>;

/**
 * The merge toast's "use mine" — see `MergeResolve::reapply_my_values` for why the collection in
 * the request is checked rather than taken.
 */
export function data_reapply_my_values(req: any): Promise<any>;

export function data_receivables_ledger(req: any): Promise<any>;

export function data_resolve_conflict(req: any): Promise<any>;

/**
 * The compensating half of a create that failed part-way — see `ShipmentRepo::rollback_create`
 * for why this is not `data_delete_shipment` with a different name.
 */
export function data_rollback_shipment_create(req: any): Promise<any>;

export function data_sales_profiles(req: any): Promise<any>;

export function data_save_commission_rule(req: any): Promise<any>;

/**
 * Write one row of one registered master kind. The key comes from the kind's declared key field
 * and the writer list from the same registry — the caller names the KIND and nothing else.
 */
export function data_save_master(req: any): Promise<any>;

export function data_suppress_duplicate_pair(req: any): Promise<any>;

export function data_write_gate(req: any): Promise<any>;

/**
 * F-41-07: `direction` may be `""` (unset); returns `""` when neither it nor `product` resolves.
 */
export function derive_shipment_direction(direction: string, product: string): string;

export function drain_events(): any;

/**
 * Run one or more statements with no result rows (DDL / INSERT / UPDATE / DELETE, no bind params).
 */
export function exec(sql: string): void;

export function flows_accept_quote(req: any): Promise<any>;

export function flows_active_sales_reps(req: any): Promise<any>;

export function flows_air_calc(req: any): any;

export function flows_approval_decide(req: any): Promise<any>;

export function flows_assert_rep_code(req: any): Promise<any>;

export function flows_assign_job_no(req: any): Promise<any>;

export function flows_assign_rep_code(req: any): Promise<any>;

export function flows_auto_advance(req: any): Promise<any>;

export function flows_build_entries_from_commission(req: any): any;

export function flows_build_entries_from_shipment(req: any): any;

export function flows_build_reversal_entry(req: any): any;

export function flows_chargeable_kg(req: any): any;

export function flows_clear_sales_registry(req: any): any;

export function flows_commit_pnl_report(req: any): Promise<any>;

export function flows_customer_rep(req: any): any;

export function flows_derive_sales_rep(req: any): any;

export function flows_edit_profile(req: any): Promise<any>;

export function flows_ensure_rep_code(req: any): Promise<any>;

export function flows_ensure_state_aliases(req: any): Promise<any>;

export function flows_export_workspace(req: any): Promise<any>;

export function flows_format_job_no(req: any): any;

export function flows_generate_quote_id(req: any): Promise<any>;

export function flows_license_error_key(req: any): any;

export function flows_license_resolve(req: any): Promise<any>;

export function flows_migrate_shipment_states(req: any): Promise<any>;

export function flows_mine_only(req: any): any;

export function flows_next_local_seq(req: any): Promise<any>;

export function flows_note_lines(req: any): any;

export function flows_persist_advanced_state(req: any): Promise<any>;

export function flows_pnl_fx_deviation(req: any): any;

export function flows_pnl_line_vnd(req: any): any;

export function flows_pnl_vnd_invariant(req: any): any;

export function flows_post_commission(req: any): Promise<any>;

export function flows_post_reversal(req: any): Promise<any>;

export function flows_post_shipment(req: any): Promise<any>;

export function flows_quote_affordance(req: any): any;

export function flows_quote_converted(req: any): Promise<any>;

export function flows_quote_delete_apply(req: any): Promise<any>;

export function flows_quote_delete_plan(req: any): any;

export function flows_quote_totals(req: any): any;

export function flows_register_entity(req: any): Promise<any>;

export function flows_rehydrate_fsm(req: any): Promise<any>;

export function flows_rep_code_valid(req: any): any;

export function flows_repo_max_seq(req: any): Promise<any>;

export function flows_sales_analytics(req: any): any;

export function flows_sales_commission(req: any): Promise<any>;

export function flows_sales_rep_by_account(req: any): any;

export function flows_save_quote_draft(req: any): Promise<any>;

export function flows_self_rep_candidate(req: any): any;

export function flows_send_quote(req: any): Promise<any>;

export function flows_shipment_affordance(req: any): any;

export function flows_slugify(req: any): any;

export function flows_void_apply(req: any): Promise<any>;

export function flows_void_plan(req: any): any;

/**
 * F4-d: the ONE date-display convention for the whole app, decided here rather than left to the
 * browser's `Intl` -- that is what drifted in the first place: `Intl.DateTimeFormat('vi', ...)`
 * picks a DIFFERENT separator for a day/month-only request than for a day/month/year one (proven
 * live: the exceptions trend axis showed `12-07`, the ledger's own date display showed
 * `12/07/2026`, same locale, same intent). A JS caller formatting a date is rendering; deciding
 * the convention is a rule, so it lives here -- JS only inserts the string this returns.
 * Accepts a bare `YYYY-MM-DD` (an `<input type="date">`'s `.value`, always this shape regardless
 * of the browser's display locale) or a full ISO timestamp; returns `""` for anything else.
 */
export function fmt_date_display(iso: string): string;

/**
 * H4-c: the literal-format explainer shown beside a date input that has no value yet
 * (date-input-hint.js) -- day/month/year, same order and separator `fmt_date_display` formats a
 * real value with. Declared right beside it on purpose: a future change to that `format!()`
 * call is the one place a reviewer would also see this literal needs the same edit.
 */
export function fmt_date_pattern_hint(): string;

/**
 * Installed once by js/bootstrap (after the wasm module is ready and the repo exists).
 */
export function freight_app_init(platform: any): void;

/**
 * F1: the bank never buys for more than it sells. Moved from util/validate-rate.js.
 */
export function fx_rate_validate_spread(raw_buy: string, raw_sell: string): void;

/**
 * AC-04: pre-submit rate check — same rule `fx_rate_prepare_append` enforces on write, exposed
 * so the UI can reject before attempting the append. Moved from util/validate-rate.js.
 */
export function fx_rate_validate_value(raw_value: string): void;

export function gen_uom_id(code: string): string;

export function get_entity_state(entity_id: string): any;

export function get_transition_log(entity_id: string): any;

export function get_validation_errors(): any;

export function governance_action_guard(req: any): any;

export function governance_allowed_actions(req: any): any;

export function governance_can_edit_default_currency(req: any): any;

export function governance_close_period(req: any): Promise<any>;

export function governance_close_records(req: any): Promise<any>;

export function governance_error_records(req: any): Promise<any>;

export function governance_filter_sidebar(req: any): any;

export function governance_find_lock(req: any): Promise<any>;

export function governance_home_route(req: any): any;

export function governance_load_settings(req: any): Promise<any>;

export function governance_lock_period(req: any): Promise<any>;

export function governance_locked_periods(req: any): Promise<any>;

export function governance_normalize_role(req: any): any;

export function governance_opening_balance(req: any): any;

export function governance_period_math(req: any): any;

export function governance_period_of(req: any): any;

export function governance_pre_close_checks(req: any): Promise<any>;

export function governance_purge_error_month(req: any): Promise<any>;

export function governance_reopen_period(req: any): Promise<any>;

export function governance_route_guard(req: any): any;

export function governance_save_settings(req: any): Promise<any>;

export function governance_unlock_period(req: any): Promise<any>;

export function governance_user_roles(req: any): any;

/**
 * Booking Excel import — returns ImportReport<CreateShipmentCommand> as JsValue.
 * On file-level error (wrong template) returns JsError with PARSE code.
 */
export function import_booking_excel_wasm(bytes: Uint8Array): any;

/**
 * Document Excel import → ImportReport<CreateDocumentCommand> as JsValue.
 */
export function import_document_excel_wasm(bytes: Uint8Array): any;

/**
 * P&L Excel import → ImportReport<PnlImportRowDto> as JsValue.
 */
export function import_pnl_excel_wasm(bytes: Uint8Array): any;

/**
 * F-20-11: classify AND arm the wasm write gate in one move. The boot gate calls THIS —
 * the verdict that reaches the repo's put/delete never round-trips through a JS value a
 * devtools user could edit. Every call re-arms; the latest classification wins.
 */
export function license_arm(license_str: string, current_unix_ts: bigint): any;

export function manager_air_invoice(req: any): any;

export function manager_air_pnl(req: any): any;

export function manager_ap_payables(req: any): any;

export function manager_ar_aging(req: any): any;

export function manager_ar_timeline(req: any): any;

export function manager_audit_log_csv(req: any): any;

export function manager_audit_log_range(req: any): any;

export function manager_audit_log_sort(req: any): any;

export function manager_commission_rules(req: any): Promise<any>;

export function manager_commission_sparkline(req: any): any;

export function manager_commissions(req: any): any;

export function manager_customer360(req: any): any;

export function manager_customer_mode_mix(req: any): any;

export function manager_dashboard(req: any): Promise<any>;

export function manager_demdet_overview(req: any): any;

export function manager_document_board(req: any): any;

export function manager_email_valid(req: any): any;

export function manager_exception_escalate(req: any): any;

export function manager_exception_mttr(req: any): any;

export function manager_exception_per_sales(req: any): any;

export function manager_exception_trends(req: any): any;

export function manager_exceptions_sorted(req: any): any;

/**
 * F-19-59: the finance dashboard's P&L by charge code, plus its totals.
 *
 * Pure like `manager_pnl_pivot` — the lines come in the request. The order of `rows` is part of
 * the answer (best margin first), not something the shell re-decides.
 */
export function manager_finance_dashboard(req: any): any;

export function manager_ledger_apply_repost(req: any): Promise<any>;

export function manager_ledger_auto_reconcile(req: any): Promise<any>;

export function manager_ledger_balance_sheet(req: any): any;

export function manager_ledger_chart_groups(req: any): any;

export function manager_ledger_csv(req: any): any;

export function manager_ledger_entry_totals(req: any): any;

export function manager_ledger_filter_legs(req: any): any;

export function manager_ledger_plan_repost(req: any): Promise<any>;

export function manager_ledger_pnl(req: any): any;

export function manager_ledger_pnl_monthly(req: any): any;

export function manager_ledger_purge_orphans(req: any): Promise<any>;

export function manager_ledger_reconcile(req: any): Promise<any>;

export function manager_ledger_running_balances(req: any): any;

export function manager_ledger_trial_balance(req: any): any;

export function manager_manifest_overview(req: any): any;

/**
 * The one margin-percent convention (`manager_rules::margin_pct`).
 *
 * Exported because the shell had THREE copies of it — pivot-table.js, finance-dashboard.js and
 * sales-new-form.js each re-derived `margin / revenue * 100` — and they did not agree on the
 * case that decides whether a figure is shown at all: at zero revenue one answered 0, one
 * answered null, and one rendered nothing. Rust has always answered 0. A number a manager reads
 * off two screens must not depend on which screen computed it.
 *
 * Plain args rather than a request DTO: it is arithmetic over two numbers the caller already
 * holds, and a JSON round-trip per rendered row would be the slower answer to the same question.
 */
export function manager_margin_pct(margin: number, revenue: number): number;

export function manager_notification_from_event(req: any): any;

export function manager_notifications_time_based(req: any): any;

export function manager_period_key(req: any): any;

export function manager_pnl_buy_sell(req: any): any;

export function manager_pnl_drill(req: any): any;

export function manager_pnl_pivot(req: any): any;

export function manager_self_approved_review(req: any): any;

export function manager_users_filter(req: any): any;

export function manager_users_sort(req: any): any;

export function permission_can_merge(role: string, ref_name: string): boolean;

/**
 * Minor-unit digit count for `currency` — DISPLAY only; storage keeps full precision.
 */
export function pnl_currency_exponent(currency: string): number;

/**
 * A line quoted in the workspace's book currency needs no conversion — locks fx_rate at 1.
 * Same `currency == book_currency` test `line_vnd` prices against (pnl_gate.rs); the input cell
 * and the money math read one fact, never two.
 */
export function pnl_line_fx_lock(currency: string, book_currency: string): any;

/**
 * Round a full-precision value to `currency`'s ISO 4217 exponent, for display only — never
 * writes back over the value it was derived from.
 */
export function pnl_round_for_display(value: number, currency: string): number;

/**
 * AC-05: `PricedRefRepo.resolveOnDate` calls this with every `PricedRecord`
 * body for the ref; a gap date returns the nearest-earlier row because Rust
 * says so, never a JS-computed guess.
 */
export function priced_ref_resolve_on_date(records_json: string, key: string, date_str: string): any;

export function process_excel_file(bytes: Uint8Array): any;

/**
 * AC-02, AC-03, AC-04, AC-07: applies + closes on maintainer success; a
 * non-maintainer or stale-base attempt throws — the caller never sees a
 * `MergeResultDto` for a denied merge.
 */
export function proposal_merge(proposal_json: string, ref_state_json: string, actor_role: string, actor_user: string): any;

/**
 * AC-01, AC-06, AC-07: propose returns a Pending ProposalDto to JS. Requires
 * only read access on `target_ref` — never maintainer rights.
 */
export function proposal_propose(input_json: string, author_role: string): any;

/**
 * R-3, AC-07: a maintainer may decline a Pending proposal without merging.
 */
export function proposal_reject(proposal_json: string, actor_role: string, actor_user: string, reason: string): any;

/**
 * Registers a shipment into the FSM state map — register-if-absent (AC-09
 * idempotency lives here, not in every JS caller). No-op if the entity
 * already has a stored state.
 */
export function register_entity(entity_id: string, state: string): void;

/**
 * Prepared write with text/null params — INSERT/UPDATE/DELETE that need bind params.
 */
export function run(sql: string, params_json: string): void;

export function sales_air_rate_cards(req: any): Promise<any>;

export function sales_billing_records(req: any): Promise<any>;

export function sales_carrier_masters(req: any): Promise<any>;

export function sales_commission_entries_for(req: any): Promise<any>;

export function sales_commission_rule_assignment(req: any): Promise<any>;

export function sales_container_type_options(req: any): Promise<any>;

/**
 * The search box's quick-create. Deduped against the masters, so an index miss cannot split a
 * customer across two ids.
 */
export function sales_create_customer_draft(req: any): Promise<any>;

export function sales_customer_for_note(req: any): Promise<any>;

export function sales_customer_masters(req: any): Promise<any>;

export function sales_demdet_instances(req: any): Promise<any>;

export function sales_document_sources(req: any): Promise<any>;

/**
 * The post-write look-again: the lowest shipment_ref keeps a contested number, the loser re-mints
 * and re-saves, and the D-O / HBL that mirrored it follow.
 */
export function sales_heal_job_no(req: any): Promise<any>;

export function sales_ledger_version(req: any): any;

/**
 * May the signed-in reader be shown a job's TOTAL profit or loss?
 *
 * Not "is there a sell figure in what came back" — that question let a rep who received one of
 * three revenue lines be shown a company-level number summed from a partial set, which reads as a
 * 71-million loss on a job that made 48 million. See `access_policy::may_see_job_total`.
 */
export function sales_may_see_job_total(): boolean;

export function sales_pnl_lines(req: any): Promise<any>;

export function sales_pnl_lines_for(req: any): Promise<any>;

export function sales_publish_state(req: any): any;

export function sales_quotation(req: any): Promise<any>;

export function sales_quotations(req: any): Promise<any>;

export function sales_ref_prefix(req: any): any;

export function sales_rep_profile(req: any): Promise<any>;

export function sales_resolve_job_no(req: any): Promise<any>;

export function sales_share_total(req: any): Promise<any>;

export function sales_shipment_commission_snapshot(req: any): Promise<any>;

/**
 * Which month a job's numbers belong to, or `null` when it carries no date at all.
 *
 * The sales workspace decided this in JS off `etd || prep_date || date`, and a job with none of
 * them fell out of every month — a September job holding 63,512,000 VND of margin was counted
 * nowhere while the same screen listed it two rows below. `shipment_month` states the rule and
 * this is the only door to it.
 */
export function sales_shipment_month(row: any): any;

export function sales_validate_submission(req: any): any;

export function sales_weight_unit_codes(req: any): Promise<any>;

/**
 * Both row sets a shipment carries, replaced in ONE call — not one call per row.
 */
export function sales_write_side_records(req: any): Promise<any>;

/**
 * Generic select export — kept for the one remaining ad-hoc caller path; returns a JSON array of
 * row objects. Business queries go through `sqlite_store`, not this.
 */
export function select(sql: string, params_json: string): string;

/**
 * Periodic poll: resolves the `vdg:server-health` detail, or `null` when this tick got no
 * answer. Never rejects.
 */
export function server_health_poll(): Promise<any>;

/**
 * Boot-time probe: resolves the `vdg:server-health` detail to dispatch, or `null` when the
 * server answered healthy. Never rejects — an outage IS the resolved value.
 */
export function server_health_probe(): Promise<any>;

/**
 * Which actions the shipment form offers. The shell renders `kind` and the list; it compares
 * nothing and maps no label back onto a behaviour (see `shipment_action_bar` for why a published
 * job gets exactly one).
 */
export function shipment_action_bar(publish_state: string): any;

/**
 * E-40 — the owner's rule: "dữ liệu đủ thì đẩy qua". From the entity's stored state, keep
 * advancing while the NEXT hop has a non-empty requirement list and EVERY row is affirmatively
 * Met by the record (Unknown never advances — auto needs positive evidence; the manual button
 * keeps its permissive policy as the escape hatch). Returns the state the job ends at.
 */
export function shipment_auto_advance(entity_id: string, shipment_json: string): any;

/**
 * The real kanban drag move. Builds the record's own registry/context (same shape as
 * `shipment_auto_advance`) so the real guards see real data, resolves the event off
 * `event_for_hop`, then runs it through `run_transition` — the one place a shipment's stored
 * state actually moves, persisting the state and appending the audit row.
 */
export function shipment_move_to(entity_id: string, to_state: string, shipment_json: string): any;

/**
 * `{ current, off_path, phases: [{ state, position, requirements }] }`.
 *
 * The state comes from the FSM state map when the entity is registered, and from the record's own
 * `state` otherwise — a job whose boot registration has not run yet still has a real state, and
 * showing it at Created would be a lie the user cannot correct.
 */
export function shipment_phases(entity_id: string, shipment_json: string): string;

/**
 * Which product the chosen mode implies. `null` = leave the field as the operator set it; a
 * string (possibly empty) = set it to that. See `product_for_mode` for why SEA answers `null`
 * rather than picking one of its three products.
 */
export function shipment_product_for_mode(mode: string, current_product: string): string | undefined;

/**
 * One-time init: install the OPFS sahpool VFS (as default), open the db, run the schema.
 * `scope` partitions the pool per account — an empty scope is refused rather than silently
 * falling back to a shared database. `has_lock_exclusivity` is the one fact only JS can supply:
 * did the Web Locks API grant this tab sole leadership of the sqlite engine? It decides how an
 * exhausted retry budget is classified (sahpool_lock_policy::next_sahpool_step) — never guessed
 * here from a raw browser error string.
 *
 * Whether to use OPFS is decided HERE, not by the caller: it is a storage-durability decision,
 * and the worker's JS half is bootstrap and transport only (this module's own header, and the
 * project law that business decisions live in wasm). JS supplies facts it alone holds; this is
 * not one of them.
 *
 * Returns the durability VERDICT (durability_verdict.rs) for the mode the store landed in:
 * "opfs" → durable (normal); "opfs-rebuilt" → durable, but the on-disk cache was dropped;
 * "memory-disabled" (this context has no OPFS at all) and "memory-stale-self" (a dead context's
 * handles never let go in time, but Web Locks proved no LIVE tab is holding them) → volatile.
 * A genuine conflict (no exclusivity guarantee, budget exhausted) is the one case returned as an
 * Err — that is the only situation a "close the other tab" message would ever be true.
 *
 * A volatile store means **writes do not survive a reload**. The verdict — not the raw mode
 * string — is what crosses to JS, so the chip says it out loud instead of the app looking normal
 * while the database is RAM.
 */
export function sqlite_init(scope: string, has_lock_exclusivity: boolean): Promise<any>;

/**
 * Explicit lifecycle release — called from JS on `pagehide`, right before this document's worker
 * is torn down, so the SAH handles are closed synchronously instead of left for the browser's own
 * (slow, unpredictable) worker-teardown GC. That gap was the actual defect: the next document's
 * install had nothing to wait on but GC, and GC does not run on the boot budget's clock. Safe to
 * call more than once (both steps are no-ops once already released).
 */
export function sqlite_release(): void;

export function store_count_entities(): any;

export function store_delete(kind: string, id: string): void;

export function store_delete_meta(key: string): void;

export function store_get(kind: string, id: string): any;

export function store_get_meta(key: string): any;

export function store_get_wma(key: string): any;

export function store_list(kind: string): any;

export function store_list_notifications(): any;

export function store_put(kind: string, id: string, body: any): void;

export function store_put_meta(key: string, body: any): void;

export function store_put_notification(notif: any): void;

export function store_put_wma(key: string, body: any): void;

export function sync_audit_append(req: any): Promise<any>;

export function sync_audit_read(req: any): Promise<any>;

export function sync_audit_verify_chain(req: any): Promise<any>;

export function sync_delta_tick_plan(req: any): any;

export function sync_drain_plan(req: any): any;

export function sync_due_soon_check(req: any): Promise<any>;

export function sync_due_soon_mark(req: any): Promise<any>;

export function sync_due_soon_rows(req: any): Promise<any>;

export function sync_error_capture(req: any): Promise<any>;

export function sync_job_event(req: any): any;

export function sync_user_audit_read(req: any): Promise<any>;

export function sync_wma_dismiss(req: any): any;

export function sync_wma_load(req: any): Promise<any>;

export function sync_wma_on_event(req: any): any;

export function sync_wma_predict(req: any): any;

export function sync_wma_save(req: any): Promise<any>;

export function users_directory_create(email: string, display_name: string, roles_json: string): Promise<any>;

/**
 * `GET /users` — `role`/`include_inactive` empty/false means "not asked".
 */
export function users_directory_list(role: string, include_inactive: boolean): Promise<any>;

export function users_directory_patch(email: string, body_json: string): Promise<any>;

export function validate_airline_iata(code: string): boolean;

export function validate_airline_icao(code: string): boolean;

export function validate_airport_iata(code: string): boolean;

export function validate_airport_icao(code: string): boolean;

export function validate_awb_no(s: string): boolean;

/**
 * `valid_from`/`valid_to` are ISO 'YYYY-MM-DD'. Same invariant `PricedRecord::new` and
 * `FxRateEntry::new` already carry: a validity window can't end before it starts.
 */
export function validate_date_range(valid_from: string, valid_to: string): boolean;

export function validate_flight_no(no: string): boolean;

export function validate_iata_dgr_class(class_str: string): boolean;

export function validate_scac(code: string): boolean;

export function validate_shipment_gate(request_json: string): any;

export function validate_uld_type_code(code: string): boolean;

/**
 * Container units validate as ISO 6346 size-type codes, every other category as UN/ECE
 * Recommendation 20 — see rulesets::validators::uom for the shape each takes.
 */
export function validate_uom_code(category: string, code: string): boolean;

export function validate_uom_label(label: string): boolean;

export function vdg_version(): string;

export function verify_license(license_str: string, current_unix_ts: bigint): any;

/**
 * Empty strings for "absent" -- JS passes `draft.currency || ''` and the config value or ''.
 */
export function workspace_header_currency(saved: string, configured_default: string): string;

/**
 * The codes the default-currency picker may offer, as JSON -- one source for the Rust rule and
 * the select that renders it.
 */
export function workspace_selectable_currencies(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wasm_init: () => void;
    readonly __wbg_awbrepo_free: (a: number, b: number) => void;
    readonly __wbg_customerindex_free: (a: number, b: number) => void;
    readonly access_can_route: (a: number, b: number, c: number, d: number) => number;
    readonly access_home_route: (a: number, b: number, c: number) => void;
    readonly access_is_account: (a: number, b: number) => number;
    readonly access_redirect_for: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly access_roles_from_record: (a: number, b: number, c: number) => void;
    readonly apply_fsm_event: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly auth_adopt_session: (a: number) => number;
    readonly auth_clear_role_cache: (a: number) => number;
    readonly auth_detect_role: (a: number) => number;
    readonly auth_fetch_me: () => number;
    readonly auth_has_role: (a: number, b: number) => void;
    readonly auth_require_auth: (a: number) => number;
    readonly auth_resolve_principal: (a: number) => number;
    readonly auth_session_close: () => number;
    readonly auth_session_open: (a: number, b: number) => number;
    readonly auth_session_roles: (a: number, b: number) => void;
    readonly auth_set_resolved_roles: (a: number, b: number) => void;
    readonly awbrepo_append: (a: number, b: number, c: number) => void;
    readonly awbrepo_deleteByAwbNo: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly awbrepo_listByMonth: (a: number, b: number, c: number) => number;
    readonly cache_bulk_put: (a: number) => number;
    readonly cache_can_write_master: (a: number, b: number) => void;
    readonly cache_find_match: (a: number, b: number) => void;
    readonly cache_route_prefetch: (a: number) => number;
    readonly check_air_rate_transition: (a: number, b: number, c: number, d: number) => number;
    readonly check_air_shipment_transition: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly check_allocation_within_mgw: (a: number, b: number, c: number) => number;
    readonly check_awb_doc_transition: (a: number, b: number, c: number, d: number) => number;
    readonly check_code_unique: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly check_shipment_transition: (a: number, b: number, c: number, d: number) => number;
    readonly classify_pnl_line_kind: (a: number, b: number, c: number) => void;
    readonly commission_default_personal_tax_pct: () => number;
    readonly commission_net_after_tax: (a: number, b: number, c: number) => number;
    readonly commission_personal_tax: (a: number, b: number) => number;
    readonly commission_resolve_sales_share_pct: (a: number, b: number, c: number, d: number) => number;
    readonly commission_rule_block_reason: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly commission_rule_split: (a: number, b: number, c: number) => void;
    readonly commission_waterfall: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly compute_dashboard_exceptions: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly compute_due_soon: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly customerindex_add_customer: (a: number, b: number, c: number) => number;
    readonly customerindex_new: () => number;
    readonly customerindex_search: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly data_add_receivable_note: (a: number) => number;
    readonly data_append_customer_note: (a: number) => number;
    readonly data_approval_decision_log: (a: number) => number;
    readonly data_audit_trail: (a: number) => number;
    readonly data_cash_flow_inputs: (a: number) => number;
    readonly data_cass_reconciliation_inputs: (a: number) => number;
    readonly data_commission_basis_lines: (a: number) => number;
    readonly data_commission_payouts: (a: number) => number;
    readonly data_commission_rule_editor_inputs: (a: number) => number;
    readonly data_commission_rule_suggestions: (a: number) => number;
    readonly data_current_revision: (a: number) => number;
    readonly data_customer360_inputs: (a: number) => number;
    readonly data_delete_commission_rule: (a: number) => number;
    readonly data_delete_master: (a: number) => number;
    readonly data_delete_pnl_lines: (a: number) => number;
    readonly data_delete_shipment: (a: number) => number;
    readonly data_exception_caseload: (a: number) => number;
    readonly data_get_envelope: (a: number) => number;
    readonly data_get_master: (a: number) => number;
    readonly data_get_shipment: (a: number) => number;
    readonly data_join_loaded: (a: number) => number;
    readonly data_list_envelopes: (a: number) => number;
    readonly data_list_masters: (a: number) => number;
    readonly data_list_where: (a: number) => number;
    readonly data_manifest_filings: (a: number) => number;
    readonly data_mark_receivable_followed_up: (a: number) => number;
    readonly data_overwrite_commission_entries: (a: number) => number;
    readonly data_pending_approvals: (a: number) => number;
    readonly data_period_close_record: (a: number) => number;
    readonly data_pipeline_shipments: (a: number) => number;
    readonly data_pnl_line_id: (a: number, b: number) => void;
    readonly data_pnl_report_inputs: (a: number) => number;
    readonly data_promote_commission_suggestion: (a: number) => number;
    readonly data_publish_billing: (a: number) => number;
    readonly data_published_for: (a: number) => number;
    readonly data_put_envelope: (a: number) => number;
    readonly data_put_shipment: (a: number) => number;
    readonly data_reapply_my_values: (a: number) => number;
    readonly data_receivables_ledger: (a: number) => number;
    readonly data_resolve_conflict: (a: number) => number;
    readonly data_rollback_shipment_create: (a: number) => number;
    readonly data_sales_profiles: (a: number) => number;
    readonly data_save_commission_rule: (a: number) => number;
    readonly data_save_master: (a: number) => number;
    readonly data_suppress_duplicate_pair: (a: number) => number;
    readonly data_write_gate: (a: number) => number;
    readonly derive_shipment_direction: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly drain_events: (a: number) => void;
    readonly exec: (a: number, b: number, c: number) => void;
    readonly flows_accept_quote: (a: number) => number;
    readonly flows_active_sales_reps: (a: number) => number;
    readonly flows_air_calc: (a: number, b: number) => void;
    readonly flows_approval_decide: (a: number) => number;
    readonly flows_assert_rep_code: (a: number) => number;
    readonly flows_assign_job_no: (a: number) => number;
    readonly flows_assign_rep_code: (a: number) => number;
    readonly flows_auto_advance: (a: number) => number;
    readonly flows_build_entries_from_commission: (a: number, b: number) => void;
    readonly flows_build_entries_from_shipment: (a: number, b: number) => void;
    readonly flows_build_reversal_entry: (a: number, b: number) => void;
    readonly flows_chargeable_kg: (a: number, b: number) => void;
    readonly flows_clear_sales_registry: (a: number, b: number) => void;
    readonly flows_commit_pnl_report: (a: number) => number;
    readonly flows_customer_rep: (a: number, b: number) => void;
    readonly flows_derive_sales_rep: (a: number, b: number) => void;
    readonly flows_edit_profile: (a: number) => number;
    readonly flows_ensure_rep_code: (a: number) => number;
    readonly flows_ensure_state_aliases: (a: number) => number;
    readonly flows_export_workspace: (a: number) => number;
    readonly flows_format_job_no: (a: number, b: number) => void;
    readonly flows_generate_quote_id: (a: number) => number;
    readonly flows_license_error_key: (a: number, b: number) => void;
    readonly flows_license_resolve: (a: number) => number;
    readonly flows_migrate_shipment_states: (a: number) => number;
    readonly flows_mine_only: (a: number, b: number) => void;
    readonly flows_next_local_seq: (a: number) => number;
    readonly flows_note_lines: (a: number, b: number) => void;
    readonly flows_persist_advanced_state: (a: number) => number;
    readonly flows_pnl_fx_deviation: (a: number, b: number) => void;
    readonly flows_pnl_line_vnd: (a: number, b: number) => void;
    readonly flows_pnl_vnd_invariant: (a: number, b: number) => void;
    readonly flows_post_commission: (a: number) => number;
    readonly flows_post_reversal: (a: number) => number;
    readonly flows_post_shipment: (a: number) => number;
    readonly flows_quote_affordance: (a: number, b: number) => void;
    readonly flows_quote_converted: (a: number) => number;
    readonly flows_quote_delete_apply: (a: number) => number;
    readonly flows_quote_delete_plan: (a: number, b: number) => void;
    readonly flows_quote_totals: (a: number, b: number) => void;
    readonly flows_register_entity: (a: number) => number;
    readonly flows_rehydrate_fsm: (a: number) => number;
    readonly flows_rep_code_valid: (a: number, b: number) => void;
    readonly flows_repo_max_seq: (a: number) => number;
    readonly flows_sales_analytics: (a: number, b: number) => void;
    readonly flows_sales_commission: (a: number) => number;
    readonly flows_sales_rep_by_account: (a: number, b: number) => void;
    readonly flows_save_quote_draft: (a: number) => number;
    readonly flows_self_rep_candidate: (a: number, b: number) => void;
    readonly flows_send_quote: (a: number) => number;
    readonly flows_shipment_affordance: (a: number, b: number) => void;
    readonly flows_slugify: (a: number, b: number) => void;
    readonly flows_void_apply: (a: number) => number;
    readonly flows_void_plan: (a: number, b: number) => void;
    readonly fmt_date_display: (a: number, b: number, c: number) => void;
    readonly fmt_date_pattern_hint: (a: number) => void;
    readonly freight_app_init: (a: number) => void;
    readonly fx_rate_validate_spread: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly fx_rate_validate_value: (a: number, b: number, c: number) => void;
    readonly fxraterepo_appendRate: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly fxraterepo_deleteEntry: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
    readonly fxraterepo_getRate: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
    readonly fxraterepo_hasUnreadableRates: (a: number) => number;
    readonly fxraterepo_invalidateMonth: (a: number, b: number, c: number, d: number) => void;
    readonly fxraterepo_listAll: (a: number) => number;
    readonly fxraterepo_listByMonth: (a: number, b: number, c: number) => number;
    readonly fxraterepo_pnlFxCacheClear: (a: number) => void;
    readonly fxraterepo_pnlFxCacheGet: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
    readonly fxraterepo_pnlFxCachePut: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => void;
    readonly fxraterepo_pnlFxLookupPair: (a: number, b: number, c: number, d: number) => void;
    readonly fxraterepo_pnlFxRequireDirection: (a: number, b: number, c: number, d: number) => void;
    readonly gen_uom_id: (a: number, b: number, c: number) => void;
    readonly get_entity_state: (a: number, b: number, c: number) => void;
    readonly get_transition_log: (a: number, b: number, c: number) => void;
    readonly get_validation_errors: (a: number) => void;
    readonly governance_action_guard: (a: number, b: number) => void;
    readonly governance_allowed_actions: (a: number, b: number) => void;
    readonly governance_can_edit_default_currency: (a: number, b: number) => void;
    readonly governance_close_period: (a: number) => number;
    readonly governance_close_records: (a: number) => number;
    readonly governance_error_records: (a: number) => number;
    readonly governance_filter_sidebar: (a: number, b: number) => void;
    readonly governance_find_lock: (a: number) => number;
    readonly governance_home_route: (a: number, b: number) => void;
    readonly governance_load_settings: (a: number) => number;
    readonly governance_lock_period: (a: number) => number;
    readonly governance_locked_periods: (a: number) => number;
    readonly governance_normalize_role: (a: number, b: number) => void;
    readonly governance_opening_balance: (a: number, b: number) => void;
    readonly governance_period_math: (a: number, b: number) => void;
    readonly governance_period_of: (a: number, b: number) => void;
    readonly governance_pre_close_checks: (a: number) => number;
    readonly governance_purge_error_month: (a: number) => number;
    readonly governance_reopen_period: (a: number) => number;
    readonly governance_route_guard: (a: number, b: number) => void;
    readonly governance_save_settings: (a: number) => number;
    readonly governance_unlock_period: (a: number) => number;
    readonly governance_user_roles: (a: number, b: number) => void;
    readonly import_booking_excel_wasm: (a: number, b: number, c: number) => void;
    readonly import_document_excel_wasm: (a: number, b: number, c: number) => void;
    readonly import_pnl_excel_wasm: (a: number, b: number, c: number) => void;
    readonly ledgerrepo_appendLeg: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly ledgerrepo_appendReconciliationRecord: (a: number, b: number, c: number) => void;
    readonly ledgerrepo_appendRepostRecord: (a: number, b: number, c: number) => void;
    readonly ledgerrepo_chartOfAccounts: (a: number) => number;
    readonly ledgerrepo_ensureSeedFiles: (a: number) => number;
    readonly ledgerrepo_findPosted: (a: number, b: number, c: number) => number;
    readonly ledgerrepo_getBalance: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly ledgerrepo_getLastReconciliation: (a: number) => number;
    readonly ledgerrepo_getLastRepost: (a: number) => number;
    readonly ledgerrepo_isAlreadyPosted: (a: number, b: number, c: number) => number;
    readonly ledgerrepo_listAccountCodes: (a: number, b: number) => number;
    readonly ledgerrepo_listAllLegsInEntry: (a: number, b: number, c: number) => number;
    readonly ledgerrepo_listLegs: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => number;
    readonly ledgerrepo_postingRules: (a: number) => number;
    readonly ledgerrepo_recordPosted: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly ledgerrepo_releasePosted: (a: number, b: number, c: number) => number;
    readonly ledgerrepo_removeEntry: (a: number, b: number, c: number, d: number) => number;
    readonly ledgerrepo_replaceLeg: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly license_arm: (a: number, b: number, c: bigint) => number;
    readonly manager_air_invoice: (a: number, b: number) => void;
    readonly manager_air_pnl: (a: number, b: number) => void;
    readonly manager_ap_payables: (a: number, b: number) => void;
    readonly manager_ar_aging: (a: number, b: number) => void;
    readonly manager_ar_timeline: (a: number, b: number) => void;
    readonly manager_audit_log_csv: (a: number, b: number) => void;
    readonly manager_audit_log_range: (a: number, b: number) => void;
    readonly manager_audit_log_sort: (a: number, b: number) => void;
    readonly manager_commission_rules: (a: number) => number;
    readonly manager_commission_sparkline: (a: number, b: number) => void;
    readonly manager_commissions: (a: number, b: number) => void;
    readonly manager_customer360: (a: number, b: number) => void;
    readonly manager_customer_mode_mix: (a: number, b: number) => void;
    readonly manager_dashboard: (a: number) => number;
    readonly manager_demdet_overview: (a: number, b: number) => void;
    readonly manager_document_board: (a: number, b: number) => void;
    readonly manager_email_valid: (a: number, b: number) => void;
    readonly manager_exception_escalate: (a: number, b: number) => void;
    readonly manager_exception_mttr: (a: number, b: number) => void;
    readonly manager_exception_per_sales: (a: number, b: number) => void;
    readonly manager_exception_trends: (a: number, b: number) => void;
    readonly manager_exceptions_sorted: (a: number, b: number) => void;
    readonly manager_finance_dashboard: (a: number, b: number) => void;
    readonly manager_ledger_apply_repost: (a: number) => number;
    readonly manager_ledger_auto_reconcile: (a: number) => number;
    readonly manager_ledger_balance_sheet: (a: number, b: number) => void;
    readonly manager_ledger_chart_groups: (a: number, b: number) => void;
    readonly manager_ledger_csv: (a: number, b: number) => void;
    readonly manager_ledger_entry_totals: (a: number, b: number) => void;
    readonly manager_ledger_filter_legs: (a: number, b: number) => void;
    readonly manager_ledger_plan_repost: (a: number) => number;
    readonly manager_ledger_pnl: (a: number, b: number) => void;
    readonly manager_ledger_pnl_monthly: (a: number, b: number) => void;
    readonly manager_ledger_purge_orphans: (a: number) => number;
    readonly manager_ledger_reconcile: (a: number) => number;
    readonly manager_ledger_running_balances: (a: number, b: number) => void;
    readonly manager_ledger_trial_balance: (a: number, b: number) => void;
    readonly manager_manifest_overview: (a: number, b: number) => void;
    readonly manager_margin_pct: (a: number, b: number) => number;
    readonly manager_notification_from_event: (a: number, b: number) => void;
    readonly manager_notifications_time_based: (a: number, b: number) => void;
    readonly manager_period_key: (a: number, b: number) => void;
    readonly manager_pnl_buy_sell: (a: number, b: number) => void;
    readonly manager_pnl_drill: (a: number, b: number) => void;
    readonly manager_pnl_pivot: (a: number, b: number) => void;
    readonly manager_self_approved_review: (a: number, b: number) => void;
    readonly manager_users_filter: (a: number, b: number) => void;
    readonly manager_users_sort: (a: number, b: number) => void;
    readonly permission_can_merge: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly pnl_currency_exponent: (a: number, b: number) => number;
    readonly pnl_line_fx_lock: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly pnl_round_for_display: (a: number, b: number, c: number) => number;
    readonly priced_ref_resolve_on_date: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly process_excel_file: (a: number, b: number, c: number) => void;
    readonly proposal_merge: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => void;
    readonly proposal_propose: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly proposal_reject: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => void;
    readonly register_entity: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly run: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly sales_air_rate_cards: (a: number) => number;
    readonly sales_billing_records: (a: number) => number;
    readonly sales_carrier_masters: (a: number) => number;
    readonly sales_commission_entries_for: (a: number) => number;
    readonly sales_commission_rule_assignment: (a: number) => number;
    readonly sales_container_type_options: (a: number) => number;
    readonly sales_create_customer_draft: (a: number) => number;
    readonly sales_customer_for_note: (a: number) => number;
    readonly sales_customer_masters: (a: number) => number;
    readonly sales_demdet_instances: (a: number) => number;
    readonly sales_document_sources: (a: number) => number;
    readonly sales_heal_job_no: (a: number) => number;
    readonly sales_ledger_version: (a: number, b: number) => void;
    readonly sales_may_see_job_total: () => number;
    readonly sales_pnl_lines: (a: number) => number;
    readonly sales_pnl_lines_for: (a: number) => number;
    readonly sales_publish_state: (a: number, b: number) => void;
    readonly sales_quotation: (a: number) => number;
    readonly sales_quotations: (a: number) => number;
    readonly sales_ref_prefix: (a: number, b: number) => void;
    readonly sales_rep_profile: (a: number) => number;
    readonly sales_resolve_job_no: (a: number) => number;
    readonly sales_share_total: (a: number) => number;
    readonly sales_shipment_commission_snapshot: (a: number) => number;
    readonly sales_shipment_month: (a: number, b: number) => void;
    readonly sales_validate_submission: (a: number, b: number) => void;
    readonly sales_weight_unit_codes: (a: number) => number;
    readonly sales_write_side_records: (a: number) => number;
    readonly select: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly server_health_poll: () => number;
    readonly server_health_probe: () => number;
    readonly shipment_action_bar: (a: number, b: number, c: number) => void;
    readonly shipment_auto_advance: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly shipment_move_to: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly shipment_phases: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly shipment_product_for_mode: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly sqlite_init: (a: number, b: number, c: number) => number;
    readonly sqlite_release: () => void;
    readonly store_count_entities: (a: number) => void;
    readonly store_delete: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly store_delete_meta: (a: number, b: number, c: number) => void;
    readonly store_get: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly store_get_meta: (a: number, b: number, c: number) => void;
    readonly store_get_wma: (a: number, b: number, c: number) => void;
    readonly store_list: (a: number, b: number, c: number) => void;
    readonly store_list_notifications: (a: number) => void;
    readonly store_put: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly store_put_meta: (a: number, b: number, c: number, d: number) => void;
    readonly store_put_notification: (a: number, b: number) => void;
    readonly store_put_wma: (a: number, b: number, c: number, d: number) => void;
    readonly sync_audit_append: (a: number) => number;
    readonly sync_audit_read: (a: number) => number;
    readonly sync_audit_verify_chain: (a: number) => number;
    readonly sync_delta_tick_plan: (a: number, b: number) => void;
    readonly sync_drain_plan: (a: number, b: number) => void;
    readonly sync_due_soon_check: (a: number) => number;
    readonly sync_due_soon_mark: (a: number) => number;
    readonly sync_due_soon_rows: (a: number) => number;
    readonly sync_error_capture: (a: number) => number;
    readonly sync_job_event: (a: number, b: number) => void;
    readonly sync_user_audit_read: (a: number) => number;
    readonly sync_wma_dismiss: (a: number, b: number) => void;
    readonly sync_wma_load: (a: number) => number;
    readonly sync_wma_on_event: (a: number, b: number) => void;
    readonly sync_wma_predict: (a: number, b: number) => void;
    readonly sync_wma_save: (a: number) => number;
    readonly userrepo_ensureSeeded: (a: number, b: number, c: number) => void;
    readonly userrepo_get: (a: number, b: number, c: number) => number;
    readonly userrepo_list: (a: number) => number;
    readonly userrepo_listAll: (a: number) => number;
    readonly userrepo_listRaw: (a: number) => number;
    readonly userrepo_remove: (a: number, b: number, c: number) => number;
    readonly userrepo_upsert: (a: number, b: number, c: number) => void;
    readonly users_directory_create: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly users_directory_list: (a: number, b: number, c: number) => number;
    readonly users_directory_patch: (a: number, b: number, c: number, d: number) => number;
    readonly validate_airline_iata: (a: number, b: number) => number;
    readonly validate_airline_icao: (a: number, b: number) => number;
    readonly validate_airport_iata: (a: number, b: number) => number;
    readonly validate_airport_icao: (a: number, b: number) => number;
    readonly validate_awb_no: (a: number, b: number) => number;
    readonly validate_date_range: (a: number, b: number, c: number, d: number) => number;
    readonly validate_flight_no: (a: number, b: number) => number;
    readonly validate_iata_dgr_class: (a: number, b: number) => number;
    readonly validate_scac: (a: number, b: number) => number;
    readonly validate_shipment_gate: (a: number, b: number, c: number) => void;
    readonly validate_uld_type_code: (a: number, b: number) => number;
    readonly validate_uom_code: (a: number, b: number, c: number, d: number) => number;
    readonly validate_uom_label: (a: number, b: number) => number;
    readonly vdg_version: (a: number) => void;
    readonly verify_license: (a: number, b: number, c: bigint) => number;
    readonly wasmentityrepo_awbRepo: (a: number) => number;
    readonly wasmentityrepo_awb_append: (a: number, b: number, c: number) => number;
    readonly wasmentityrepo_awb_delete: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_awb_list_all: (a: number) => number;
    readonly wasmentityrepo_awb_list_by_month: (a: number, b: number, c: number) => number;
    readonly wasmentityrepo_delete: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_drain_outbox: (a: number) => number;
    readonly wasmentityrepo_ensure_period_loaded: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_flows_cas_put: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
    readonly wasmentityrepo_flows_get_or_create_record: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => number;
    readonly wasmentityrepo_fx_apply_writes: (a: number, b: number, c: number) => number;
    readonly wasmentityrepo_fx_delete_entry: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
    readonly wasmentityrepo_fx_invalidate_month: (a: number, b: number, c: number) => void;
    readonly wasmentityrepo_fx_list_all: (a: number) => number;
    readonly wasmentityrepo_fx_list_by_month: (a: number, b: number, c: number) => number;
    readonly wasmentityrepo_fx_months_to_ingest: (a: number) => number;
    readonly wasmentityrepo_get: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_index_ids_where: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
    readonly wasmentityrepo_index_note_delete: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_index_note_write: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => number;
    readonly wasmentityrepo_index_unique_holder: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => number;
    readonly wasmentityrepo_invalidate_period_cache: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_lgr_append_leg: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly wasmentityrepo_lgr_append_log: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_lgr_ensure_seed_file: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_lgr_find_posted: (a: number, b: number, c: number) => number;
    readonly wasmentityrepo_lgr_get_balance: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_lgr_is_posted: (a: number, b: number, c: number) => number;
    readonly wasmentityrepo_lgr_last_log: (a: number, b: number, c: number) => number;
    readonly wasmentityrepo_lgr_list_account_codes: (a: number, b: number) => number;
    readonly wasmentityrepo_lgr_list_entry_legs: (a: number, b: number, c: number, d: number) => number;
    readonly wasmentityrepo_lgr_list_legs: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => number;
    readonly wasmentityrepo_lgr_record_posted: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_lgr_release_posted: (a: number, b: number, c: number) => number;
    readonly wasmentityrepo_lgr_remove_entry: (a: number, b: number, c: number, d: number) => number;
    readonly wasmentityrepo_lgr_replace_leg: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly wasmentityrepo_lgr_set_chart: (a: number, b: number, c: number, d: number) => void;
    readonly wasmentityrepo_list: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_mint_quote_ref: (a: number, b: number, c: number) => number;
    readonly wasmentityrepo_mint_shipment_ref: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_new: (a: number) => number;
    readonly wasmentityrepo_outbox_snapshot: (a: number) => number;
    readonly wasmentityrepo_pref_get_state: (a: number, b: number, c: number) => number;
    readonly wasmentityrepo_pref_list_pending: (a: number, b: number, c: number) => number;
    readonly wasmentityrepo_pref_move_closed: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
    readonly wasmentityrepo_pref_read_pending: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_pref_seed_if_empty: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_pref_write_pending: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_pref_write_state: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_put: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly wasmentityrepo_put_labeled: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
    readonly wasmentityrepo_put_owned: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => number;
    readonly wasmentityrepo_sync_delta: (a: number) => number;
    readonly wasmentityrepo_sync_failed_kinds: (a: number) => number;
    readonly wasmentityrepo_sync_failed_reason: (a: number, b: number) => void;
    readonly wasmentityrepo_sync_server_unreachable: (a: number) => number;
    readonly wasmentityrepo_sync_skipped_count: (a: number, b: number, c: number) => number;
    readonly wasmentityrepo_sync_skipped_kinds: (a: number) => number;
    readonly wasmentityrepo_users_ensure_seeded: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
    readonly wasmentityrepo_users_get: (a: number, b: number, c: number) => number;
    readonly wasmentityrepo_users_list: (a: number) => number;
    readonly wasmentityrepo_users_list_all: (a: number) => number;
    readonly wasmentityrepo_users_list_raw: (a: number) => number;
    readonly wasmentityrepo_users_remove: (a: number, b: number, c: number) => number;
    readonly wasmentityrepo_users_upsert: (a: number, b: number, c: number) => number;
    readonly workspace_header_currency: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly workspace_selectable_currencies: (a: number) => void;
    readonly wasmentityrepo_userRepo: (a: number) => number;
    readonly wasmentityrepo_ledgerRepo: (a: number) => number;
    readonly wasmentityrepo_fxRateRepo: (a: number) => number;
    readonly __wbg_userrepo_free: (a: number, b: number) => void;
    readonly __wbg_fxraterepo_free: (a: number, b: number) => void;
    readonly __wbg_ledgerrepo_free: (a: number, b: number) => void;
    readonly __wbg_wasmentityrepo_free: (a: number, b: number) => void;
    readonly rust_sqlite_wasm_abort: () => void;
    readonly rust_sqlite_wasm_assert_fail: (a: number, b: number, c: number, d: number) => void;
    readonly rust_sqlite_wasm_calloc: (a: number, b: number) => number;
    readonly rust_sqlite_wasm_malloc: (a: number) => number;
    readonly rust_sqlite_wasm_free: (a: number) => void;
    readonly rust_sqlite_wasm_getentropy: (a: number, b: number) => number;
    readonly rust_sqlite_wasm_localtime: (a: number) => number;
    readonly rust_sqlite_wasm_realloc: (a: number, b: number) => number;
    readonly sqlite3_os_end: () => number;
    readonly sqlite3_os_init: () => number;
    readonly __wasm_bindgen_func_elem_15523: (a: number, b: number, c: number, d: number) => void;
    readonly __wasm_bindgen_func_elem_15525: (a: number, b: number, c: number, d: number) => void;
    readonly __wasm_bindgen_func_elem_11503: (a: number, b: number) => void;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_export3: (a: number) => void;
    readonly __wbindgen_export4: (a: number, b: number) => void;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_export5: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
