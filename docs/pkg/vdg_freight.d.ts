/* tslint:disable */
/* eslint-disable */

export class CustomerIndex {
    free(): void;
    [Symbol.dispose](): void;
    add_customer(json_str: string): boolean;
    constructor();
    search(query: string, query_embedding_json: string, top_k: number): string;
}

export class WasmEntityRepo {
    free(): void;
    [Symbol.dispose](): void;
    awb_append(awb_json: string): Promise<any>;
    awb_delete(awb_no: string, ym: string): Promise<any>;
    awb_list_by_month(ym: string): Promise<any>;
    delete(kind: string, id: string): Promise<any>;
    drain_outbox(): Promise<any>;
    fetch_older(kind: string, before: string): Promise<any>;
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
    lgr_append_leg(year: number, acc_code: string, leg_json: string): Promise<any>;
    lgr_append_log(file: string, record_json: string): Promise<any>;
    lgr_ensure_seed_file(file_name: string, content: string): Promise<any>;
    lgr_get_balance(acc_code: string, as_of: string): Promise<any>;
    lgr_is_posted(posted_index: string): Promise<any>;
    lgr_last_log(file: string): Promise<any>;
    lgr_list_entry_legs(year: number, entry_id: string): Promise<any>;
    lgr_list_legs(year: number, acc_code: string, from: string, to: string): Promise<any>;
    lgr_record_posted(posted_index: string, entry_ids_json: string): Promise<any>;
    /**
     * Orphan purge only — see LedgerStoreOperator::remove_entry for why this is not a general delete.
     */
    lgr_remove_entry(year: number, entry_id: string): Promise<any>;
    lgr_replace_leg(year: number, acc_code: string, leg_json: string): Promise<any>;
    lgr_set_chart(chart_json: string): void;
    list(kind: string): Promise<any>;
    mint_quote_ref(salt: string): Promise<any>;
    mint_shipment_ref(direction: string, salt: string): Promise<any>;
    /**
     * The SAME network-call budget `SyncDeltaOperator::rate_gate()` checks — exposed
     * synchronously (no I/O of its own, so no Promise) so a per-record fan-out that lives
     * entirely on the JS side can check in before each download instead of growing a second
     * counter. F-58-02 follow-up: `dataPlatform.readForkBundles`
     * (js/bootstrap/platform/data.js) issues one `ws_read_file` per `.jsonl` bundle in a fork
     * scan and never re-enters Rust between files — this is the choke point it calls into so
     * that loop draws from the same budget a sync tick does. Throws when the shared budget is
     * spent; the caller's loop must stop exactly as it would on a real IoPort failure.
     */
    network_rate_check(): void;
    constructor(io: any);
    pref_get_state(ref_name: string): Promise<any>;
    pref_list_pending(ref_name: string): Promise<any>;
    pref_move_closed(ref_name: string, id: string, dto_json: string): Promise<any>;
    pref_read_pending(ref_name: string, id: string): Promise<any>;
    pref_seed_if_empty(ref_name: string, records_json: string): Promise<any>;
    pref_write_pending(ref_name: string, dto_json: string): Promise<any>;
    pref_write_state(ref_name: string, dto_json: string): Promise<any>;
    put(kind: string, id: string, body: any): Promise<any>;
    sync_delta(): Promise<any>;
    users_ensure_seeded(email: string, name: string, workspace: string): Promise<any>;
    users_get(email: string): Promise<any>;
    users_list(): Promise<any>;
    users_list_all(): Promise<any>;
    users_remove(email: string): Promise<any>;
    users_upsert(user_json: string): Promise<any>;
}

export function __wasm_init(): void;

export function access_can_route(route: string, roles: string): boolean;

export function access_home_route(roles: string): string;

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

export function auth_has_role(req: any): any;

export function auth_require_auth(req: any): Promise<any>;

export function auth_session_roles(req: any): any;

export function auth_set_resolved_roles(req: any): any;

export function cache_bulk_put(req: any): Promise<any>;

export function cache_can_write_master(req: any): any;

export function cache_find_match(req: any): any;

export function cache_route_prefetch(req: any): Promise<any>;

export function cache_run_seed_migrations(req: any): Promise<any>;

export function check_air_rate_transition(from: string, event: string): boolean;

export function check_air_shipment_transition(from: string, event: string, ctx_json: string): boolean;

export function check_allocation_within_mgw(tare_kg: number, mgw_kg: number, total_chargeable_kg: number): boolean;

export function check_awb_doc_transition(from: string, event: string): boolean;

/**
 * Returns true when `event` is a valid next event from `from_state` in FSM-04.
 */
export function check_quotation_transition(from_state: string, event: string): boolean;

/**
 * Single-source profit waterfall for the UI: margin → TNDN(20%) → net → sales/LBS split.
 * `sales_pct_0_100` is the manager-set share (0–100). Returns whole-VND figures.
 * `clamp_negatives`: true for payout (loss → zero), false for the sales-form
 * preview (keep signed loss). This is the ONLY commission math JS may display.
 */
export function commission_waterfall(margin_vnd: number, com_deductions_vnd: number, sales_pct_0_100: number, clamp_negatives: boolean): any;

export function compute_dashboard_exceptions(shipments_json: string, now_ms: number, tz_offset_min: number): any;

export function compute_due_soon(billing_json: string, today_str: string, warn_days: number): any;

/**
 * Drops the remembered cross-fork scans, for the delta path.
 */
export function data_clear_fork_scan(req: any): Promise<any>;

export function data_current_revision(req: any): Promise<any>;

export function data_delete_pnl_lines(req: any): Promise<any>;

export function data_delete_shipment(req: any): Promise<any>;

export function data_get_envelope(req: any): Promise<any>;

export function data_get_shipment(req: any): Promise<any>;

export function data_join_loaded(req: any): Promise<any>;

export function data_list_envelopes(req: any): Promise<any>;

export function data_list_where(req: any): Promise<any>;

export function data_pnl_line_id(req: any): any;

export function data_publish_billing(req: any): Promise<any>;

export function data_published_for(req: any): Promise<any>;

export function data_put_envelope(req: any): Promise<any>;

export function data_put_shipment(req: any): Promise<any>;

export function data_write_gate(req: any): Promise<any>;

export function drain_events(): any;

export function flows_accept_quote(req: any): Promise<any>;

export function flows_active_sales_reps(req: any): Promise<any>;

export function flows_air_calc(req: any): any;

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

export function flows_disable_user(req: any): Promise<any>;

export function flows_edit_profile(req: any): Promise<any>;

export function flows_ensure_rep_code(req: any): Promise<any>;

export function flows_ensure_state_aliases(req: any): Promise<any>;

export function flows_export_workspace(req: any): Promise<any>;

export function flows_format_job_no(req: any): any;

export function flows_generate_quote_id(req: any): Promise<any>;

export function flows_invite_sales(req: any): Promise<any>;

export function flows_license_error_key(req: any): any;

export function flows_license_resolve(req: any): Promise<any>;

export function flows_migrate_shipment_states(req: any): Promise<any>;

export function flows_next_local_seq(req: any): Promise<any>;

export function flows_persist_advanced_state(req: any): Promise<any>;

export function flows_post_commission(req: any): Promise<any>;

export function flows_post_reversal(req: any): Promise<any>;

export function flows_post_shipment(req: any): Promise<any>;

export function flows_promote_to_manager(req: any): Promise<any>;

export function flows_quote_converted(req: any): Promise<any>;

export function flows_register_entity(req: any): Promise<any>;

export function flows_rehydrate_fsm(req: any): Promise<any>;

export function flows_rep_code_valid(req: any): any;

export function flows_repo_max_seq(req: any): Promise<any>;

export function flows_sales_analytics(req: any): any;

export function flows_sales_commission(req: any): Promise<any>;

export function flows_sales_rep_by_prefix(req: any): any;

export function flows_save_quote_draft(req: any): Promise<any>;

export function flows_self_rep_candidate(req: any): any;

export function flows_send_quote(req: any): Promise<any>;

export function flows_shipment_affordance(req: any): any;

export function flows_slugify(req: any): any;

export function flows_void_apply(req: any): Promise<any>;

export function flows_void_plan(req: any): any;

/**
 * `taken_json` is the JSON array of forks already in use; `seed` is a caller-supplied random
 * 0..9999 so two managers adding at once don't both pick the same suffix.
 */
export function fork_allocate(email: string, taken_json: string, seed: number): string;

/**
 * Installed once by js/bootstrap (after the wasm module is ready and the repo exists).
 */
export function freight_app_init(platform: any): void;

/**
 * Look up cached FX rate. JS must ingest relevant months first.
 * Returns FxRateEntry as JsValue on success.
 */
export function fx_rate_get(date_str: string, pair: string): any;

/**
 * Push JSONL content for a month into WASM cache. `ym` = "YYYY-MM".
 * Pass empty string when Drive file is absent.
 */
export function fx_rate_ingest_month(ym: string, content: string): void;

/**
 * Validate entry, enforce accountant-only write gate, queue Drive write.
 * Returns `[{path, line}]` — JS appends each line to Drive.
 */
export function fx_rate_prepare_append(entry_json: string, role: string): any;

export function get_entity_state(entity_id: string): any;

export function get_transition_log(entity_id: string): any;

export function get_validation_errors(): any;

export function governance_bootstrap_acl_folders(req: any): Promise<any>;

export function governance_can_edit_default_currency(req: any): any;

export function governance_close_period(req: any): Promise<any>;

export function governance_close_records(req: any): Promise<any>;

export function governance_ensure_workspace_root(req: any): Promise<any>;

export function governance_error_records(req: any): Promise<any>;

export function governance_filter_sidebar(req: any): any;

export function governance_find_lock(req: any): Promise<any>;

export function governance_first_run_provision(req: any): Promise<any>;

export function governance_home_route(req: any): any;

export function governance_is_already_provisioned(req: any): Promise<any>;

export function governance_load_settings(req: any): Promise<any>;

export function governance_lock_period(req: any): Promise<any>;

export function governance_locked_periods(req: any): Promise<any>;

export function governance_merge_diff(req: any): any;

export function governance_merge_records(req: any): any;

export function governance_normalize_role(req: any): any;

export function governance_opening_balance(req: any): any;

export function governance_period_math(req: any): any;

export function governance_period_of(req: any): any;

export function governance_pre_close_checks(req: any): Promise<any>;

export function governance_purge_error_month(req: any): Promise<any>;

export function governance_reopen_period(req: any): Promise<any>;

export function governance_repoint_refs(req: any): Promise<any>;

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

export function manager_email_valid(req: any): any;

export function manager_exception_escalate(req: any): any;

export function manager_exception_mttr(req: any): any;

export function manager_exception_per_sales(req: any): any;

export function manager_exception_trends(req: any): any;

export function manager_exceptions_sorted(req: any): any;

export function manager_fork(req: any): any;

export function manager_ledger_apply_repost(req: any): Promise<any>;

export function manager_ledger_auto_reconcile(req: any): Promise<any>;

export function manager_ledger_balance_sheet(req: any): any;

export function manager_ledger_chart_groups(req: any): any;

export function manager_ledger_csv(req: any): any;

export function manager_ledger_filter_legs(req: any): any;

export function manager_ledger_plan_repost(req: any): Promise<any>;

export function manager_ledger_pnl(req: any): any;

export function manager_ledger_pnl_monthly(req: any): any;

export function manager_ledger_purge_orphans(req: any): Promise<any>;

export function manager_ledger_reconcile(req: any): Promise<any>;

export function manager_ledger_running_balances(req: any): any;

export function manager_ledger_trial_balance(req: any): any;

export function manager_notification_from_event(req: any): any;

export function manager_notifications_time_based(req: any): any;

export function manager_period_key(req: any): any;

export function manager_pnl_buy_sell(req: any): any;

export function manager_pnl_drill(req: any): any;

export function manager_pnl_pivot(req: any): any;

export function manager_users_filter(req: any): any;

export function manager_users_sort(req: any): any;

export function permission_can_merge(role: string, ref_name: string): boolean;

export function permission_can_pull(role: string, ref_name: string): boolean;

export function permission_can_push(role: string, ref_name: string): boolean;

export function permission_can_push_own_fork(role: string): boolean;

/**
 * Returns Vec<PermissionEntry> as JSON (`[{path, access}]`) — role-assignment-service.js's
 * resolveAcl() consumes this directly, replacing the role-drive-acl.json fetch.
 */
export function permission_resolve_grants(role: string, fork?: string | null): any;

/**
 * Called by `PricedRefRepo` before BOTH writes that can land a record in a ref —
 * the maintainer's direct save and an approved proposal. A guard on one of the two
 * is a guard on neither: the same row reaches the same ref either way.
 */
export function priced_ref_check_overlap(records_json: string, candidate_json: string): void;

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
 * E-40 — the owner's rule: "dữ liệu đủ thì đẩy qua". From the entity's stored state, keep
 * advancing while the NEXT hop has a non-empty requirement list and EVERY row is affirmatively
 * Met by the record (Unknown never advances — auto needs positive evidence; the manual button
 * keeps its permissive policy as the escape hatch). Returns the state the job ends at.
 */
export function shipment_auto_advance(entity_id: string, shipment_json: string): any;

/**
 * `{ current, off_path, phases: [{ state, position, requirements }] }`.
 *
 * The state comes from the FSM state map when the entity is registered, and from the record's own
 * `state` otherwise — a job whose boot registration has not run yet still has a real state, and
 * showing it at Created would be a lie the user cannot correct.
 */
export function shipment_phases(entity_id: string, shipment_json: string): string;

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

export function sync_quota_check(req: any): Promise<any>;

export function sync_user_audit_read(req: any): Promise<any>;

export function sync_user_audit_write(req: any): Promise<any>;

export function sync_wma_dismiss(req: any): any;

export function sync_wma_load(req: any): Promise<any>;

export function sync_wma_on_event(req: any): any;

export function sync_wma_predict(req: any): any;

export function sync_wma_save(req: any): Promise<any>;

export function validate_awb_no(s: string): boolean;

export function validate_iata_dgr_class(class_str: string): boolean;

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
    readonly __wbg_customerindex_free: (a: number, b: number) => void;
    readonly __wbg_wasmentityrepo_free: (a: number, b: number) => void;
    readonly access_can_route: (a: number, b: number, c: number, d: number) => number;
    readonly access_home_route: (a: number, b: number, c: number) => void;
    readonly access_redirect_for: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly access_roles_from_record: (a: number, b: number, c: number) => void;
    readonly apply_fsm_event: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly auth_adopt_session: (a: number) => number;
    readonly auth_clear_role_cache: (a: number) => number;
    readonly auth_detect_role: (a: number) => number;
    readonly auth_has_role: (a: number, b: number) => void;
    readonly auth_require_auth: (a: number) => number;
    readonly auth_session_roles: (a: number, b: number) => void;
    readonly auth_set_resolved_roles: (a: number, b: number) => void;
    readonly cache_bulk_put: (a: number) => number;
    readonly cache_can_write_master: (a: number, b: number) => void;
    readonly cache_find_match: (a: number, b: number) => void;
    readonly cache_route_prefetch: (a: number) => number;
    readonly cache_run_seed_migrations: (a: number) => number;
    readonly check_air_rate_transition: (a: number, b: number, c: number, d: number) => number;
    readonly check_air_shipment_transition: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly check_allocation_within_mgw: (a: number, b: number, c: number) => number;
    readonly check_awb_doc_transition: (a: number, b: number, c: number, d: number) => number;
    readonly check_quotation_transition: (a: number, b: number, c: number, d: number) => number;
    readonly commission_waterfall: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly compute_dashboard_exceptions: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly compute_due_soon: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly customerindex_add_customer: (a: number, b: number, c: number) => number;
    readonly customerindex_new: () => number;
    readonly customerindex_search: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly data_clear_fork_scan: (a: number) => number;
    readonly data_current_revision: (a: number) => number;
    readonly data_delete_pnl_lines: (a: number) => number;
    readonly data_delete_shipment: (a: number) => number;
    readonly data_get_envelope: (a: number) => number;
    readonly data_get_shipment: (a: number) => number;
    readonly data_join_loaded: (a: number) => number;
    readonly data_list_envelopes: (a: number) => number;
    readonly data_list_where: (a: number) => number;
    readonly data_pnl_line_id: (a: number, b: number) => void;
    readonly data_publish_billing: (a: number) => number;
    readonly data_published_for: (a: number) => number;
    readonly data_put_envelope: (a: number) => number;
    readonly data_put_shipment: (a: number) => number;
    readonly data_write_gate: (a: number) => number;
    readonly drain_events: (a: number) => void;
    readonly flows_accept_quote: (a: number) => number;
    readonly flows_active_sales_reps: (a: number) => number;
    readonly flows_air_calc: (a: number, b: number) => void;
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
    readonly flows_disable_user: (a: number) => number;
    readonly flows_edit_profile: (a: number) => number;
    readonly flows_ensure_rep_code: (a: number) => number;
    readonly flows_ensure_state_aliases: (a: number) => number;
    readonly flows_export_workspace: (a: number) => number;
    readonly flows_format_job_no: (a: number, b: number) => void;
    readonly flows_generate_quote_id: (a: number) => number;
    readonly flows_invite_sales: (a: number) => number;
    readonly flows_license_error_key: (a: number, b: number) => void;
    readonly flows_license_resolve: (a: number) => number;
    readonly flows_migrate_shipment_states: (a: number) => number;
    readonly flows_next_local_seq: (a: number) => number;
    readonly flows_persist_advanced_state: (a: number) => number;
    readonly flows_post_commission: (a: number) => number;
    readonly flows_post_reversal: (a: number) => number;
    readonly flows_post_shipment: (a: number) => number;
    readonly flows_promote_to_manager: (a: number) => number;
    readonly flows_quote_converted: (a: number) => number;
    readonly flows_register_entity: (a: number) => number;
    readonly flows_rehydrate_fsm: (a: number) => number;
    readonly flows_rep_code_valid: (a: number, b: number) => void;
    readonly flows_repo_max_seq: (a: number) => number;
    readonly flows_sales_analytics: (a: number, b: number) => void;
    readonly flows_sales_commission: (a: number) => number;
    readonly flows_sales_rep_by_prefix: (a: number, b: number) => void;
    readonly flows_save_quote_draft: (a: number) => number;
    readonly flows_self_rep_candidate: (a: number, b: number) => void;
    readonly flows_send_quote: (a: number) => number;
    readonly flows_shipment_affordance: (a: number, b: number) => void;
    readonly flows_slugify: (a: number, b: number) => void;
    readonly flows_void_apply: (a: number) => number;
    readonly flows_void_plan: (a: number, b: number) => void;
    readonly fork_allocate: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly freight_app_init: (a: number) => void;
    readonly fx_rate_get: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly fx_rate_ingest_month: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly fx_rate_prepare_append: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly get_entity_state: (a: number, b: number, c: number) => void;
    readonly get_transition_log: (a: number, b: number, c: number) => void;
    readonly get_validation_errors: (a: number) => void;
    readonly governance_bootstrap_acl_folders: (a: number) => number;
    readonly governance_can_edit_default_currency: (a: number, b: number) => void;
    readonly governance_close_period: (a: number) => number;
    readonly governance_close_records: (a: number) => number;
    readonly governance_ensure_workspace_root: (a: number) => number;
    readonly governance_error_records: (a: number) => number;
    readonly governance_filter_sidebar: (a: number, b: number) => void;
    readonly governance_find_lock: (a: number) => number;
    readonly governance_first_run_provision: (a: number) => number;
    readonly governance_home_route: (a: number, b: number) => void;
    readonly governance_is_already_provisioned: (a: number) => number;
    readonly governance_load_settings: (a: number) => number;
    readonly governance_lock_period: (a: number) => number;
    readonly governance_locked_periods: (a: number) => number;
    readonly governance_merge_diff: (a: number, b: number) => void;
    readonly governance_merge_records: (a: number, b: number) => void;
    readonly governance_normalize_role: (a: number, b: number) => void;
    readonly governance_opening_balance: (a: number, b: number) => void;
    readonly governance_period_math: (a: number, b: number) => void;
    readonly governance_period_of: (a: number, b: number) => void;
    readonly governance_pre_close_checks: (a: number) => number;
    readonly governance_purge_error_month: (a: number) => number;
    readonly governance_reopen_period: (a: number) => number;
    readonly governance_repoint_refs: (a: number) => number;
    readonly governance_route_guard: (a: number, b: number) => void;
    readonly governance_save_settings: (a: number) => number;
    readonly governance_unlock_period: (a: number) => number;
    readonly governance_user_roles: (a: number, b: number) => void;
    readonly import_booking_excel_wasm: (a: number, b: number, c: number) => void;
    readonly import_document_excel_wasm: (a: number, b: number, c: number) => void;
    readonly import_pnl_excel_wasm: (a: number, b: number, c: number) => void;
    readonly license_arm: (a: number, b: number, c: bigint) => number;
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
    readonly manager_email_valid: (a: number, b: number) => void;
    readonly manager_exception_escalate: (a: number, b: number) => void;
    readonly manager_exception_mttr: (a: number, b: number) => void;
    readonly manager_exception_per_sales: (a: number, b: number) => void;
    readonly manager_exception_trends: (a: number, b: number) => void;
    readonly manager_exceptions_sorted: (a: number, b: number) => void;
    readonly manager_fork: (a: number, b: number) => void;
    readonly manager_ledger_apply_repost: (a: number) => number;
    readonly manager_ledger_auto_reconcile: (a: number) => number;
    readonly manager_ledger_balance_sheet: (a: number, b: number) => void;
    readonly manager_ledger_chart_groups: (a: number, b: number) => void;
    readonly manager_ledger_csv: (a: number, b: number) => void;
    readonly manager_ledger_filter_legs: (a: number, b: number) => void;
    readonly manager_ledger_plan_repost: (a: number) => number;
    readonly manager_ledger_pnl: (a: number, b: number) => void;
    readonly manager_ledger_pnl_monthly: (a: number, b: number) => void;
    readonly manager_ledger_purge_orphans: (a: number) => number;
    readonly manager_ledger_reconcile: (a: number) => number;
    readonly manager_ledger_running_balances: (a: number, b: number) => void;
    readonly manager_ledger_trial_balance: (a: number, b: number) => void;
    readonly manager_notification_from_event: (a: number, b: number) => void;
    readonly manager_notifications_time_based: (a: number, b: number) => void;
    readonly manager_period_key: (a: number, b: number) => void;
    readonly manager_pnl_buy_sell: (a: number, b: number) => void;
    readonly manager_pnl_drill: (a: number, b: number) => void;
    readonly manager_pnl_pivot: (a: number, b: number) => void;
    readonly manager_users_filter: (a: number, b: number) => void;
    readonly manager_users_sort: (a: number, b: number) => void;
    readonly permission_can_merge: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly permission_can_pull: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly permission_can_push: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly permission_can_push_own_fork: (a: number, b: number, c: number) => void;
    readonly permission_resolve_grants: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly priced_ref_check_overlap: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly priced_ref_resolve_on_date: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly process_excel_file: (a: number, b: number, c: number) => void;
    readonly proposal_merge: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => void;
    readonly proposal_propose: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly proposal_reject: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => void;
    readonly register_entity: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly shipment_auto_advance: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly shipment_phases: (a: number, b: number, c: number, d: number, e: number) => void;
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
    readonly sync_quota_check: (a: number) => number;
    readonly sync_user_audit_read: (a: number) => number;
    readonly sync_user_audit_write: (a: number) => number;
    readonly sync_wma_dismiss: (a: number, b: number) => void;
    readonly sync_wma_load: (a: number) => number;
    readonly sync_wma_on_event: (a: number, b: number) => void;
    readonly sync_wma_predict: (a: number, b: number) => void;
    readonly sync_wma_save: (a: number) => number;
    readonly validate_awb_no: (a: number, b: number) => number;
    readonly validate_iata_dgr_class: (a: number, b: number) => number;
    readonly vdg_version: (a: number) => void;
    readonly verify_license: (a: number, b: number, c: bigint) => number;
    readonly wasmentityrepo_awb_append: (a: number, b: number, c: number) => number;
    readonly wasmentityrepo_awb_delete: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_awb_list_by_month: (a: number, b: number, c: number) => number;
    readonly wasmentityrepo_delete: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_drain_outbox: (a: number) => number;
    readonly wasmentityrepo_fetch_older: (a: number, b: number, c: number, d: number, e: number) => number;
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
    readonly wasmentityrepo_lgr_append_leg: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly wasmentityrepo_lgr_append_log: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_lgr_ensure_seed_file: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_lgr_get_balance: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_lgr_is_posted: (a: number, b: number, c: number) => number;
    readonly wasmentityrepo_lgr_last_log: (a: number, b: number, c: number) => number;
    readonly wasmentityrepo_lgr_list_entry_legs: (a: number, b: number, c: number, d: number) => number;
    readonly wasmentityrepo_lgr_list_legs: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => number;
    readonly wasmentityrepo_lgr_record_posted: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_lgr_remove_entry: (a: number, b: number, c: number, d: number) => number;
    readonly wasmentityrepo_lgr_replace_leg: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly wasmentityrepo_lgr_set_chart: (a: number, b: number, c: number, d: number) => void;
    readonly wasmentityrepo_list: (a: number, b: number, c: number) => number;
    readonly wasmentityrepo_mint_quote_ref: (a: number, b: number, c: number) => number;
    readonly wasmentityrepo_mint_shipment_ref: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_network_rate_check: (a: number, b: number) => void;
    readonly wasmentityrepo_new: (a: number) => number;
    readonly wasmentityrepo_pref_get_state: (a: number, b: number, c: number) => number;
    readonly wasmentityrepo_pref_list_pending: (a: number, b: number, c: number) => number;
    readonly wasmentityrepo_pref_move_closed: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
    readonly wasmentityrepo_pref_read_pending: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_pref_seed_if_empty: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_pref_write_pending: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_pref_write_state: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_put: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly wasmentityrepo_sync_delta: (a: number) => number;
    readonly wasmentityrepo_users_ensure_seeded: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
    readonly wasmentityrepo_users_get: (a: number, b: number, c: number) => number;
    readonly wasmentityrepo_users_list: (a: number) => number;
    readonly wasmentityrepo_users_list_all: (a: number) => number;
    readonly wasmentityrepo_users_remove: (a: number, b: number, c: number) => number;
    readonly wasmentityrepo_users_upsert: (a: number, b: number, c: number) => number;
    readonly workspace_header_currency: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly workspace_selectable_currencies: (a: number) => void;
    readonly __wasm_bindgen_func_elem_12357: (a: number, b: number, c: number, d: number) => void;
    readonly __wasm_bindgen_func_elem_12370: (a: number, b: number, c: number, d: number) => void;
    readonly __wasm_bindgen_func_elem_4065: (a: number, b: number) => void;
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
