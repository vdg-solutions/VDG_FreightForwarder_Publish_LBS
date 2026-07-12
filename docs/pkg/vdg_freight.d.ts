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
    delete(kind: string, id: string): Promise<any>;
    get(kind: string, id: string): Promise<any>;
    list(kind: string): Promise<any>;
    constructor(io: any);
    put(kind: string, id: string, body: any): Promise<any>;
}

export function __wasm_init(): void;

/**
 * Full air-rate result for the UI: chargeable weight, matched break tier, freight total.
 * `breaks_json` = `[{"min_kg":45,"rate_per_kg":3.5}, ...]`. Returns null when no tier applies.
 */
export function air_calc_result(actual: number, l: number, w: number, h: number, breaks_json: string): any;

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

export function compute_freight(actual: number, l: number, w: number, h: number, breaks_json: string): number | undefined;

/**
 * Single document create (manual form). Returns DocumentDto echo with Draft state.
 * Operator wiring deferred to F-03-01 (Document FSM entity).
 */
export function create_document_wasm(cmd_json: string): any;

/**
 * Auto-detect legacy format only → DetectResult as JsValue.
 */
export function detect_pnl_format_wasm(bytes: Uint8Array): any;

export function drain_events(): any;

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
 * Validate entry, queue Drive write, invalidate month cache.
 * Returns `[{path, line}]` — JS appends each line to Drive.
 */
export function fx_rate_prepare_append(entry_json: string): any;

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

export function import_legacy_pnl_wasm(bytes: Uint8Array): any;

/**
 * Combined PNL import → CombinedImportReport as JsValue.
 */
export function import_pnl_combined_wasm(bytes: Uint8Array): any;

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

export function process_excel_file(bytes: Uint8Array): any;

/**
 * Returns canonical sales-rep provisioning spec as JSON.
 */
export function provision_sales_rep(email: string, role: string): any;

/**
 * Returns canonical workspace provisioning spec as JSON.
 * Drive folder creation stays JS-side; WASM owns the schema.
 */
export function provision_workspace(workspace_name: string): any;

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

export function wasm_compute_sales_analytics(shipments_json: string, lines_json: string): any;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wasm_init: () => void;
    readonly __wbg_customerindex_free: (a: number, b: number) => void;
    readonly __wbg_wasmentityrepo_free: (a: number, b: number) => void;
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
    readonly compute_freight: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly create_document_wasm: (a: number, b: number, c: number) => void;
    readonly customerindex_add_customer: (a: number, b: number, c: number) => number;
    readonly customerindex_new: () => number;
    readonly customerindex_search: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly detect_pnl_format_wasm: (a: number, b: number, c: number) => void;
    readonly drain_events: (a: number) => void;
    readonly fx_rate_get: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly fx_rate_ingest_month: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly fx_rate_prepare_append: (a: number, b: number, c: number) => void;
    readonly get_entity_state: (a: number, b: number, c: number) => void;
    readonly get_transition_log: (a: number, b: number, c: number) => void;
    readonly get_validation_errors: (a: number) => void;
    readonly import_booking_excel_wasm: (a: number, b: number, c: number) => void;
    readonly import_document_excel_wasm: (a: number, b: number, c: number) => void;
    readonly import_legacy_pnl_wasm: (a: number, b: number, c: number) => void;
    readonly import_pnl_combined_wasm: (a: number, b: number, c: number) => void;
    readonly import_pnl_excel_wasm: (a: number, b: number, c: number) => void;
    readonly is_period_closed: (a: number, b: number, c: bigint, d: number, e: number) => number;
    readonly license_status: (a: number, b: number, c: bigint) => number;
    readonly permission_can_merge: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly permission_can_pull: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly permission_can_push: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly permission_can_push_own_fork: (a: number, b: number, c: number) => void;
    readonly permission_resolve_grants: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly process_excel_file: (a: number, b: number, c: number) => void;
    readonly provision_sales_rep: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly provision_workspace: (a: number, b: number, c: number) => void;
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
    readonly wasm_compute_sales_analytics: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly wasmentityrepo_delete: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_get: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly wasmentityrepo_list: (a: number, b: number, c: number) => number;
    readonly wasmentityrepo_new: (a: number) => number;
    readonly wasmentityrepo_put: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly __wasm_bindgen_func_elem_6563: (a: number, b: number, c: number, d: number) => void;
    readonly __wasm_bindgen_func_elem_6576: (a: number, b: number, c: number, d: number) => void;
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
