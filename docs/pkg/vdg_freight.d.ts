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
    lgr_append_leg(year: number, acc_code: string, leg_json: string): Promise<any>;
    lgr_append_log(file: string, record_json: string): Promise<any>;
    lgr_ensure_seed_file(file_name: string, content: string): Promise<any>;
    lgr_get_balance(acc_code: string, as_of: string): Promise<any>;
    lgr_is_posted(posted_index: string): Promise<any>;
    lgr_last_log(file: string): Promise<any>;
    lgr_list_entry_legs(year: number, entry_id: string): Promise<any>;
    lgr_list_legs(year: number, acc_code: string, from: string, to: string): Promise<any>;
    lgr_record_posted(posted_index: string, entry_ids_json: string): Promise<any>;
    lgr_replace_leg(year: number, acc_code: string, leg_json: string): Promise<any>;
    lgr_set_chart(chart_json: string): void;
    list(kind: string): Promise<any>;
    mint_quote_ref(salt: string): Promise<any>;
    mint_shipment_ref(direction: string, salt: string): Promise<any>;
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
    users_ensure_seeded(email: string, name: string): Promise<any>;
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
 * Full air-rate result for the UI: chargeable weight, matched break tier, freight total.
 * `breaks_json` = `[{"min_kg":45,"rate_per_kg":3.5}, ...]`. Returns null when no tier applies.
 */
export function air_calc_result(actual: number, l: number, w: number, h: number, breaks_json: string): any;

/**
 * Applies a lifecycle event to the entity's stored state via the real
 * ShipmentFsm, persists the new state, and appends a transition record.
 */
export function apply_fsm_event(entity_id: string, event: string): any;

export function billing_ledger_drain_writes(): any;

export function billing_ledger_ingest(ledger_json: string): void;

export function check_air_rate_transition(from: string, event: string): boolean;

export function check_air_shipment_transition(from: string, event: string, ctx_json: string): boolean;

export function check_allocation_within_mgw(tare_kg: number, mgw_kg: number, total_chargeable_kg: number): boolean;

export function check_awb_doc_transition(from: string, event: string): boolean;

/**
 * Returns true when `event` is a valid next event from `from_state` in FSM-04.
 */
export function check_quotation_transition(from_state: string, event: string): boolean;

/**
 * Compute SalesShare + CompanyRetained commission entries.
 * `deductions_json` = `{"corp_tax_vnd": 1000000, "customer_kickback_vnd": 500000, "line_commission_vnd": 200000}`
 * Returns `{ sales_share: CommissionEntry, company_retained: CommissionEntry }`.
 */
export function commission_compute(shipment_json: string, rule_id: string, deductions_json: string): any;

/**
 * Resolve which CommissionRule applies to a sales rep for a given shipment.
 * Returns the matched CommissionRule as JsValue (for JS to cache and pass back).
 */
export function commission_resolve_rule(sales_id: string, shipment_json: string): any;

/**
 * Override the default registry with rules loaded from Drive (JSON array of CommissionRule).
 * Call on boot after loading `commission_rules` entity from repo.
 */
export function commission_rules_ingest(rules_json: string): void;

/**
 * Single-source profit waterfall for the UI: margin → TNDN(20%) → net → sales/LBS split.
 * `sales_pct_0_100` is the manager-set share (0–100). Returns whole-VND figures.
 * `clamp_negatives`: true for payout (loss → zero), false for the sales-form
 * preview (keep signed loss). This is the ONLY commission math JS may display.
 */
export function commission_waterfall(margin_vnd: number, com_deductions_vnd: number, sales_pct_0_100: number, clamp_negatives: boolean): any;

export function compute_chargeable_kg(actual: number, l: number, w: number, h: number): number;

export function compute_due_soon(billing_json: string, today_str: string, warn_days: number): any;

export function compute_freight(actual: number, l: number, w: number, h: number, breaks_json: string): number | undefined;

/**
 * Single document create (manual form). Returns DocumentDto echo with Draft state.
 * Operator wiring deferred to F-03-01 (Document FSM entity).
 */
export function create_document_wasm(cmd_json: string): any;

export function drain_events(): any;

/**
 * Run one or more statements with no result rows (DDL / INSERT / UPDATE / DELETE, no bind params).
 */
export function exec(sql: string): void;

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
 * Returns true when `entity_etd_ms` falls within a closed period.
 * `closed_periods_json` = `[{"period":"YYYY-MM","closed_at":"..."}]`
 */
export function is_period_closed(entity_kind: string, entity_etd_ms: bigint, closed_periods_json: string): boolean;

/**
 * Lifecycle status of a license at `current_unix_ts` (active/grace/blocked/invalid),
 * checked against the compiled-in `WORKSPACE_ROOT`.
 */
export function license_status(license_str: string, current_unix_ts: bigint): any;

export function permission_can_merge(role: string, ref_name: string): boolean;

export function permission_can_pull(role: string, ref_name: string): boolean;

export function permission_can_push(role: string, ref_name: string): boolean;

export function permission_can_push_own_fork(role: string): boolean;

/**
 * Returns Vec<PermissionEntry> as JSON (`[{path, access}]`) — role-assignment-service.js's
 * resolveAcl() consumes this directly, replacing the role-drive-acl.json fetch.
 */
export function permission_resolve_grants(role: string, user_prefix?: string | null): any;

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
export function proposal_merge(proposal_json: string, ref_state_json: string, actor_role: string): any;

/**
 * AC-01, AC-06, AC-07: propose returns a Pending ProposalDto to JS. Requires
 * only read access on `target_ref` — never maintainer rights.
 */
export function proposal_propose(input_json: string, author_role: string): any;

/**
 * R-3, AC-07: a maintainer may decline a Pending proposal without merging.
 */
export function proposal_reject(proposal_json: string, actor_role: string, reason: string): any;

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

/**
 * Generic select export — kept for the one remaining ad-hoc caller path; returns a JSON array of
 * row objects. Business queries go through `sqlite_store`, not this.
 */
export function select(sql: string, params_json: string): string;

/**
 * One-time init: install the OPFS sahpool VFS (as default), open the db, run the schema.
 * `scope` partitions the pool per account — an empty scope is refused rather than silently
 * falling back to a shared database.
 */
export function sqlite_init(scope: string): Promise<void>;

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

export function validate_airport_iata(s: string): boolean;

export function validate_awb_no(s: string): boolean;

export function validate_carrier_iata(s: string): boolean;

export function validate_carrier_icao(s: string): boolean;

export function validate_flight_no_wasm(s: string): boolean;

export function validate_iata_dgr_class(class_str: string): boolean;

export function validate_uld_code(s: string): boolean;

export function vdg_version(): string;

export function verify_license(license_str: string, current_unix_ts: bigint): any;

export function wasm_build_entries_from_commission(commission_json: string, chart_json: string, rules_json: string): any;

export function wasm_build_entries_from_shipment(shipment_json: string, chart_json: string, rules_json: string): any;

export function wasm_build_reversal_entry(legs_json: string, chart_json: string, actor_id: string): any;

export function wasm_compute_sales_analytics(shipments_json: string, lines_json: string): any;

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
    readonly air_calc_result: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly apply_fsm_event: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly billing_ledger_drain_writes: (a: number) => void;
    readonly billing_ledger_ingest: (a: number, b: number, c: number) => void;
    readonly check_air_rate_transition: (a: number, b: number, c: number, d: number) => number;
    readonly check_air_shipment_transition: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly check_allocation_within_mgw: (a: number, b: number, c: number) => number;
    readonly check_awb_doc_transition: (a: number, b: number, c: number, d: number) => number;
    readonly check_quotation_transition: (a: number, b: number, c: number, d: number) => number;
    readonly commission_compute: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly commission_resolve_rule: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly commission_rules_ingest: (a: number, b: number, c: number) => void;
    readonly commission_waterfall: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly compute_chargeable_kg: (a: number, b: number, c: number, d: number) => number;
    readonly compute_due_soon: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly compute_freight: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly create_document_wasm: (a: number, b: number, c: number) => void;
    readonly customerindex_add_customer: (a: number, b: number, c: number) => number;
    readonly customerindex_new: () => number;
    readonly customerindex_search: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly drain_events: (a: number) => void;
    readonly exec: (a: number, b: number, c: number) => void;
    readonly fx_rate_get: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly fx_rate_ingest_month: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly fx_rate_prepare_append: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly get_entity_state: (a: number, b: number, c: number) => void;
    readonly get_transition_log: (a: number, b: number, c: number) => void;
    readonly get_validation_errors: (a: number) => void;
    readonly import_booking_excel_wasm: (a: number, b: number, c: number) => void;
    readonly import_document_excel_wasm: (a: number, b: number, c: number) => void;
    readonly import_pnl_excel_wasm: (a: number, b: number, c: number) => void;
    readonly is_period_closed: (a: number, b: number, c: bigint, d: number, e: number) => number;
    readonly license_status: (a: number, b: number, c: bigint) => number;
    readonly permission_can_merge: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly permission_can_pull: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly permission_can_push: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly permission_can_push_own_fork: (a: number, b: number, c: number) => void;
    readonly permission_resolve_grants: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly priced_ref_resolve_on_date: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly process_excel_file: (a: number, b: number, c: number) => void;
    readonly proposal_merge: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly proposal_propose: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly proposal_reject: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly register_entity: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly run: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly select: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly sqlite_init: (a: number, b: number) => number;
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
    readonly validate_airport_iata: (a: number, b: number) => number;
    readonly validate_awb_no: (a: number, b: number) => number;
    readonly validate_carrier_iata: (a: number, b: number) => number;
    readonly validate_carrier_icao: (a: number, b: number) => number;
    readonly validate_flight_no_wasm: (a: number, b: number) => number;
    readonly validate_iata_dgr_class: (a: number, b: number) => number;
    readonly validate_uld_code: (a: number, b: number) => number;
    readonly vdg_version: (a: number) => void;
    readonly verify_license: (a: number, b: number, c: bigint) => number;
    readonly wasm_build_entries_from_commission: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly wasm_build_entries_from_shipment: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly wasm_build_reversal_entry: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly wasm_compute_sales_analytics: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly wasmentityrepo_awb_append: (a: number, b: number, c: number) => number;
    readonly wasmentityrepo_awb_delete: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_awb_list_by_month: (a: number, b: number, c: number) => number;
    readonly wasmentityrepo_delete: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_drain_outbox: (a: number) => number;
    readonly wasmentityrepo_fx_apply_writes: (a: number, b: number, c: number) => number;
    readonly wasmentityrepo_fx_delete_entry: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
    readonly wasmentityrepo_fx_invalidate_month: (a: number, b: number, c: number) => void;
    readonly wasmentityrepo_fx_list_all: (a: number) => number;
    readonly wasmentityrepo_fx_list_by_month: (a: number, b: number, c: number) => number;
    readonly wasmentityrepo_fx_months_to_ingest: (a: number) => number;
    readonly wasmentityrepo_get: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_lgr_append_leg: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly wasmentityrepo_lgr_append_log: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_lgr_ensure_seed_file: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_lgr_get_balance: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_lgr_is_posted: (a: number, b: number, c: number) => number;
    readonly wasmentityrepo_lgr_last_log: (a: number, b: number, c: number) => number;
    readonly wasmentityrepo_lgr_list_entry_legs: (a: number, b: number, c: number, d: number) => number;
    readonly wasmentityrepo_lgr_list_legs: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => number;
    readonly wasmentityrepo_lgr_record_posted: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_lgr_replace_leg: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly wasmentityrepo_lgr_set_chart: (a: number, b: number, c: number, d: number) => void;
    readonly wasmentityrepo_list: (a: number, b: number, c: number) => number;
    readonly wasmentityrepo_mint_quote_ref: (a: number, b: number, c: number) => number;
    readonly wasmentityrepo_mint_shipment_ref: (a: number, b: number, c: number, d: number, e: number) => number;
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
    readonly wasmentityrepo_users_ensure_seeded: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_users_get: (a: number, b: number, c: number) => number;
    readonly wasmentityrepo_users_list: (a: number) => number;
    readonly wasmentityrepo_users_list_all: (a: number) => number;
    readonly wasmentityrepo_users_remove: (a: number, b: number, c: number) => number;
    readonly wasmentityrepo_users_upsert: (a: number, b: number, c: number) => number;
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
    readonly __wasm_bindgen_func_elem_10568: (a: number, b: number, c: number, d: number) => void;
    readonly __wasm_bindgen_func_elem_10570: (a: number, b: number, c: number, d: number) => void;
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
