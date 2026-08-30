/* @ts-self-types="./vdg_freight.d.ts" */

export class CustomerIndex {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        CustomerIndexFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_customerindex_free(ptr, 0);
    }
    /**
     * @param {string} json_str
     * @returns {boolean}
     */
    add_customer(json_str) {
        const ptr0 = passStringToWasm0(json_str, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.customerindex_add_customer(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    constructor() {
        const ret = wasm.customerindex_new();
        this.__wbg_ptr = ret;
        CustomerIndexFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {string} query
     * @param {string} query_embedding_json
     * @param {number} top_k
     * @returns {string}
     */
    search(query, query_embedding_json, top_k) {
        let deferred3_0;
        let deferred3_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(query, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(query_embedding_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len1 = WASM_VECTOR_LEN;
            wasm.customerindex_search(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1, top_k);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred3_0 = r0;
            deferred3_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export5(deferred3_0, deferred3_1, 1);
        }
    }
}
if (Symbol.dispose) CustomerIndex.prototype[Symbol.dispose] = CustomerIndex.prototype.free;

export class WasmEntityRepo {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmEntityRepoFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmentityrepo_free(ptr, 0);
    }
    /**
     * @param {string} awb_json
     * @returns {Promise<any>}
     */
    awb_append(awb_json) {
        const ptr0 = passStringToWasm0(awb_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_awb_append(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * @param {string} awb_no
     * @param {string} ym
     * @returns {Promise<any>}
     */
    awb_delete(awb_no, ym) {
        const ptr0 = passStringToWasm0(awb_no, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(ym, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_awb_delete(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return takeObject(ret);
    }
    /**
     * H4-d: every AWB across every month — same shape as `fx_list_all` above.
     * @returns {Promise<any>}
     */
    awb_list_all() {
        const ret = wasm.wasmentityrepo_awb_list_all(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * @param {string} ym
     * @returns {Promise<any>}
     */
    awb_list_by_month(ym) {
        const ptr0 = passStringToWasm0(ym, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_awb_list_by_month(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * @param {string} kind
     * @param {string} id
     * @returns {Promise<any>}
     */
    delete(kind, id) {
        const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_delete(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return takeObject(ret);
    }
    /**
     * @returns {Promise<any>}
     */
    drain_outbox() {
        const ret = wasm.wasmentityrepo_drain_outbox(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * A CLOSED period outside the eager set (period_window.rs) -- a screen reaching back before
     * current/previous calls this before it reads the kind, so a period never fetched gets
     * loaded exactly once; a period already cached, or still inside the eager set, is a no-op.
     * No-op for a kind that is not period-scoped (cache_policy::is_period_scoped) -- load-all
     * already covers every period for those.
     * @param {string} kind
     * @param {string} period
     * @returns {Promise<any>}
     */
    ensure_period_loaded(kind, period) {
        const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(period, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_ensure_period_loaded(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return takeObject(ret);
    }
    /**
     * Apply fx_rate_prepare_append's pending writes (JSON [{path, line}]).
     * @param {string} writes_json
     * @returns {Promise<any>}
     */
    fx_apply_writes(writes_json) {
        const ptr0 = passStringToWasm0(writes_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_fx_apply_writes(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * @param {string} valid_from
     * @param {string} valid_to
     * @param {string} pair
     * @returns {Promise<any>}
     */
    fx_delete_entry(valid_from, valid_to, pair) {
        const ptr0 = passStringToWasm0(valid_from, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(valid_to, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(pair, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_fx_delete_entry(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2);
        return takeObject(ret);
    }
    /**
     * @param {string} ym
     */
    fx_invalidate_month(ym) {
        const ptr0 = passStringToWasm0(ym, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmentityrepo_fx_invalidate_month(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @returns {Promise<any>}
     */
    fx_list_all() {
        const ret = wasm.wasmentityrepo_fx_list_all(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * @param {string} ym
     * @returns {Promise<any>}
     */
    fx_list_by_month(ym) {
        const ptr0 = passStringToWasm0(ym, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_fx_list_by_month(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * [{ym, content}] for every month not yet handed to the fx domain island.
     * @returns {Promise<any>}
     */
    fx_months_to_ingest() {
        const ret = wasm.wasmentityrepo_fx_months_to_ingest(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * @param {string} kind
     * @param {string} id
     * @returns {Promise<any>}
     */
    get(kind, id) {
        const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_get(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return takeObject(ret);
    }
    /**
     * Ids of every record of `kind` whose `column` equals `value`.
     *
     * Resolves `{ ids, reads }`. `reads` is how many record files had to be downloaded to answer
     * — the honest measure of whether the index earned its keep, and the number a test asserts on
     * instead of trusting a log line. 0 = the index covered the folder; N = it covered nothing and
     * this was a plain scan, which is still the RIGHT answer, just the slow one.
     * @param {string} kind
     * @param {string} column
     * @param {string} value
     * @returns {Promise<any>}
     */
    index_ids_where(kind, column, value) {
        const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(column, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(value, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_index_ids_where(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2);
        return takeObject(ret);
    }
    /**
     * Same, for a record that left the table.
     * @param {string} kind
     * @param {string} id
     * @returns {Promise<any>}
     */
    index_note_delete(kind, id) {
        const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_index_note_delete(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return takeObject(ret);
    }
    /**
     * Fold a written record into every index its table declares. Best-effort by contract: the
     * read path reconciles, so a skipped update is a slower query and never a wrong one.
     * @param {string} kind
     * @param {string} id
     * @param {string} version
     * @param {string} row_json
     * @returns {Promise<any>}
     */
    index_note_write(kind, id, version, row_json) {
        const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(version, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passStringToWasm0(row_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len3 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_index_note_write(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3);
        return takeObject(ret);
    }
    /**
     * The record already holding `value` on a UNIQUE column, or null. Null means the value is
     * free, and that is only trustworthy because the reader reconciles against the folder listing
     * before answering.
     * @param {string} kind
     * @param {string} column
     * @param {string} value
     * @param {string} by_id
     * @returns {Promise<any>}
     */
    index_unique_holder(kind, column, value, by_id) {
        const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(column, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(value, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passStringToWasm0(by_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len3 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_index_unique_holder(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3);
        return takeObject(ret);
    }
    /**
     * A reopened period (period_close.rs's own reopen_period) invalidates THIS session's "fully
     * cached" marker for it -- see `ensure_period_loaded`'s own doc comment for the cross-client
     * gap this does not close.
     * @param {string} kind
     * @param {string} period
     * @returns {Promise<any>}
     */
    invalidate_period_cache(kind, period) {
        const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(period, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_invalidate_period_cache(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return takeObject(ret);
    }
    /**
     * @param {number} year
     * @param {string} acc_code
     * @param {string} leg_json
     * @returns {Promise<any>}
     */
    lgr_append_leg(year, acc_code, leg_json) {
        const ptr0 = passStringToWasm0(acc_code, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(leg_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_lgr_append_leg(this.__wbg_ptr, year, ptr0, len0, ptr1, len1);
        return takeObject(ret);
    }
    /**
     * @param {string} file
     * @param {string} record_json
     * @returns {Promise<any>}
     */
    lgr_append_log(file, record_json) {
        const ptr0 = passStringToWasm0(file, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(record_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_lgr_append_log(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return takeObject(ret);
    }
    /**
     * @param {string} file_name
     * @param {string} content
     * @returns {Promise<any>}
     */
    lgr_ensure_seed_file(file_name, content) {
        const ptr0 = passStringToWasm0(file_name, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(content, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_lgr_ensure_seed_file(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return takeObject(ret);
    }
    /**
     * F1: posted-index row (with entry_ids) for a dedup key, or null — powers reopen's reverse.
     * @param {string} posted_index
     * @returns {Promise<any>}
     */
    lgr_find_posted(posted_index) {
        const ptr0 = passStringToWasm0(posted_index, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_lgr_find_posted(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * @param {string} acc_code
     * @param {string} as_of
     * @returns {Promise<any>}
     */
    lgr_get_balance(acc_code, as_of) {
        const ptr0 = passStringToWasm0(acc_code, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(as_of, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_lgr_get_balance(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return takeObject(ret);
    }
    /**
     * @param {string} posted_index
     * @returns {Promise<any>}
     */
    lgr_is_posted(posted_index) {
        const ptr0 = passStringToWasm0(posted_index, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_lgr_is_posted(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * @param {string} file
     * @returns {Promise<any>}
     */
    lgr_last_log(file) {
        const ptr0 = passStringToWasm0(file, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_lgr_last_log(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * D17: which account codes have a file for this year — one listing so a repost scan skips
     * reading (and 404ing) every chart code against an empty book.
     * @param {number} year
     * @returns {Promise<any>}
     */
    lgr_list_account_codes(year) {
        const ret = wasm.wasmentityrepo_lgr_list_account_codes(this.__wbg_ptr, year);
        return takeObject(ret);
    }
    /**
     * @param {number} year
     * @param {string} entry_id
     * @returns {Promise<any>}
     */
    lgr_list_entry_legs(year, entry_id) {
        const ptr0 = passStringToWasm0(entry_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_lgr_list_entry_legs(this.__wbg_ptr, year, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * @param {number} year
     * @param {string} acc_code
     * @param {string} from
     * @param {string} to
     * @returns {Promise<any>}
     */
    lgr_list_legs(year, acc_code, from, to) {
        const ptr0 = passStringToWasm0(acc_code, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(from, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(to, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_lgr_list_legs(this.__wbg_ptr, year, ptr0, len0, ptr1, len1, ptr2, len2);
        return takeObject(ret);
    }
    /**
     * @param {string} posted_index
     * @param {string} entry_ids_json
     * @returns {Promise<any>}
     */
    lgr_record_posted(posted_index, entry_ids_json) {
        const ptr0 = passStringToWasm0(posted_index, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(entry_ids_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_lgr_record_posted(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return takeObject(ret);
    }
    /**
     * F1: drop a posted-index row after its entries were reversed — see release_posted's doc.
     * @param {string} posted_index
     * @returns {Promise<any>}
     */
    lgr_release_posted(posted_index) {
        const ptr0 = passStringToWasm0(posted_index, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_lgr_release_posted(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * Orphan purge only — see LedgerStoreOperator::remove_entry for why this is not a general delete.
     * @param {number} year
     * @param {string} entry_id
     * @returns {Promise<any>}
     */
    lgr_remove_entry(year, entry_id) {
        const ptr0 = passStringToWasm0(entry_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_lgr_remove_entry(this.__wbg_ptr, year, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * @param {number} year
     * @param {string} acc_code
     * @param {string} leg_json
     * @returns {Promise<any>}
     */
    lgr_replace_leg(year, acc_code, leg_json) {
        const ptr0 = passStringToWasm0(acc_code, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(leg_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_lgr_replace_leg(this.__wbg_ptr, year, ptr0, len0, ptr1, len1);
        return takeObject(ret);
    }
    /**
     * @param {string} chart_json
     */
    lgr_set_chart(chart_json) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(chart_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasmentityrepo_lgr_set_chart(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {string} kind
     * @param {string | null} [owner]
     * @returns {Promise<any>}
     */
    list(kind, owner) {
        const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(owner) ? 0 : passStringToWasm0(owner, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        var len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_list(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return takeObject(ret);
    }
    /**
     * @param {string} salt
     * @returns {Promise<any>}
     */
    mint_quote_ref(salt) {
        const ptr0 = passStringToWasm0(salt, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_mint_quote_ref(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * @param {string} direction
     * @param {string} salt
     * @returns {Promise<any>}
     */
    mint_shipment_ref(direction, salt) {
        const ptr0 = passStringToWasm0(direction, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(salt, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_mint_shipment_ref(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return takeObject(ret);
    }
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
    network_rate_check() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmentityrepo_network_rate_check(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {any} io
     */
    constructor(io) {
        const ret = wasm.wasmentityrepo_new(addHeapObject(io));
        this.__wbg_ptr = ret;
        WasmEntityRepoFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * (pending, quarantined) outbox row counts — the wasm boundary's initial-mount query so a
     * page reload sees a pre-existing quarantine on the very first paint (`OutboxOperator::
     * snapshot`'s own doc comment). Every LATER change already rides the existing
     * `vdg:outbox-changed`/`vdg:sync-complete` events, which now carry the same `quarantined`
     * field — this is only for the moment before either has fired yet this session.
     * @returns {Promise<any>}
     */
    outbox_snapshot() {
        const ret = wasm.wasmentityrepo_outbox_snapshot(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * @param {string} ref_name
     * @returns {Promise<any>}
     */
    pref_get_state(ref_name) {
        const ptr0 = passStringToWasm0(ref_name, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_pref_get_state(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * @param {string} ref_name
     * @returns {Promise<any>}
     */
    pref_list_pending(ref_name) {
        const ptr0 = passStringToWasm0(ref_name, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_pref_list_pending(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * @param {string} ref_name
     * @param {string} id
     * @param {string} dto_json
     * @returns {Promise<any>}
     */
    pref_move_closed(ref_name, id, dto_json) {
        const ptr0 = passStringToWasm0(ref_name, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(dto_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_pref_move_closed(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2);
        return takeObject(ret);
    }
    /**
     * @param {string} ref_name
     * @param {string} id
     * @returns {Promise<any>}
     */
    pref_read_pending(ref_name, id) {
        const ptr0 = passStringToWasm0(ref_name, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_pref_read_pending(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return takeObject(ret);
    }
    /**
     * @param {string} ref_name
     * @param {string} records_json
     * @returns {Promise<any>}
     */
    pref_seed_if_empty(ref_name, records_json) {
        const ptr0 = passStringToWasm0(ref_name, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(records_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_pref_seed_if_empty(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return takeObject(ret);
    }
    /**
     * @param {string} ref_name
     * @param {string} dto_json
     * @returns {Promise<any>}
     */
    pref_write_pending(ref_name, dto_json) {
        const ptr0 = passStringToWasm0(ref_name, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(dto_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_pref_write_pending(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return takeObject(ret);
    }
    /**
     * @param {string} ref_name
     * @param {string} dto_json
     * @returns {Promise<any>}
     */
    pref_write_state(ref_name, dto_json) {
        const ptr0 = passStringToWasm0(ref_name, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(dto_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_pref_write_state(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return takeObject(ret);
    }
    /**
     * @param {string} kind
     * @param {string} id
     * @param {any} body
     * @returns {Promise<any>}
     */
    put(kind, id, body) {
        const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_put(this.__wbg_ptr, ptr0, len0, ptr1, len1, addHeapObject(body));
        return takeObject(ret);
    }
    /**
     * CDB-DM-15: same as `put`, plus labels -- the ONE extra capability a period-bound kind
     * needs (freight_app's `Records::put_labeled`, e.g. `ShipmentRepo` stamping `period` at
     * create). `labels` only matters when this call is a CREATE (`EntityStoreOperator::put`'s own
     * rule); an edit of an existing record drops them silently, same as `put` always has.
     * @param {string} kind
     * @param {string} id
     * @param {any} body
     * @param {any} labels
     * @returns {Promise<any>}
     */
    put_labeled(kind, id, body, labels) {
        const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_put_labeled(this.__wbg_ptr, ptr0, len0, ptr1, len1, addHeapObject(body), addHeapObject(labels));
        return takeObject(ret);
    }
    /**
     * @returns {Promise<any>}
     */
    sync_delta() {
        const ret = wasm.wasmentityrepo_sync_delta(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * Every kind currently failing this session (`sync_health::mark_failed`, armed from both
     * the pull side — `SyncDeltaOperator::bootstrap_once`/`run_delta` — and the push side —
     * `OutboxOperator::emit_sync_error`). Synchronous: it is an in-memory thread_local read, no
     * I/O, same shape as `network_rate_check` above — a view or the topbar can check it on
     * every render without a Promise round trip.
     * @returns {any}
     */
    sync_failed_kinds() {
        const ret = wasm.wasmentityrepo_sync_failed_kinds(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * One reason string for the chip tooltip — see `sync_health::first_failed_reason`'s own doc
     * comment for why one line, not the full per-kind list.
     * @returns {string | undefined}
     */
    sync_failed_reason() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmentityrepo_sync_failed_reason(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            let v1;
            if (r0 !== 0) {
                v1 = getStringFromWasm0(r0, r1).slice();
                wasm.__wbindgen_export5(r0, r1 * 1, 1);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * H4-b: the server itself is unreachable this session (`sync_health::is_unreachable`) —
     * distinct from `sync_failed_kinds` being non-empty, which also fires on a single master
     * kind's bootstrap failing narrowly while everything else still works. Synchronous, same
     * shape as `sync_failed_kinds` above: the chip reads this on every render, no round trip.
     * @returns {boolean}
     */
    sync_server_unreachable() {
        const ret = wasm.wasmentityrepo_sync_server_unreachable(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Distinct records skipped for `kind` this session — the count a view's partial-data notice
     * names (`empty_state.load_failed.partial` / `pivot-table.js`'s own `skippedCount`).
     * @param {string} kind
     * @returns {number}
     */
    sync_skipped_count(kind) {
        const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_sync_skipped_count(this.__wbg_ptr, ptr0, len0);
        return ret >>> 0;
    }
    /**
     * Every kind with at least one remote-skipped record this session (`SyncEvent::
     * RecordSkipped`, armed by `event_bridge.rs::emit`) — the same shape as `sync_failed_kinds`,
     * so a view (pnl-report.js's own load-outcome check) reads both registries the same way
     * instead of trusting an empty result as "no data for this period" (D13).
     * @returns {any}
     */
    sync_skipped_kinds() {
        const ret = wasm.wasmentityrepo_sync_skipped_kinds(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * @param {string} email
     * @param {string} name
     * @param {string} workspace
     * @returns {Promise<any>}
     */
    users_ensure_seeded(email, name, workspace) {
        const ptr0 = passStringToWasm0(email, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(name, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(workspace, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_users_ensure_seeded(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2);
        return takeObject(ret);
    }
    /**
     * @param {string} email
     * @returns {Promise<any>}
     */
    users_get(email) {
        const ptr0 = passStringToWasm0(email, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_users_get(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * @returns {Promise<any>}
     */
    users_list() {
        const ret = wasm.wasmentityrepo_users_list(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * @returns {Promise<any>}
     */
    users_list_all() {
        const ret = wasm.wasmentityrepo_users_list_all(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * H4-e: every grant, RAW stored shape, no UI projection — the workspace backup export's own
     * reach (see `UserStoreOperator::list_raw`'s own doc comment).
     * @returns {Promise<any>}
     */
    users_list_raw() {
        const ret = wasm.wasmentityrepo_users_list_raw(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * @param {string} email
     * @returns {Promise<any>}
     */
    users_remove(email) {
        const ptr0 = passStringToWasm0(email, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_users_remove(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * @param {string} user_json
     * @returns {Promise<any>}
     */
    users_upsert(user_json) {
        const ptr0 = passStringToWasm0(user_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmentityrepo_users_upsert(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
}
if (Symbol.dispose) WasmEntityRepo.prototype[Symbol.dispose] = WasmEntityRepo.prototype.free;

export function __wasm_init() {
    wasm.__wasm_init();
}

/**
 * @param {string} route
 * @param {string} roles
 * @returns {boolean}
 */
export function access_can_route(route, roles) {
    const ptr0 = passStringToWasm0(route, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(roles, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.access_can_route(ptr0, len0, ptr1, len1);
    return ret !== 0;
}

/**
 * @param {string} roles
 * @returns {string}
 */
export function access_home_route(roles) {
    let deferred2_0;
    let deferred2_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(roles, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        wasm.access_home_route(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        deferred2_0 = r0;
        deferred2_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export5(deferred2_0, deferred2_1, 1);
    }
}

/**
 * @param {string} route
 * @param {string} roles
 * @returns {string}
 */
export function access_redirect_for(route, roles) {
    let deferred3_0;
    let deferred3_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(route, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(roles, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        wasm.access_redirect_for(retptr, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        deferred3_0 = r0;
        deferred3_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export5(deferred3_0, deferred3_1, 1);
    }
}

/**
 * Roles carried by a users.jsonl record, as the comma-joined wire set. `roles` is the contract;
 * a legacy record with a single `role` reads back as a one-element set, so nothing needs
 * migrating. An unparsable record yields an EMPTY set — never a permissive default.
 * @param {string} record_json
 * @returns {string}
 */
export function access_roles_from_record(record_json) {
    let deferred2_0;
    let deferred2_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(record_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        wasm.access_roles_from_record(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        deferred2_0 = r0;
        deferred2_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export5(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Applies a lifecycle event to the entity's stored state via the real
 * ShipmentFsm, persists the new state, and appends a transition record.
 * @param {string} entity_id
 * @param {string} event
 * @returns {any}
 */
export function apply_fsm_event(entity_id, event) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(entity_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(event, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        wasm.apply_fsm_event(retptr, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function auth_adopt_session(req) {
    const ret = wasm.auth_adopt_session(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function auth_clear_role_cache(req) {
    const ret = wasm.auth_clear_role_cache(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function auth_detect_role(req) {
    const ret = wasm.auth_detect_role(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {any}
 */
export function auth_has_role(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.auth_has_role(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function auth_require_auth(req) {
    const ret = wasm.auth_require_auth(addHeapObject(req));
    return takeObject(ret);
}

/**
 * Boot's final principal resolution: JS hands over the signed-in email, this reads the staff
 * table and republishes the whole principal — no role/fork decision left on the JS side.
 * @param {any} req
 * @returns {Promise<any>}
 */
export function auth_resolve_principal(req) {
    const ret = wasm.auth_resolve_principal(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {any}
 */
export function auth_session_roles(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.auth_session_roles(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function auth_set_resolved_roles(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.auth_set_resolved_roles(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function cache_bulk_put(req) {
    const ret = wasm.cache_bulk_put(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {any}
 */
export function cache_can_write_master(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.cache_can_write_master(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function cache_find_match(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.cache_find_match(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function cache_route_prefetch(req) {
    const ret = wasm.cache_route_prefetch(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {string} from
 * @param {string} event
 * @returns {boolean}
 */
export function check_air_rate_transition(from, event) {
    const ptr0 = passStringToWasm0(from, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(event, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.check_air_rate_transition(ptr0, len0, ptr1, len1);
    return ret !== 0;
}

/**
 * @param {string} from
 * @param {string} event
 * @param {string} ctx_json
 * @returns {boolean}
 */
export function check_air_shipment_transition(from, event, ctx_json) {
    const ptr0 = passStringToWasm0(from, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(event, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passStringToWasm0(ctx_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.check_air_shipment_transition(ptr0, len0, ptr1, len1, ptr2, len2);
    return ret !== 0;
}

/**
 * @param {number} tare_kg
 * @param {number} mgw_kg
 * @param {number} total_chargeable_kg
 * @returns {boolean}
 */
export function check_allocation_within_mgw(tare_kg, mgw_kg, total_chargeable_kg) {
    const ret = wasm.check_allocation_within_mgw(tare_kg, mgw_kg, total_chargeable_kg);
    return ret !== 0;
}

/**
 * @param {string} from
 * @param {string} event
 * @returns {boolean}
 */
export function check_awb_doc_transition(from, event) {
    const ptr0 = passStringToWasm0(from, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(event, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.check_awb_doc_transition(ptr0, len0, ptr1, len1);
    return ret !== 0;
}

/**
 * `items_json` = JSON array of `{id, code}` (JS projects whichever field the master keys on —
 * iata_code/scac/code/id — onto `code` before calling). Returns true when `code` is a
 * duplicate of some OTHER item's code (skip_id excluded).
 * @param {string} items_json
 * @param {string} code
 * @param {string | null} [skip_id]
 * @returns {boolean}
 */
export function check_code_unique(items_json, code, skip_id) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(items_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(code, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        var ptr2 = isLikeNone(skip_id) ? 0 : passStringToWasm0(skip_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        var len2 = WASM_VECTOR_LEN;
        wasm.check_code_unique(retptr, ptr0, len0, ptr1, len1, ptr2, len2);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 !== 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * F-14-xx kanban drag guard — affordance only, telling the board whether a drag target has ANY
 * transition wired between the two states. The FSM still runs its real guards on the move via
 * `shipment_move_to` and may refuse it even when this returns true (credit hold, open exception,
 * missing dependency, ...). Unknown/corrupt state names are simply not offered.
 * @param {string} from_state
 * @param {string} to_state
 * @returns {boolean}
 */
export function check_shipment_transition(from_state, to_state) {
    const ptr0 = passStringToWasm0(from_state, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(to_state, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.check_shipment_transition(ptr0, len0, ptr1, len1);
    return ret !== 0;
}

/**
 * AC-10: case-insensitive prefix classify of a mục B description; falls back to `"Other"`.
 * @param {string} desc
 * @returns {string}
 */
export function classify_pnl_line_kind(desc) {
    let deferred2_0;
    let deferred2_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(desc, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        wasm.classify_pnl_line_kind(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        deferred2_0 = r0;
        deferred2_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export5(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Section C's prefilled TNCN pct before a manager edits a row (15, never enforced).
 * @returns {number}
 */
export function commission_default_personal_tax_pct() {
    const ret = wasm.commission_default_personal_tax_pct();
    return ret;
}

/**
 * net_after_tax = gross - bank_charge - tax (Section C "Thực nhận").
 * @param {number} gross_vnd
 * @param {number} bank_charge
 * @param {number} tax_amount
 * @returns {number}
 */
export function commission_net_after_tax(gross_vnd, bank_charge, tax_amount) {
    const ret = wasm.commission_net_after_tax(gross_vnd, bank_charge, tax_amount);
    return ret;
}

/**
 * TNCN withheld on a commission gross (whole VND, banker's rounding — see personal_tax.rs).
 * @param {number} gross_vnd
 * @param {number} tncn_pct_0_100
 * @returns {number}
 */
export function commission_personal_tax(gross_vnd, tncn_pct_0_100) {
    const ret = wasm.commission_personal_tax(gross_vnd, tncn_pct_0_100);
    return ret;
}

/**
 * sales_share_pct precedence: shipment override > user config > workspace default (50).
 * `None` (JS `null`/`undefined`) means "not set" at that tier.
 * @param {number | null} [override_pct]
 * @param {number | null} [user_config_pct]
 * @returns {number}
 */
export function commission_resolve_sales_share_pct(override_pct, user_config_pct) {
    const ret = wasm.commission_resolve_sales_share_pct(!isLikeNone(override_pct), isLikeNone(override_pct) ? 0 : override_pct, !isLikeNone(user_config_pct), isLikeNone(user_config_pct) ? 0 : user_config_pct);
    return ret;
}

/**
 * A rule is removable until a commission line has already been booked under it —
 * `entry_sales_ids_json` is a JSON array of the `created_by` of every loaded `commission_entry`
 * row. Returns the block reason, or null/undefined when the rule is safe to delete.
 * @param {string} sales_id
 * @param {string} entry_sales_ids_json
 * @returns {string | undefined}
 */
export function commission_rule_block_reason(sales_id, entry_sales_ids_json) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(sales_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(entry_sales_ids_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        wasm.commission_rule_block_reason(retptr, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        let v3;
        if (r0 !== 0) {
            v3 = getStringFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export5(r0, r1 * 1, 1);
        }
        return v3;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Validates `sales_pct_0_100` (0..100, `None`/undefined = default) and returns the verdict
 * `{ sales_pct, company_pct }` — company_pct is ALWAYS `100 - sales_pct` via the same `Split`
 * invariant the payout waterfall trusts. JS never computes `100 - x` itself.
 * @param {number | null} [sales_pct_0_100]
 * @returns {any}
 */
export function commission_rule_split(sales_pct_0_100) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.commission_rule_split(retptr, !isLikeNone(sales_pct_0_100), isLikeNone(sales_pct_0_100) ? 0 : sales_pct_0_100);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Single-source profit waterfall for the UI: margin → TNDN(20%) → net → sales/LBS split.
 * `sales_pct_0_100` is the manager-set share (0–100). Returns whole-VND figures.
 * `clamp_negatives`: true for payout (loss → zero), false for the sales-form
 * preview (keep signed loss). This is the ONLY commission math JS may display.
 * @param {number} margin_vnd
 * @param {number} com_deductions_vnd
 * @param {number} sales_pct_0_100
 * @param {boolean} clamp_negatives
 * @returns {any}
 */
export function commission_waterfall(margin_vnd, com_deductions_vnd, sales_pct_0_100, clamp_negatives) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.commission_waterfall(retptr, margin_vnd, com_deductions_vnd, sales_pct_0_100, clamp_negatives);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {string} shipments_json
 * @param {number} now_ms
 * @param {number} tz_offset_min
 * @returns {any}
 */
export function compute_dashboard_exceptions(shipments_json, now_ms, tz_offset_min) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(shipments_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        wasm.compute_dashboard_exceptions(retptr, ptr0, len0, now_ms, tz_offset_min);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {string} billing_json
 * @param {string} today_str
 * @param {number} warn_days
 * @returns {any}
 */
export function compute_due_soon(billing_json, today_str, warn_days) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(billing_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(today_str, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        wasm.compute_due_soon(retptr, ptr0, len0, ptr1, len1, warn_days);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Drops the remembered cross-fork scans, for the delta path.
 * @param {any} req
 * @returns {Promise<any>}
 */
export function data_clear_fork_scan(req) {
    const ret = wasm.data_clear_fork_scan(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function data_current_revision(req) {
    const ret = wasm.data_current_revision(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function data_delete_pnl_lines(req) {
    const ret = wasm.data_delete_pnl_lines(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function data_delete_shipment(req) {
    const ret = wasm.data_delete_shipment(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function data_get_envelope(req) {
    const ret = wasm.data_get_envelope(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function data_get_shipment(req) {
    const ret = wasm.data_get_shipment(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function data_join_loaded(req) {
    const ret = wasm.data_join_loaded(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function data_list_envelopes(req) {
    const ret = wasm.data_list_envelopes(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function data_list_where(req) {
    const ret = wasm.data_list_where(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {any}
 */
export function data_pnl_line_id(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.data_pnl_line_id(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function data_publish_billing(req) {
    const ret = wasm.data_publish_billing(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function data_published_for(req) {
    const ret = wasm.data_published_for(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function data_put_envelope(req) {
    const ret = wasm.data_put_envelope(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function data_put_shipment(req) {
    const ret = wasm.data_put_shipment(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function data_write_gate(req) {
    const ret = wasm.data_write_gate(addHeapObject(req));
    return takeObject(ret);
}

/**
 * F-41-07: `direction` may be `""` (unset); returns `""` when neither it nor `product` resolves.
 * @param {string} direction
 * @param {string} product
 * @returns {string}
 */
export function derive_shipment_direction(direction, product) {
    let deferred3_0;
    let deferred3_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(direction, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(product, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        wasm.derive_shipment_direction(retptr, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        deferred3_0 = r0;
        deferred3_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export5(deferred3_0, deferred3_1, 1);
    }
}

/**
 * @returns {any}
 */
export function drain_events() {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.drain_events(retptr);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Run one or more statements with no result rows (DDL / INSERT / UPDATE / DELETE, no bind params).
 * @param {string} sql
 */
export function exec(sql) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(sql, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        wasm.exec(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        if (r1) {
            throw takeObject(r0);
        }
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function flows_accept_quote(req) {
    const ret = wasm.flows_accept_quote(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function flows_active_sales_reps(req) {
    const ret = wasm.flows_active_sales_reps(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {any}
 */
export function flows_air_calc(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.flows_air_calc(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function flows_approval_decide(req) {
    const ret = wasm.flows_approval_decide(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function flows_assert_rep_code(req) {
    const ret = wasm.flows_assert_rep_code(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function flows_assign_job_no(req) {
    const ret = wasm.flows_assign_job_no(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function flows_assign_rep_code(req) {
    const ret = wasm.flows_assign_rep_code(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function flows_auto_advance(req) {
    const ret = wasm.flows_auto_advance(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {any}
 */
export function flows_build_entries_from_commission(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.flows_build_entries_from_commission(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function flows_build_entries_from_shipment(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.flows_build_entries_from_shipment(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function flows_build_reversal_entry(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.flows_build_reversal_entry(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function flows_chargeable_kg(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.flows_chargeable_kg(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function flows_clear_sales_registry(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.flows_clear_sales_registry(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function flows_commit_pnl_report(req) {
    const ret = wasm.flows_commit_pnl_report(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {any}
 */
export function flows_customer_rep(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.flows_customer_rep(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function flows_derive_sales_rep(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.flows_derive_sales_rep(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function flows_edit_profile(req) {
    const ret = wasm.flows_edit_profile(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function flows_ensure_rep_code(req) {
    const ret = wasm.flows_ensure_rep_code(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function flows_ensure_state_aliases(req) {
    const ret = wasm.flows_ensure_state_aliases(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function flows_export_workspace(req) {
    const ret = wasm.flows_export_workspace(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {any}
 */
export function flows_format_job_no(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.flows_format_job_no(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function flows_generate_quote_id(req) {
    const ret = wasm.flows_generate_quote_id(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {any}
 */
export function flows_license_error_key(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.flows_license_error_key(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function flows_license_resolve(req) {
    const ret = wasm.flows_license_resolve(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function flows_migrate_shipment_states(req) {
    const ret = wasm.flows_migrate_shipment_states(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function flows_next_local_seq(req) {
    const ret = wasm.flows_next_local_seq(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {any}
 */
export function flows_note_lines(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.flows_note_lines(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function flows_persist_advanced_state(req) {
    const ret = wasm.flows_persist_advanced_state(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {any}
 */
export function flows_pnl_fx_deviation(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.flows_pnl_fx_deviation(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function flows_pnl_line_vnd(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.flows_pnl_line_vnd(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function flows_pnl_vnd_invariant(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.flows_pnl_vnd_invariant(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function flows_post_commission(req) {
    const ret = wasm.flows_post_commission(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function flows_post_reversal(req) {
    const ret = wasm.flows_post_reversal(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function flows_post_shipment(req) {
    const ret = wasm.flows_post_shipment(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {any}
 */
export function flows_quote_affordance(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.flows_quote_affordance(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function flows_quote_converted(req) {
    const ret = wasm.flows_quote_converted(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function flows_quote_delete_apply(req) {
    const ret = wasm.flows_quote_delete_apply(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {any}
 */
export function flows_quote_delete_plan(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.flows_quote_delete_plan(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function flows_quote_totals(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.flows_quote_totals(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function flows_register_entity(req) {
    const ret = wasm.flows_register_entity(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function flows_rehydrate_fsm(req) {
    const ret = wasm.flows_rehydrate_fsm(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {any}
 */
export function flows_rep_code_valid(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.flows_rep_code_valid(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function flows_repo_max_seq(req) {
    const ret = wasm.flows_repo_max_seq(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {any}
 */
export function flows_sales_analytics(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.flows_sales_analytics(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function flows_sales_commission(req) {
    const ret = wasm.flows_sales_commission(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {any}
 */
export function flows_sales_rep_by_prefix(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.flows_sales_rep_by_prefix(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function flows_save_quote_draft(req) {
    const ret = wasm.flows_save_quote_draft(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {any}
 */
export function flows_self_rep_candidate(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.flows_self_rep_candidate(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function flows_send_quote(req) {
    const ret = wasm.flows_send_quote(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {any}
 */
export function flows_shipment_affordance(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.flows_shipment_affordance(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function flows_slugify(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.flows_slugify(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function flows_void_apply(req) {
    const ret = wasm.flows_void_apply(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {any}
 */
export function flows_void_plan(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.flows_void_plan(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * F4-d: the ONE date-display convention for the whole app, decided here rather than left to the
 * browser's `Intl` -- that is what drifted in the first place: `Intl.DateTimeFormat('vi', ...)`
 * picks a DIFFERENT separator for a day/month-only request than for a day/month/year one (proven
 * live: the exceptions trend axis showed `12-07`, the ledger's own date display showed
 * `12/07/2026`, same locale, same intent). A JS caller formatting a date is rendering; deciding
 * the convention is a rule, so it lives here -- JS only inserts the string this returns.
 * Accepts a bare `YYYY-MM-DD` (an `<input type="date">`'s `.value`, always this shape regardless
 * of the browser's display locale) or a full ISO timestamp; returns `""` for anything else.
 * @param {string} iso
 * @returns {string}
 */
export function fmt_date_display(iso) {
    let deferred2_0;
    let deferred2_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(iso, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        wasm.fmt_date_display(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        deferred2_0 = r0;
        deferred2_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export5(deferred2_0, deferred2_1, 1);
    }
}

/**
 * H4-c: the literal-format explainer shown beside a date input that has no value yet
 * (date-input-hint.js) -- day/month/year, same order and separator `fmt_date_display` formats a
 * real value with. Declared right beside it on purpose: a future change to that `format!()`
 * call is the one place a reviewer would also see this literal needs the same edit.
 * @returns {string}
 */
export function fmt_date_pattern_hint() {
    let deferred1_0;
    let deferred1_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.fmt_date_pattern_hint(retptr);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        deferred1_0 = r0;
        deferred1_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export5(deferred1_0, deferred1_1, 1);
    }
}

/**
 * `taken_json` is the JSON array of forks already in use; `seed` is a caller-supplied random
 * 0..9999 so two managers adding at once don't both pick the same suffix.
 * @param {string} email
 * @param {string} taken_json
 * @param {number} seed
 * @returns {string}
 */
export function fork_allocate(email, taken_json, seed) {
    let deferred4_0;
    let deferred4_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(email, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(taken_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        wasm.fork_allocate(retptr, ptr0, len0, ptr1, len1, seed);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        var ptr3 = r0;
        var len3 = r1;
        if (r3) {
            ptr3 = 0; len3 = 0;
            throw takeObject(r2);
        }
        deferred4_0 = ptr3;
        deferred4_1 = len3;
        return getStringFromWasm0(ptr3, len3);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export5(deferred4_0, deferred4_1, 1);
    }
}

/**
 * Installed once by js/bootstrap (after the wasm module is ready and the repo exists).
 * @param {any} platform
 */
export function freight_app_init(platform) {
    wasm.freight_app_init(addHeapObject(platform));
}

/**
 * Look up cached FX rate for one side of the quote. JS must ingest relevant months first, and
 * must state a direction ("Buy"|"Sell") — Circular 200 values monetary assets at the buying
 * rate and liabilities at the selling rate, so there is no default side to fall back to.
 * Returns the resolved Decimal (as a JSON string) on success.
 * @param {string} date_str
 * @param {string} pair
 * @param {string} direction
 * @returns {any}
 */
export function fx_rate_get(date_str, pair, direction) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(date_str, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(pair, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(direction, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len2 = WASM_VECTOR_LEN;
        wasm.fx_rate_get(retptr, ptr0, len0, ptr1, len1, ptr2, len2);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Push JSONL content for a month into WASM cache. `ym` = "YYYY-MM".
 * Pass empty string when Drive file is absent.
 * @param {string} ym
 * @param {string} content
 */
export function fx_rate_ingest_month(ym, content) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(ym, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(content, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        wasm.fx_rate_ingest_month(retptr, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        if (r1) {
            throw takeObject(r0);
        }
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Validate entry, enforce accountant-only write gate, queue Drive write.
 * Returns `[{path, line}]` — JS appends each line to Drive.
 * @param {string} entry_json
 * @param {string} role
 * @returns {any}
 */
export function fx_rate_prepare_append(entry_json, role) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(entry_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(role, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        wasm.fx_rate_prepare_append(retptr, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * F1: the bank never buys for more than it sells. Moved from util/validate-rate.js.
 * @param {string} raw_buy
 * @param {string} raw_sell
 */
export function fx_rate_validate_spread(raw_buy, raw_sell) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(raw_buy, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(raw_sell, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        wasm.fx_rate_validate_spread(retptr, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        if (r1) {
            throw takeObject(r0);
        }
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * AC-04: pre-submit rate check — same rule `fx_rate_prepare_append` enforces on write, exposed
 * so the UI can reject before attempting the append. Moved from util/validate-rate.js.
 * @param {string} raw_value
 */
export function fx_rate_validate_value(raw_value) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(raw_value, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        wasm.fx_rate_validate_value(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        if (r1) {
            throw takeObject(r0);
        }
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {string} code
 * @returns {string}
 */
export function gen_uom_id(code) {
    let deferred2_0;
    let deferred2_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(code, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        wasm.gen_uom_id(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        deferred2_0 = r0;
        deferred2_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export5(deferred2_0, deferred2_1, 1);
    }
}

/**
 * @param {string} entity_id
 * @returns {any}
 */
export function get_entity_state(entity_id) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(entity_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        wasm.get_entity_state(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {string} entity_id
 * @returns {any}
 */
export function get_transition_log(entity_id) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(entity_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        wasm.get_transition_log(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @returns {any}
 */
export function get_validation_errors() {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.get_validation_errors(retptr);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function governance_action_guard(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.governance_action_guard(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function governance_allowed_actions(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.governance_allowed_actions(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function governance_can_edit_default_currency(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.governance_can_edit_default_currency(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function governance_classify_read_status(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.governance_classify_read_status(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function governance_close_period(req) {
    const ret = wasm.governance_close_period(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function governance_close_records(req) {
    const ret = wasm.governance_close_records(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function governance_error_records(req) {
    const ret = wasm.governance_error_records(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {any}
 */
export function governance_filter_sidebar(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.governance_filter_sidebar(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function governance_find_lock(req) {
    const ret = wasm.governance_find_lock(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {any}
 */
export function governance_home_route(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.governance_home_route(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function governance_load_settings(req) {
    const ret = wasm.governance_load_settings(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function governance_lock_period(req) {
    const ret = wasm.governance_lock_period(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function governance_locked_periods(req) {
    const ret = wasm.governance_locked_periods(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {any}
 */
export function governance_normalize_role(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.governance_normalize_role(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function governance_opening_balance(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.governance_opening_balance(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function governance_period_math(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.governance_period_math(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function governance_period_of(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.governance_period_of(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function governance_pre_close_checks(req) {
    const ret = wasm.governance_pre_close_checks(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function governance_purge_error_month(req) {
    const ret = wasm.governance_purge_error_month(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function governance_reopen_period(req) {
    const ret = wasm.governance_reopen_period(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {any}
 */
export function governance_route_guard(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.governance_route_guard(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function governance_save_settings(req) {
    const ret = wasm.governance_save_settings(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function governance_unlock_period(req) {
    const ret = wasm.governance_unlock_period(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {any}
 */
export function governance_user_roles(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.governance_user_roles(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Booking Excel import — returns ImportReport<CreateShipmentCommand> as JsValue.
 * On file-level error (wrong template) returns JsError with PARSE code.
 * @param {Uint8Array} bytes
 * @returns {any}
 */
export function import_booking_excel_wasm(bytes) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.import_booking_excel_wasm(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Document Excel import → ImportReport<CreateDocumentCommand> as JsValue.
 * @param {Uint8Array} bytes
 * @returns {any}
 */
export function import_document_excel_wasm(bytes) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.import_document_excel_wasm(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * P&L Excel import → ImportReport<PnlImportRowDto> as JsValue.
 * @param {Uint8Array} bytes
 * @returns {any}
 */
export function import_pnl_excel_wasm(bytes) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.import_pnl_excel_wasm(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * F-20-11: classify AND arm the wasm write gate in one move. The boot gate calls THIS —
 * the verdict that reaches the repo's put/delete never round-trips through a JS value a
 * devtools user could edit. Every call re-arms; the latest classification wins.
 * @param {string} license_str
 * @param {bigint} current_unix_ts
 * @returns {any}
 */
export function license_arm(license_str, current_unix_ts) {
    const ptr0 = passStringToWasm0(license_str, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.license_arm(ptr0, len0, current_unix_ts);
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_air_invoice(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_air_invoice(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_air_pnl(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_air_pnl(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_ap_payables(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_ap_payables(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_ar_aging(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_ar_aging(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_ar_timeline(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_ar_timeline(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_audit_log_csv(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_audit_log_csv(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_audit_log_range(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_audit_log_range(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_audit_log_sort(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_audit_log_sort(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function manager_commission_rules(req) {
    const ret = wasm.manager_commission_rules(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_commission_sparkline(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_commission_sparkline(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_commissions(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_commissions(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_customer360(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_customer360(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_customer_mode_mix(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_customer_mode_mix(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function manager_dashboard(req) {
    const ret = wasm.manager_dashboard(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_demdet_overview(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_demdet_overview(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_document_board(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_document_board(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_email_valid(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_email_valid(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_exception_escalate(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_exception_escalate(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_exception_mttr(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_exception_mttr(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_exception_per_sales(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_exception_per_sales(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_exception_trends(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_exception_trends(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_exceptions_sorted(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_exceptions_sorted(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_fork(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_fork(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function manager_ledger_apply_repost(req) {
    const ret = wasm.manager_ledger_apply_repost(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function manager_ledger_auto_reconcile(req) {
    const ret = wasm.manager_ledger_auto_reconcile(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_ledger_balance_sheet(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_ledger_balance_sheet(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_ledger_chart_groups(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_ledger_chart_groups(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_ledger_csv(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_ledger_csv(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_ledger_entry_totals(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_ledger_entry_totals(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_ledger_filter_legs(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_ledger_filter_legs(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function manager_ledger_plan_repost(req) {
    const ret = wasm.manager_ledger_plan_repost(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_ledger_pnl(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_ledger_pnl(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_ledger_pnl_monthly(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_ledger_pnl_monthly(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function manager_ledger_purge_orphans(req) {
    const ret = wasm.manager_ledger_purge_orphans(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function manager_ledger_reconcile(req) {
    const ret = wasm.manager_ledger_reconcile(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_ledger_running_balances(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_ledger_running_balances(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_ledger_trial_balance(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_ledger_trial_balance(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_manifest_overview(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_manifest_overview(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_notification_from_event(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_notification_from_event(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_notifications_time_based(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_notifications_time_based(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_period_key(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_period_key(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_pnl_buy_sell(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_pnl_buy_sell(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_pnl_drill(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_pnl_drill(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_pnl_pivot(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_pnl_pivot(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_self_approved_review(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_self_approved_review(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_users_filter(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_users_filter(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function manager_users_sort(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.manager_users_sort(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {string} role
 * @param {string} ref_name
 * @returns {boolean}
 */
export function permission_can_merge(role, ref_name) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(role, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(ref_name, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        wasm.permission_can_merge(retptr, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 !== 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {string} role
 * @param {string} ref_name
 * @returns {boolean}
 */
export function permission_can_pull(role, ref_name) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(role, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(ref_name, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        wasm.permission_can_pull(retptr, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 !== 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {string} role
 * @param {string} ref_name
 * @returns {boolean}
 */
export function permission_can_push(role, ref_name) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(role, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(ref_name, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        wasm.permission_can_push(retptr, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 !== 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {string} role
 * @returns {boolean}
 */
export function permission_can_push_own_fork(role) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(role, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        wasm.permission_can_push_own_fork(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 !== 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Returns Vec<PermissionEntry> as JSON (`[{path, access}]`) — role-assignment-service.js's
 * resolveAcl() consumes this directly, replacing the role-drive-acl.json fetch.
 * @param {string} role
 * @param {string | null} [fork]
 * @returns {any}
 */
export function permission_resolve_grants(role, fork) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(role, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(fork) ? 0 : passStringToWasm0(fork, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        var len1 = WASM_VECTOR_LEN;
        wasm.permission_resolve_grants(retptr, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Minor-unit digit count for `currency` — DISPLAY only; storage keeps full precision.
 * @param {string} currency
 * @returns {number}
 */
export function pnl_currency_exponent(currency) {
    const ptr0 = passStringToWasm0(currency, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.pnl_currency_exponent(ptr0, len0);
    return ret >>> 0;
}

/**
 * Evict all cached entries (call after admin adds/deletes a rate).
 */
export function pnl_fx_cache_clear() {
    wasm.pnl_fx_cache_clear();
}

/**
 * `hit:false` — ask the repo. `hit:true, rate:null` — already asked this session and it was not
 * found; do not ask again.
 * @param {string} date_str
 * @param {string} pair
 * @param {string} direction
 * @returns {any}
 */
export function pnl_fx_cache_get(date_str, pair, direction) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(date_str, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(pair, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(direction, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len2 = WASM_VECTOR_LEN;
        wasm.pnl_fx_cache_get(retptr, ptr0, len0, ptr1, len1, ptr2, len2);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {string} date_str
 * @param {string} pair
 * @param {string} direction
 * @param {number | null} [rate]
 */
export function pnl_fx_cache_put(date_str, pair, direction, rate) {
    const ptr0 = passStringToWasm0(date_str, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(pair, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passStringToWasm0(direction, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len2 = WASM_VECTOR_LEN;
    wasm.pnl_fx_cache_put(ptr0, len0, ptr1, len1, ptr2, len2, !isLikeNone(rate), isLikeNone(rate) ? 0 : rate);
}

/**
 * `None` — VND self-pair, price at 1, no lookup needed. `Some(pair)` — fetch `<currency>/VND`.
 * @param {string} currency
 * @returns {string | undefined}
 */
export function pnl_fx_lookup_pair(currency) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(currency, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        wasm.pnl_fx_lookup_pair(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        let v2;
        if (r0 !== 0) {
            v2 = getStringFromWasm0(r0, r1).slice();
            wasm.__wbindgen_export5(r0, r1 * 1, 1);
        }
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Circular 200: every FX ask states which side (Buy|Sell) it wants — no default side. Reuses
 * the same parser admin FX-rate entry validates against (`js_bridge_dtos.rs`), so a caller fails
 * fast, synchronously, before doing any repo I/O.
 * @param {string} direction
 */
export function pnl_fx_require_direction(direction) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(direction, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        wasm.pnl_fx_require_direction(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        if (r1) {
            throw takeObject(r0);
        }
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * A line quoted in the workspace's book currency needs no conversion — locks fx_rate at 1.
 * Same `currency == book_currency` test `line_vnd` prices against (pnl_gate.rs); the input cell
 * and the money math read one fact, never two.
 * @param {string} currency
 * @param {string} book_currency
 * @returns {any}
 */
export function pnl_line_fx_lock(currency, book_currency) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(currency, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(book_currency, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        wasm.pnl_line_fx_lock(retptr, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Round a full-precision value to `currency`'s ISO 4217 exponent, for display only — never
 * writes back over the value it was derived from.
 * @param {number} value
 * @param {string} currency
 * @returns {number}
 */
export function pnl_round_for_display(value, currency) {
    const ptr0 = passStringToWasm0(currency, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.pnl_round_for_display(value, ptr0, len0);
    return ret;
}

/**
 * Called by `PricedRefRepo` before BOTH writes that can land a record in a ref —
 * the maintainer's direct save and an approved proposal. A guard on one of the two
 * is a guard on neither: the same row reaches the same ref either way.
 * @param {string} records_json
 * @param {string} candidate_json
 */
export function priced_ref_check_overlap(records_json, candidate_json) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(records_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(candidate_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        wasm.priced_ref_check_overlap(retptr, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        if (r1) {
            throw takeObject(r0);
        }
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * AC-05: `PricedRefRepo.resolveOnDate` calls this with every `PricedRecord`
 * body for the ref; a gap date returns the nearest-earlier row because Rust
 * says so, never a JS-computed guess.
 * @param {string} records_json
 * @param {string} key
 * @param {string} date_str
 * @returns {any}
 */
export function priced_ref_resolve_on_date(records_json, key, date_str) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(records_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(key, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(date_str, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len2 = WASM_VECTOR_LEN;
        wasm.priced_ref_resolve_on_date(retptr, ptr0, len0, ptr1, len1, ptr2, len2);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {Uint8Array} bytes
 * @returns {any}
 */
export function process_excel_file(bytes) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.process_excel_file(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * AC-02, AC-03, AC-04, AC-07: applies + closes on maintainer success; a
 * non-maintainer or stale-base attempt throws — the caller never sees a
 * `MergeResultDto` for a denied merge.
 * @param {string} proposal_json
 * @param {string} ref_state_json
 * @param {string} actor_role
 * @param {string} actor_user
 * @returns {any}
 */
export function proposal_merge(proposal_json, ref_state_json, actor_role, actor_user) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(proposal_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(ref_state_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(actor_role, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passStringToWasm0(actor_user, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len3 = WASM_VECTOR_LEN;
        wasm.proposal_merge(retptr, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * AC-01, AC-06, AC-07: propose returns a Pending ProposalDto to JS. Requires
 * only read access on `target_ref` — never maintainer rights.
 * @param {string} input_json
 * @param {string} author_role
 * @returns {any}
 */
export function proposal_propose(input_json, author_role) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(input_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(author_role, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        wasm.proposal_propose(retptr, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * R-3, AC-07: a maintainer may decline a Pending proposal without merging.
 * @param {string} proposal_json
 * @param {string} actor_role
 * @param {string} actor_user
 * @param {string} reason
 * @returns {any}
 */
export function proposal_reject(proposal_json, actor_role, actor_user, reason) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(proposal_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(actor_role, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(actor_user, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passStringToWasm0(reason, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len3 = WASM_VECTOR_LEN;
        wasm.proposal_reject(retptr, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Registers a shipment into the FSM state map — register-if-absent (AC-09
 * idempotency lives here, not in every JS caller). No-op if the entity
 * already has a stored state.
 * @param {string} entity_id
 * @param {string} state
 */
export function register_entity(entity_id, state) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(entity_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(state, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        wasm.register_entity(retptr, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        if (r1) {
            throw takeObject(r0);
        }
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Prepared write with text/null params — INSERT/UPDATE/DELETE that need bind params.
 * @param {string} sql
 * @param {string} params_json
 */
export function run(sql, params_json) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(sql, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(params_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        wasm.run(retptr, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        if (r1) {
            throw takeObject(r0);
        }
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Generic select export — kept for the one remaining ad-hoc caller path; returns a JSON array of
 * row objects. Business queries go through `sqlite_store`, not this.
 * @param {string} sql
 * @param {string} params_json
 * @returns {string}
 */
export function select(sql, params_json) {
    let deferred4_0;
    let deferred4_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(sql, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(params_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        wasm.select(retptr, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        var ptr3 = r0;
        var len3 = r1;
        if (r3) {
            ptr3 = 0; len3 = 0;
            throw takeObject(r2);
        }
        deferred4_0 = ptr3;
        deferred4_1 = len3;
        return getStringFromWasm0(ptr3, len3);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export5(deferred4_0, deferred4_1, 1);
    }
}

/**
 * E-40 — the owner's rule: "dữ liệu đủ thì đẩy qua". From the entity's stored state, keep
 * advancing while the NEXT hop has a non-empty requirement list and EVERY row is affirmatively
 * Met by the record (Unknown never advances — auto needs positive evidence; the manual button
 * keeps its permissive policy as the escape hatch). Returns the state the job ends at.
 * @param {string} entity_id
 * @param {string} shipment_json
 * @returns {any}
 */
export function shipment_auto_advance(entity_id, shipment_json) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(entity_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(shipment_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        wasm.shipment_auto_advance(retptr, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * The real kanban drag move. Builds the record's own registry/context (same shape as
 * `shipment_auto_advance`) so the real guards see real data, resolves the event off
 * `event_for_hop`, then runs it through `run_transition` — the one place a shipment's stored
 * state actually moves, persisting the state and appending the audit row.
 * @param {string} entity_id
 * @param {string} to_state
 * @param {string} shipment_json
 * @returns {any}
 */
export function shipment_move_to(entity_id, to_state, shipment_json) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(entity_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(to_state, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(shipment_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len2 = WASM_VECTOR_LEN;
        wasm.shipment_move_to(retptr, ptr0, len0, ptr1, len1, ptr2, len2);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * `{ current, off_path, phases: [{ state, position, requirements }] }`.
 *
 * The state comes from the FSM state map when the entity is registered, and from the record's own
 * `state` otherwise — a job whose boot registration has not run yet still has a real state, and
 * showing it at Created would be a lie the user cannot correct.
 * @param {string} entity_id
 * @param {string} shipment_json
 * @returns {string}
 */
export function shipment_phases(entity_id, shipment_json) {
    let deferred4_0;
    let deferred4_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(entity_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(shipment_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        wasm.shipment_phases(retptr, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        var ptr3 = r0;
        var len3 = r1;
        if (r3) {
            ptr3 = 0; len3 = 0;
            throw takeObject(r2);
        }
        deferred4_0 = ptr3;
        deferred4_1 = len3;
        return getStringFromWasm0(ptr3, len3);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export5(deferred4_0, deferred4_1, 1);
    }
}

/**
 * One-time init: install the OPFS sahpool VFS (as default), open the db, run the schema.
 * `scope` partitions the pool per account — an empty scope is refused rather than silently
 * falling back to a shared database. `has_lock_exclusivity` is the one fact only JS can supply:
 * did the Web Locks API grant this tab sole leadership of the sqlite engine? It decides how an
 * exhausted retry budget is classified (sahpool_lock_policy::next_sahpool_step) — never guessed
 * here from a raw browser error string.
 *
 * Returns which mode the store ended up in: "opfs" (normal), "memory-disabled" (OPFS turned off
 * for this context), or "memory-stale-self" (a dead context's handles never let go in time, but
 * Web Locks proved no LIVE tab is holding them — self-heals, no user action needed). A genuine
 * conflict (no exclusivity guarantee, budget exhausted) is the one case returned as an Err —
 * that is the only situation a "close the other tab" message would ever be true.
 * @param {string} scope
 * @param {boolean} use_opfs
 * @param {boolean} has_lock_exclusivity
 * @returns {Promise<string>}
 */
export function sqlite_init(scope, use_opfs, has_lock_exclusivity) {
    const ptr0 = passStringToWasm0(scope, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.sqlite_init(ptr0, len0, use_opfs, has_lock_exclusivity);
    return takeObject(ret);
}

/**
 * Explicit lifecycle release — called from JS on `pagehide`, right before this document's worker
 * is torn down, so the SAH handles are closed synchronously instead of left for the browser's own
 * (slow, unpredictable) worker-teardown GC. That gap was the actual defect: the next document's
 * install had nothing to wait on but GC, and GC does not run on the boot budget's clock. Safe to
 * call more than once (both steps are no-ops once already released).
 */
export function sqlite_release() {
    wasm.sqlite_release();
}

/**
 * @returns {any}
 */
export function store_count_entities() {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.store_count_entities(retptr);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {string} kind
 * @param {string} id
 */
export function store_delete(kind, id) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        wasm.store_delete(retptr, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        if (r1) {
            throw takeObject(r0);
        }
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {string} key
 */
export function store_delete_meta(key) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(key, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        wasm.store_delete_meta(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        if (r1) {
            throw takeObject(r0);
        }
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {string} kind
 * @param {string} id
 * @returns {any}
 */
export function store_get(kind, id) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        wasm.store_get(retptr, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {string} key
 * @returns {any}
 */
export function store_get_meta(key) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(key, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        wasm.store_get_meta(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {string} key
 * @returns {any}
 */
export function store_get_wma(key) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(key, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        wasm.store_get_wma(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {string} kind
 * @returns {any}
 */
export function store_list(kind) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        wasm.store_list(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @returns {any}
 */
export function store_list_notifications() {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.store_list_notifications(retptr);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {string} kind
 * @param {string} id
 * @param {any} body
 */
export function store_put(kind, id, body) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        wasm.store_put(retptr, ptr0, len0, ptr1, len1, addHeapObject(body));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        if (r1) {
            throw takeObject(r0);
        }
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {string} key
 * @param {any} body
 */
export function store_put_meta(key, body) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(key, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        wasm.store_put_meta(retptr, ptr0, len0, addHeapObject(body));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        if (r1) {
            throw takeObject(r0);
        }
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} notif
 */
export function store_put_notification(notif) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.store_put_notification(retptr, addHeapObject(notif));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        if (r1) {
            throw takeObject(r0);
        }
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {string} key
 * @param {any} body
 */
export function store_put_wma(key, body) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(key, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        wasm.store_put_wma(retptr, ptr0, len0, addHeapObject(body));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        if (r1) {
            throw takeObject(r0);
        }
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function sync_audit_append(req) {
    const ret = wasm.sync_audit_append(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function sync_audit_read(req) {
    const ret = wasm.sync_audit_read(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function sync_audit_verify_chain(req) {
    const ret = wasm.sync_audit_verify_chain(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {any}
 */
export function sync_delta_tick_plan(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.sync_delta_tick_plan(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function sync_drain_plan(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.sync_drain_plan(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function sync_due_soon_check(req) {
    const ret = wasm.sync_due_soon_check(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function sync_due_soon_mark(req) {
    const ret = wasm.sync_due_soon_mark(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function sync_due_soon_rows(req) {
    const ret = wasm.sync_due_soon_rows(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function sync_error_capture(req) {
    const ret = wasm.sync_error_capture(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {any}
 */
export function sync_job_event(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.sync_job_event(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function sync_quota_check(req) {
    const ret = wasm.sync_quota_check(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function sync_user_audit_read(req) {
    const ret = wasm.sync_user_audit_read(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function sync_user_audit_write(req) {
    const ret = wasm.sync_user_audit_write(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {any}
 */
export function sync_wma_dismiss(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.sync_wma_dismiss(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function sync_wma_load(req) {
    const ret = wasm.sync_wma_load(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {any} req
 * @returns {any}
 */
export function sync_wma_on_event(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.sync_wma_on_event(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {any}
 */
export function sync_wma_predict(req) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.sync_wma_predict(retptr, addHeapObject(req));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {any} req
 * @returns {Promise<any>}
 */
export function sync_wma_save(req) {
    const ret = wasm.sync_wma_save(addHeapObject(req));
    return takeObject(ret);
}

/**
 * @param {string} code
 * @returns {boolean}
 */
export function validate_airline_iata(code) {
    const ptr0 = passStringToWasm0(code, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.validate_airline_iata(ptr0, len0);
    return ret !== 0;
}

/**
 * @param {string} code
 * @returns {boolean}
 */
export function validate_airline_icao(code) {
    const ptr0 = passStringToWasm0(code, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.validate_airline_icao(ptr0, len0);
    return ret !== 0;
}

/**
 * @param {string} code
 * @returns {boolean}
 */
export function validate_airport_iata(code) {
    const ptr0 = passStringToWasm0(code, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.validate_airport_iata(ptr0, len0);
    return ret !== 0;
}

/**
 * @param {string} code
 * @returns {boolean}
 */
export function validate_airport_icao(code) {
    const ptr0 = passStringToWasm0(code, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.validate_airport_icao(ptr0, len0);
    return ret !== 0;
}

/**
 * @param {string} s
 * @returns {boolean}
 */
export function validate_awb_no(s) {
    const ptr0 = passStringToWasm0(s, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.validate_awb_no(ptr0, len0);
    return ret !== 0;
}

/**
 * `valid_from`/`valid_to` are ISO 'YYYY-MM-DD'. Same invariant `PricedRecord::new` and
 * `FxRateEntry::new` already carry: a validity window can't end before it starts.
 * @param {string} valid_from
 * @param {string} valid_to
 * @returns {boolean}
 */
export function validate_date_range(valid_from, valid_to) {
    const ptr0 = passStringToWasm0(valid_from, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(valid_to, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.validate_date_range(ptr0, len0, ptr1, len1);
    return ret !== 0;
}

/**
 * @param {string} no
 * @returns {boolean}
 */
export function validate_flight_no(no) {
    const ptr0 = passStringToWasm0(no, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.validate_flight_no(ptr0, len0);
    return ret !== 0;
}

/**
 * @param {string} class_str
 * @returns {boolean}
 */
export function validate_iata_dgr_class(class_str) {
    const ptr0 = passStringToWasm0(class_str, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.validate_iata_dgr_class(ptr0, len0);
    return ret !== 0;
}

/**
 * @param {string} code
 * @returns {boolean}
 */
export function validate_scac(code) {
    const ptr0 = passStringToWasm0(code, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.validate_scac(ptr0, len0);
    return ret !== 0;
}

/**
 * @param {string} request_json
 * @returns {any}
 */
export function validate_shipment_gate(request_json) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(request_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        wasm.validate_shipment_gate(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return takeObject(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {string} code
 * @returns {boolean}
 */
export function validate_uld_type_code(code) {
    const ptr0 = passStringToWasm0(code, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.validate_uld_type_code(ptr0, len0);
    return ret !== 0;
}

/**
 * Container units validate as ISO 6346 size-type codes, every other category as UN/ECE
 * Recommendation 20 — see rulesets::validators::uom for the shape each takes.
 * @param {string} category
 * @param {string} code
 * @returns {boolean}
 */
export function validate_uom_code(category, code) {
    const ptr0 = passStringToWasm0(category, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(code, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.validate_uom_code(ptr0, len0, ptr1, len1);
    return ret !== 0;
}

/**
 * @param {string} label
 * @returns {boolean}
 */
export function validate_uom_label(label) {
    const ptr0 = passStringToWasm0(label, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.validate_uom_label(ptr0, len0);
    return ret !== 0;
}

/**
 * @returns {string}
 */
export function vdg_version() {
    let deferred1_0;
    let deferred1_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.vdg_version(retptr);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        deferred1_0 = r0;
        deferred1_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export5(deferred1_0, deferred1_1, 1);
    }
}

/**
 * @param {string} license_str
 * @param {bigint} current_unix_ts
 * @returns {any}
 */
export function verify_license(license_str, current_unix_ts) {
    const ptr0 = passStringToWasm0(license_str, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.verify_license(ptr0, len0, current_unix_ts);
    return takeObject(ret);
}

/**
 * Empty strings for "absent" -- JS passes `draft.currency || ''` and the config value or ''.
 * @param {string} saved
 * @param {string} configured_default
 * @returns {string}
 */
export function workspace_header_currency(saved, configured_default) {
    let deferred3_0;
    let deferred3_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(saved, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(configured_default, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        wasm.workspace_header_currency(retptr, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        deferred3_0 = r0;
        deferred3_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export5(deferred3_0, deferred3_1, 1);
    }
}

/**
 * The codes the default-currency picker may offer, as JSON -- one source for the Rust rule and
 * the select that renders it.
 * @returns {string}
 */
export function workspace_selectable_currencies() {
    let deferred1_0;
    let deferred1_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.workspace_selectable_currencies(retptr);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        deferred1_0 = r0;
        deferred1_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export5(deferred1_0, deferred1_1, 1);
    }
}
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg_Error_fdd633d4bb5dd76a: function(arg0, arg1) {
            const ret = Error(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        },
        __wbg_Number_c4bdf66bb78f7977: function(arg0) {
            const ret = Number(getObject(arg0));
            return ret;
        },
        __wbg_String_8564e559799eccda: function(arg0, arg1) {
            const ret = String(getObject(arg1));
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_bigint_get_as_i64_d9e915702856f831: function(arg0, arg1) {
            const v = getObject(arg1);
            const ret = typeof(v) === 'bigint' ? v : undefined;
            getDataViewMemory0().setBigInt64(arg0 + 8 * 1, isLikeNone(ret) ? BigInt(0) : ret, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
        },
        __wbg___wbindgen_boolean_get_edaed31a367ce1bd: function(arg0) {
            const v = getObject(arg0);
            const ret = typeof(v) === 'boolean' ? v : undefined;
            return isLikeNone(ret) ? 0xFFFFFF : ret ? 1 : 0;
        },
        __wbg___wbindgen_debug_string_8a447059637473e2: function(arg0, arg1) {
            const ret = debugString(getObject(arg1));
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_in_4990f46af709e33c: function(arg0, arg1) {
            const ret = getObject(arg0) in getObject(arg1);
            return ret;
        },
        __wbg___wbindgen_is_bigint_90b5ccfe67c78460: function(arg0) {
            const ret = typeof(getObject(arg0)) === 'bigint';
            return ret;
        },
        __wbg___wbindgen_is_function_acc5528be2b923f2: function(arg0) {
            const ret = typeof(getObject(arg0)) === 'function';
            return ret;
        },
        __wbg___wbindgen_is_null_6d937fbfb6478470: function(arg0) {
            const ret = getObject(arg0) === null;
            return ret;
        },
        __wbg___wbindgen_is_object_0beba4a1980d3eea: function(arg0) {
            const val = getObject(arg0);
            const ret = typeof(val) === 'object' && val !== null;
            return ret;
        },
        __wbg___wbindgen_is_string_1fca8072260dd261: function(arg0) {
            const ret = typeof(getObject(arg0)) === 'string';
            return ret;
        },
        __wbg___wbindgen_is_undefined_721f8decd50c87a3: function(arg0) {
            const ret = getObject(arg0) === undefined;
            return ret;
        },
        __wbg___wbindgen_jsval_eq_4e8c38722cb8ff51: function(arg0, arg1) {
            const ret = getObject(arg0) === getObject(arg1);
            return ret;
        },
        __wbg___wbindgen_jsval_loose_eq_4b9aba9e5b3c4582: function(arg0, arg1) {
            const ret = getObject(arg0) == getObject(arg1);
            return ret;
        },
        __wbg___wbindgen_number_get_1cc01dd708740256: function(arg0, arg1) {
            const obj = getObject(arg1);
            const ret = typeof(obj) === 'number' ? obj : undefined;
            getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
        },
        __wbg___wbindgen_string_get_71bb4348194e31f0: function(arg0, arg1) {
            const obj = getObject(arg1);
            const ret = typeof(obj) === 'string' ? obj : undefined;
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_throw_ea4887a5f8f9a9db: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg__wbg_cb_unref_33c39e13d73b25f6: function(arg0) {
            getObject(arg0)._wbg_cb_unref();
        },
        __wbg_access_token_853b48c796fe0b73: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).access_token();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_auth_active_workspace_name_f4a25aacf8bf385c: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).auth_active_workspace_name();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_auth_cache_clear_cb795c3f1db49562: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).auth_cache_clear();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_auth_cache_read_a682660fb6ab7cde: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).auth_cache_read();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_auth_cache_write_f961ddebbecaa6d7: function() { return handleError(function (arg0, arg1) {
            const ret = getObject(arg0).auth_cache_write(getObject(arg1));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_auth_current_user_45fa951ab17be407: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).auth_current_user();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_auth_has_cached_workspace_e39e703e4652f9c8: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).auth_has_cached_workspace();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_auth_probe_role_8bb6db694fe1c219: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = getObject(arg0).auth_probe_role(getObject(arg1), getStringFromWasm0(arg2, arg3));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_auth_publish_roles_963b7f6bc58d5f60: function(arg0, arg1, arg2) {
            getObject(arg0).auth_publish_roles(getObject(arg1), arg2 !== 0);
        },
        __wbg_auth_remember_grant_areas_f1e2f297ff15408b: function() { return handleError(function (arg0, arg1) {
            const ret = getObject(arg0).auth_remember_grant_areas(getObject(arg1));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_auth_revive_session_e75a4cf764417641: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).auth_revive_session();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_auth_set_store_scope_054f29607e9eb0b5: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = getObject(arg0).auth_set_store_scope(getStringFromWasm0(arg1, arg2));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_auth_sign_out_ed4a8140e8ce79da: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).auth_sign_out();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_auth_was_previously_signed_in_33baa9302e0cdbc1: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).auth_was_previously_signed_in();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_buffer_9e4d98d0766fb908: function(arg0) {
            const ret = getObject(arg0).buffer;
            return addHeapObject(ret);
        },
        __wbg_byteLength_564c2b9b251b8b6c: function(arg0) {
            const ret = getObject(arg0).byteLength;
            return ret;
        },
        __wbg_byteOffset_10f01f7956bb8fe3: function(arg0) {
            const ret = getObject(arg0).byteOffset;
            return ret;
        },
        __wbg_cache_delete_c1ecabc8469aff44: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            const ret = getObject(arg0).cache_delete(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_cache_delete_file_67483899c6292140: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = getObject(arg0).cache_delete_file(getStringFromWasm0(arg1, arg2));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_cache_get_40420377abc22ab0: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            const ret = getObject(arg0).cache_get(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_cache_get_a96c67070f53fd10: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            const ret = getObject(arg0).cache_get(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_cache_get_file_623d2b765eac45aa: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = getObject(arg0).cache_get_file(getStringFromWasm0(arg1, arg2));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_cache_get_meta_d23ed4155d047642: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = getObject(arg0).cache_get_meta(getStringFromWasm0(arg1, arg2));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_cache_list_8f4f7f63c819568c: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = getObject(arg0).cache_list(getStringFromWasm0(arg1, arg2));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_cache_list_dc10d3a5a4628603: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = getObject(arg0).cache_list(getStringFromWasm0(arg1, arg2));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_cache_local_date_0303bf79c66d5ed7: function(arg0, arg1, arg2) {
            const ret = getObject(arg1).cache_local_date(arg2);
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_cache_meta_get_5a2a67ba1e5f6205: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = getObject(arg0).cache_meta_get(getStringFromWasm0(arg1, arg2));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_cache_meta_put_1aa65d37d7844c2b: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = getObject(arg0).cache_meta_put(getStringFromWasm0(arg1, arg2), getObject(arg3));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_cache_move_file_d055c77f4fe425ff: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
            const ret = getObject(arg0).cache_move_file(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4), getStringFromWasm0(arg5, arg6));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_cache_priced_envelope_f858348148dec3ab: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = getObject(arg0).cache_priced_envelope(getStringFromWasm0(arg1, arg2), getObject(arg3));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_cache_priced_seed_da1702fa7049bbdd: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = getObject(arg0).cache_priced_seed(getStringFromWasm0(arg1, arg2), getObject(arg3));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_cache_put_4e66ca3ad9eb72e3: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
            const ret = getObject(arg0).cache_put(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4), getObject(arg5));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_cache_put_98c4a005f3a2c358: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
            const ret = getObject(arg0).cache_put(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4), getObject(arg5));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_cache_put_meta_2abeea6b8d469362: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = getObject(arg0).cache_put_meta(getStringFromWasm0(arg1, arg2), getObject(arg3));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_cache_replay_shipment_579f21cff4ab511a: function() { return handleError(function (arg0, arg1) {
            const ret = getObject(arg0).cache_replay_shipment(getObject(arg1));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_cache_trash_file_8bfb5415f2e18284: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            const ret = getObject(arg0).cache_trash_file(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_cache_ws_list_dir_ea6ffcd969d56fa2: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = getObject(arg0).cache_ws_list_dir(getStringFromWasm0(arg1, arg2));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_cache_ws_read_file_4e2f25c6e4c9a287: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            const ret = getObject(arg0).cache_ws_read_file(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_cache_ws_write_file_e6ae7b07d54c9efe: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) {
            const ret = getObject(arg0).cache_ws_write_file(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4), getStringFromWasm0(arg5, arg6), getStringFromWasm0(arg7, arg8));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_call_5575218572ead796: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_call_8e98ed2f3c86c4b5: function() { return handleError(function (arg0, arg1) {
            const ret = getObject(arg0).call(getObject(arg1));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_changes_cursor_faf3789ea9f54d50: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).changes_cursor();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_changes_feed_ee2b3aecf21a223d: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            const ret = getObject(arg0).changes_feed(getStringFromWasm0(arg1, arg2), arg3 >>> 0, arg4 !== 0);
            return addHeapObject(ret);
        }, arguments); },
        __wbg_close_f31f62011898d46a: function(arg0) {
            getObject(arg0).close();
        },
        __wbg_createSyncAccessHandle_8bf4ff1590798ef5: function(arg0) {
            const ret = getObject(arg0).createSyncAccessHandle();
            return addHeapObject(ret);
        },
        __wbg_current_user_email_cbefabf2e4cd0b14: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).current_user_email();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_data_audit_append_8e95737c1f846179: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10) {
            const ret = getObject(arg0).data_audit_append(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4), getStringFromWasm0(arg5, arg6), getStringFromWasm0(arg7, arg8), getObject(arg9), getObject(arg10));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_data_clear_fork_scan_35c73bfeac566b09: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = getObject(arg0).data_clear_fork_scan(getStringFromWasm0(arg1, arg2));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_data_fork_read_jsonl_5fb05c690fda19c7: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = getObject(arg0).data_fork_read_jsonl(getStringFromWasm0(arg1, arg2), arg3 >>> 0);
            return addHeapObject(ret);
        }, arguments); },
        __wbg_data_io_user_email_bfea09f623e55ecd: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).data_io_user_email();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_data_license_status_be266c5e2429feac: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).data_license_status();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_declare_collection_3e388336a91c76d2: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
            const ret = getObject(arg0).declare_collection(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4), getStringFromWasm0(arg5, arg6));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_dispatch_event_626866c332c0f71f: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = getObject(arg0).dispatch_event(getStringFromWasm0(arg1, arg2), getObject(arg3));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_done_b62d4a7d2286852a: function(arg0) {
            const ret = getObject(arg0).done;
            return ret;
        },
        __wbg_entries_c261c3fa1f281256: function(arg0) {
            const ret = Object.entries(getObject(arg0));
            return addHeapObject(ret);
        },
        __wbg_entries_f3e05c7e3ac1204f: function(arg0) {
            const ret = getObject(arg0).entries();
            return addHeapObject(ret);
        },
        __wbg_events_emit_e0f9f61883af33e4: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = getObject(arg0).events_emit(getStringFromWasm0(arg1, arg2), getObject(arg3));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_fill_36d0880093490529: function(arg0, arg1, arg2, arg3) {
            const ret = getObject(arg0).fill(arg1, arg2 >>> 0, arg3 >>> 0);
            return addHeapObject(ret);
        },
        __wbg_flows_active_workspace_c5a7931795024a4b: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).flows_active_workspace();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_flows_cas_upload_a2233d1e46b5dda9: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) {
            const ret = getObject(arg0).flows_cas_upload(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4), getStringFromWasm0(arg5, arg6), getStringFromWasm0(arg7, arg8));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_flows_fetch_text_48be80bf4fc21cd6: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = getObject(arg0).flows_fetch_text(getStringFromWasm0(arg1, arg2));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_flows_fsm_auto_advance_dee2881289d79551: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = getObject(arg0).flows_fsm_auto_advance(getStringFromWasm0(arg1, arg2), getObject(arg3));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_flows_fsm_register_d5061ccca76840f3: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            const ret = getObject(arg0).flows_fsm_register(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_flows_get_or_create_file_8c6f7cc1d8ee518a: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
            const ret = getObject(arg0).flows_get_or_create_file(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4), getStringFromWasm0(arg5, arg6));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_flows_ledger_call_4c534afd8038ac51: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = getObject(arg0).flows_ledger_call(getStringFromWasm0(arg1, arg2), getObject(arg3));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_flows_license_arm_fcda22ac6abea857: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = getObject(arg0).flows_license_arm(getStringFromWasm0(arg1, arg2), arg3);
            return addHeapObject(ret);
        }, arguments); },
        __wbg_flows_mint_quote_ref_c5668125907f06c8: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = getObject(arg0).flows_mint_quote_ref(getStringFromWasm0(arg1, arg2));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_flows_shipments_call_bdfd28127445aece: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = getObject(arg0).flows_shipments_call(getStringFromWasm0(arg1, arg2), getObject(arg3));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_flows_today_local_5fb8fdaa85c7054d: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).flows_today_local();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_flows_zip_download_2ae43cb6f7f93006: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = getObject(arg0).flows_zip_download(getStringFromWasm0(arg1, arg2), getObject(arg3));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_flush_93543a40f3947793: function() { return handleError(function (arg0) {
            getObject(arg0).flush();
        }, arguments); },
        __wbg_getDate_795f99292eeb17f7: function(arg0) {
            const ret = getObject(arg0).getDate();
            return ret;
        },
        __wbg_getDay_093e6d9a69f591a6: function(arg0) {
            const ret = getObject(arg0).getDay();
            return ret;
        },
        __wbg_getDirectoryHandle_3421786cbf779e54: function(arg0, arg1, arg2, arg3) {
            const ret = getObject(arg0).getDirectoryHandle(getStringFromWasm0(arg1, arg2), getObject(arg3));
            return addHeapObject(ret);
        },
        __wbg_getDirectory_d73e4f2473279f77: function(arg0) {
            const ret = getObject(arg0).getDirectory();
            return addHeapObject(ret);
        },
        __wbg_getFileHandle_fdf8a7ba5211ee45: function(arg0, arg1, arg2, arg3) {
            const ret = getObject(arg0).getFileHandle(getStringFromWasm0(arg1, arg2), getObject(arg3));
            return addHeapObject(ret);
        },
        __wbg_getFullYear_466c1afffb9c36de: function(arg0) {
            const ret = getObject(arg0).getFullYear();
            return ret;
        },
        __wbg_getHours_0235f4d9164c7ccf: function(arg0) {
            const ret = getObject(arg0).getHours();
            return ret;
        },
        __wbg_getItem_f2b45bf1b0166c48: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = getObject(arg1).getItem(getStringFromWasm0(arg2, arg3));
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        }, arguments); },
        __wbg_getMinutes_1a0d1599d12a8527: function(arg0) {
            const ret = getObject(arg0).getMinutes();
            return ret;
        },
        __wbg_getMonth_66646d569c4d60f1: function(arg0) {
            const ret = getObject(arg0).getMonth();
            return ret;
        },
        __wbg_getRandomValues_15134f5c0ae6b0d0: function() { return handleError(function (arg0, arg1) {
            globalThis.crypto.getRandomValues(getArrayU8FromWasm0(arg0, arg1));
        }, arguments); },
        __wbg_getSeconds_1ba1e4708a2a825f: function(arg0) {
            const ret = getObject(arg0).getSeconds();
            return ret;
        },
        __wbg_getSize_a9e40ff0a914f5ef: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).getSize();
            return ret;
        }, arguments); },
        __wbg_getTime_7a770f8a2ec8d634: function(arg0) {
            const ret = getObject(arg0).getTime();
            return ret;
        },
        __wbg_getTimezoneOffset_d6fba5332f80c3da: function(arg0) {
            const ret = getObject(arg0).getTimezoneOffset();
            return ret;
        },
        __wbg_getUint32_c93a6b1dbf1a75c0: function(arg0, arg1) {
            const ret = getObject(arg0).getUint32(arg1 >>> 0);
            return ret;
        },
        __wbg_get_197a3fe98f169e38: function(arg0, arg1) {
            const ret = getObject(arg0)[arg1 >>> 0];
            return addHeapObject(ret);
        },
        __wbg_get_9a29be2cb383ed9a: function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.get(getObject(arg0), getObject(arg1));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_get_dddb90ff5d27a080: function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.get(getObject(arg0), getObject(arg1));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_get_index_6d90f257303a055d: function(arg0, arg1) {
            const ret = getObject(arg0)[arg1 >>> 0];
            return ret;
        },
        __wbg_get_unchecked_54a4374c38e08460: function(arg0, arg1) {
            const ret = getObject(arg0)[arg1 >>> 0];
            return addHeapObject(ret);
        },
        __wbg_get_with_ref_key_6412cf3094599694: function(arg0, arg1) {
            const ret = getObject(arg0)[getObject(arg1)];
            return addHeapObject(ret);
        },
        __wbg_governance_audit_append_ae50c1a911a50986: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
            const ret = getObject(arg0).governance_audit_append(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4), getStringFromWasm0(arg5, arg6), getObject(arg7));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_governance_fx_closing_rate_0d121d5b5b72d9e8: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
            const ret = getObject(arg0).governance_fx_closing_rate(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4), getStringFromWasm0(arg5, arg6));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_governance_ledger_accounts_c2727fa3b41e6999: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).governance_ledger_accounts();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_governance_ledger_balance_f88d82d8af9bfe67: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            const ret = getObject(arg0).governance_ledger_balance(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_governance_user_audit_write_3f4a6f97dd603166: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
            const ret = getObject(arg0).governance_user_audit_write(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4), getObject(arg5), getObject(arg6), getObject(arg7));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_governance_users_get_1c72dc9a59d23d8c: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = getObject(arg0).governance_users_get(getStringFromWasm0(arg1, arg2));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_governance_users_list_ed5d05120bf32401: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).governance_users_list();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_governance_users_list_raw_c02f0ea94ee270d1: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).governance_users_list_raw();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_governance_users_remove_5a48b40721966b82: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = getObject(arg0).governance_users_remove(getStringFromWasm0(arg1, arg2));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_governance_users_upsert_a5e42fc96a8e425c: function() { return handleError(function (arg0, arg1) {
            const ret = getObject(arg0).governance_users_upsert(getObject(arg1));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_governance_workspace_name_798bd0d4d23bad68: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).governance_workspace_name();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_governance_workspace_try_2f9e8d1d6ea5e6a5: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = getObject(arg0).governance_workspace_try(getStringFromWasm0(arg1, arg2), getObject(arg3));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_instanceof_ArrayBuffer_2a7bb09fee70c2da: function(arg0) {
            let result;
            try {
                result = getObject(arg0) instanceof ArrayBuffer;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Error_77d0cf0b4f31a32f: function(arg0) {
            let result;
            try {
                result = getObject(arg0) instanceof Error;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Map_afa18d5840c04c15: function(arg0) {
            let result;
            try {
                result = getObject(arg0) instanceof Map;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Uint8Array_f080092dc70f5d58: function(arg0) {
            let result;
            try {
                result = getObject(arg0) instanceof Uint8Array;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Window_0d356b88a2f77c42: function(arg0) {
            let result;
            try {
                result = getObject(arg0) instanceof Window;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_WorkerGlobalScope_69b4a1d5d7957e7e: function(arg0) {
            let result;
            try {
                result = getObject(arg0) instanceof WorkerGlobalScope;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_isArray_145a34fd0a38d37b: function(arg0) {
            const ret = Array.isArray(getObject(arg0));
            return ret;
        },
        __wbg_isSafeInteger_a3389a198582f5f6: function(arg0) {
            const ret = Number.isSafeInteger(getObject(arg0));
            return ret;
        },
        __wbg_iterator_cc47ba25a2be735a: function() {
            const ret = Symbol.iterator;
            return addHeapObject(ret);
        },
        __wbg_ledger_append_leg_28757e84035d45f5: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            const ret = getObject(arg0).ledger_append_leg(arg1 >>> 0, getStringFromWasm0(arg2, arg3), getObject(arg4));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_ledger_append_reconciliation_7dce560e0433b354: function() { return handleError(function (arg0, arg1) {
            const ret = getObject(arg0).ledger_append_reconciliation(getObject(arg1));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_ledger_append_repost_d05a2088a31df1b8: function() { return handleError(function (arg0, arg1) {
            const ret = getObject(arg0).ledger_append_repost(getObject(arg1));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_ledger_chart_of_accounts_549b6e53895511c9: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).ledger_chart_of_accounts();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_ledger_existing_account_codes_c18f32ba6c0d2e57: function() { return handleError(function (arg0, arg1) {
            const ret = getObject(arg0).ledger_existing_account_codes(arg1);
            return addHeapObject(ret);
        }, arguments); },
        __wbg_ledger_get_chart_86a65ea15e5d46f3: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).ledger_get_chart();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_ledger_get_rules_f0bd237734925936: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).ledger_get_rules();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_ledger_is_posted_e91941a1d2ee5834: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = getObject(arg0).ledger_is_posted(getStringFromWasm0(arg1, arg2));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_ledger_last_reconciliation_20e38863a0528bf5: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).ledger_last_reconciliation();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_ledger_list_legs_7acdb789822bac4b: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = getObject(arg0).ledger_list_legs(arg1, getStringFromWasm0(arg2, arg3));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_ledger_posting_rules_202a6bde57377d63: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).ledger_posting_rules();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_ledger_record_posted_7ff85b1855891863: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = getObject(arg0).ledger_record_posted(getStringFromWasm0(arg1, arg2), getObject(arg3));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_ledger_remove_entry_d3e365ea38c16fde: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = getObject(arg0).ledger_remove_entry(arg1, getStringFromWasm0(arg2, arg3));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_ledger_replace_leg_6b6810e27a02e0f8: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            const ret = getObject(arg0).ledger_replace_leg(arg1, getStringFromWasm0(arg2, arg3), getObject(arg4));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_length_589238bdcf171f0e: function(arg0) {
            const ret = getObject(arg0).length;
            return ret;
        },
        __wbg_length_c6054974c0a6cdb9: function(arg0) {
            const ret = getObject(arg0).length;
            return ret;
        },
        __wbg_localStorage_8daa25c913870d2f: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).localStorage;
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        }, arguments); },
        __wbg_log_2bad958e3e6bdc9a: function(arg0, arg1, arg2, arg3, arg4) {
            getObject(arg0).log(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
        },
        __wbg_log_6b5af08dd293697f: function(arg0) {
            console.log(getObject(arg0));
        },
        __wbg_log_f980fa951d3ab433: function(arg0, arg1) {
            console.log(getStringFromWasm0(arg0, arg1));
        },
        __wbg_message_6fc0a1f59fcc247b: function(arg0) {
            const ret = getObject(arg0).message;
            return addHeapObject(ret);
        },
        __wbg_navigator_017bc45e84c473cc: function(arg0) {
            const ret = getObject(arg0).navigator;
            return addHeapObject(ret);
        },
        __wbg_new_0_1b32bedde98fef4b: function() {
            const ret = new Date();
            return addHeapObject(ret);
        },
        __wbg_new_2e117a478906f062: function() {
            const ret = new Object();
            return addHeapObject(ret);
        },
        __wbg_new_3444eb7412549f0b: function() {
            const ret = new Map();
            return addHeapObject(ret);
        },
        __wbg_new_36e147a8ced3c6e0: function() {
            const ret = new Array();
            return addHeapObject(ret);
        },
        __wbg_new_47ab770c8bd3b6bb: function(arg0) {
            const ret = new Date(getObject(arg0));
            return addHeapObject(ret);
        },
        __wbg_new_81880fb5002cb255: function(arg0) {
            const ret = new Uint8Array(getObject(arg0));
            return addHeapObject(ret);
        },
        __wbg_new_87e114d9dfc43976: function(arg0, arg1, arg2) {
            const ret = new DataView(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
            return addHeapObject(ret);
        },
        __wbg_new_e66a4b7758dd2e5c: function(arg0, arg1) {
            const ret = new Error(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        },
        __wbg_new_f85beb941dc6d8aa: function(arg0, arg1) {
            try {
                var state0 = {a: arg0, b: arg1};
                var cb0 = (arg0, arg1) => {
                    const a = state0.a;
                    state0.a = 0;
                    try {
                        return __wasm_bindgen_func_elem_13979(a, state0.b, arg0, arg1);
                    } finally {
                        state0.a = a;
                    }
                };
                const ret = new Promise(cb0);
                return addHeapObject(ret);
            } finally {
                state0.a = 0;
            }
        },
        __wbg_new_typed_00a409eb4ec4f2d9: function(arg0, arg1) {
            try {
                var state0 = {a: arg0, b: arg1};
                var cb0 = (arg0, arg1) => {
                    const a = state0.a;
                    state0.a = 0;
                    try {
                        return __wasm_bindgen_func_elem_13979(a, state0.b, arg0, arg1);
                    } finally {
                        state0.a = a;
                    }
                };
                const ret = new Promise(cb0);
                return addHeapObject(ret);
            } finally {
                state0.a = 0;
            }
        },
        __wbg_new_with_length_9b650f44b5c44a4e: function(arg0) {
            const ret = new Uint8Array(arg0 >>> 0);
            return addHeapObject(ret);
        },
        __wbg_new_with_year_month_day_049bce54051eccea: function(arg0, arg1, arg2) {
            const ret = new Date(arg0 >>> 0, arg1, arg2);
            return addHeapObject(ret);
        },
        __wbg_next_0c4066e251d2eff9: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).next();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_next_402fa10b59ab20c3: function(arg0) {
            const ret = getObject(arg0).next;
            return addHeapObject(ret);
        },
        __wbg_next_e8d68f27c98c4764: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).next();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_now_d2e0afbad4edbe82: function() {
            const ret = Date.now();
            return ret;
        },
        __wbg_now_ms_1546b1d55f6f5606: function(arg0) {
            const ret = getObject(arg0).now_ms();
            return ret;
        },
        __wbg_parse_1f9d3f9cbc8a7da2: function() { return handleError(function (arg0, arg1) {
            const ret = JSON.parse(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_prefs_get_9a42a4a3ab6c7f4a: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = getObject(arg0).prefs_get(getStringFromWasm0(arg1, arg2));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_prefs_set_7178d4cd82b8d519: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = getObject(arg0).prefs_set(getStringFromWasm0(arg1, arg2), getObject(arg3));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_prototypesetcall_d721637c7ca66eb8: function(arg0, arg1, arg2) {
            Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), getObject(arg2));
        },
        __wbg_queueMicrotask_1c9b3800e321a967: function(arg0) {
            const ret = getObject(arg0).queueMicrotask;
            return addHeapObject(ret);
        },
        __wbg_queueMicrotask_311744e534a929a3: function(arg0) {
            queueMicrotask(getObject(arg0));
        },
        __wbg_random_3182549db57fb083: function() {
            const ret = Math.random();
            return ret;
        },
        __wbg_read_56f01ecc43fc9ea2: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = getObject(arg0).read(getArrayU8FromWasm0(arg1, arg2), getObject(arg3));
            return ret;
        }, arguments); },
        __wbg_read_f2e79e0536838fe2: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = getObject(arg0).read(getObject(arg1), getObject(arg2));
            return ret;
        }, arguments); },
        __wbg_record_list_1d90fe58c39f92a1: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
            const ret = getObject(arg0).record_list(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4), getStringFromWasm0(arg5, arg6), arg7 >>> 0, getStringFromWasm0(arg8, arg9));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_records_awb_list_all_607357b856c6baf4: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).records_awb_list_all();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_records_delete_e2305069c34a4919: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            const ret = getObject(arg0).records_delete(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_records_fx_list_all_068cb5f23fcd566f: function() { return handleError(function (arg0) {
            const ret = getObject(arg0).records_fx_list_all();
            return addHeapObject(ret);
        }, arguments); },
        __wbg_records_get_1929bd2b7a4bf635: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            const ret = getObject(arg0).records_get(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_records_get_meta_12f81a1fcab9b0d1: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = getObject(arg0).records_get_meta(getStringFromWasm0(arg1, arg2));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_records_invalidate_period_cache_2a2e904887691282: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            const ret = getObject(arg0).records_invalidate_period_cache(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_records_list_3a640add669f8553: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = getObject(arg0).records_list(getStringFromWasm0(arg1, arg2));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_records_put_42eb60463d4a784a: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
            const ret = getObject(arg0).records_put(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4), getObject(arg5));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_records_put_labeled_6f8c054a1e7a58a6: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
            const ret = getObject(arg0).records_put_labeled(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4), getObject(arg5), getObject(arg6));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_records_put_meta_5a4c0adac3309b4f: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = getObject(arg0).records_put_meta(getStringFromWasm0(arg1, arg2), getObject(arg3));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_resolve_d82363d90af6928a: function(arg0) {
            const ret = Promise.resolve(getObject(arg0));
            return addHeapObject(ret);
        },
        __wbg_setItem_ab73a1e4497df37e: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            getObject(arg0).setItem(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
        }, arguments); },
        __wbg_setTimeout_8afa0b5ed243c77d: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = getObject(arg0).setTimeout(getObject(arg1), arg2);
            return ret;
        }, arguments); },
        __wbg_setTimeout_8e7a3aed4569a26d: function(arg0, arg1) {
            const ret = setTimeout(getObject(arg0), arg1);
            return ret;
        },
        __wbg_setUint32_ce7c668c907793d1: function(arg0, arg1, arg2) {
            getObject(arg0).setUint32(arg1 >>> 0, arg2 >>> 0);
        },
        __wbg_set_0bf1fca872bc6d18: function(arg0, arg1, arg2) {
            getObject(arg0).set(getArrayU8FromWasm0(arg1, arg2));
        },
        __wbg_set_6be42768c690e380: function(arg0, arg1, arg2) {
            getObject(arg0)[takeObject(arg1)] = takeObject(arg2);
        },
        __wbg_set_9a1d61e17de7054c: function(arg0, arg1, arg2) {
            const ret = getObject(arg0).set(getObject(arg1), getObject(arg2));
            return addHeapObject(ret);
        },
        __wbg_set_at_3642c6ea0e5ee17d: function(arg0, arg1) {
            getObject(arg0).at = arg1;
        },
        __wbg_set_create_5c5661b4170876f8: function(arg0, arg1) {
            getObject(arg0).create = arg1 !== 0;
        },
        __wbg_set_create_b9be7a200245a2da: function(arg0, arg1) {
            getObject(arg0).create = arg1 !== 0;
        },
        __wbg_set_dc601f4a69da0bc2: function(arg0, arg1, arg2) {
            getObject(arg0)[arg1 >>> 0] = takeObject(arg2);
        },
        __wbg_static_accessor_GLOBAL_THIS_2fee5048bcca5938: function() {
            const ret = typeof globalThis === 'undefined' ? null : globalThis;
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        },
        __wbg_static_accessor_GLOBAL_ce44e66a4935da8c: function() {
            const ret = typeof global === 'undefined' ? null : global;
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        },
        __wbg_static_accessor_SELF_44f6e0cb5e67cdad: function() {
            const ret = typeof self === 'undefined' ? null : self;
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        },
        __wbg_static_accessor_WINDOW_168f178805d978fe: function() {
            const ret = typeof window === 'undefined' ? null : window;
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        },
        __wbg_storage_4e051ebc7b11666f: function(arg0) {
            const ret = getObject(arg0).storage;
            return addHeapObject(ret);
        },
        __wbg_stringify_747a843de2eb6359: function() { return handleError(function (arg0) {
            const ret = JSON.stringify(getObject(arg0));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_subarray_b0e8ac4ed313fea8: function(arg0, arg1, arg2) {
            const ret = getObject(arg0).subarray(arg1 >>> 0, arg2 >>> 0);
            return addHeapObject(ret);
        },
        __wbg_sync_crypto_secure_8210f0600545f239: function(arg0) {
            const ret = getObject(arg0).sync_crypto_secure();
            return ret;
        },
        __wbg_sync_sha256_hex_7d696c522ab8cba8: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = getObject(arg0).sync_sha256_hex(getStringFromWasm0(arg1, arg2));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_sync_today_local_c8b542cd4139c871: function(arg0, arg1) {
            const ret = getObject(arg1).sync_today_local();
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_sync_token_03d9e0ea72ab9990: function(arg0, arg1) {
            const ret = getObject(arg1).sync_token();
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_sync_wma_get_d845ba87eb3084e3: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = getObject(arg0).sync_wma_get(getStringFromWasm0(arg1, arg2));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_sync_wma_put_66cb12076fb3d54a: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = getObject(arg0).sync_wma_put(getStringFromWasm0(arg1, arg2), getObject(arg3));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_then_05edfc8a4fea5106: function(arg0, arg1, arg2) {
            const ret = getObject(arg0).then(getObject(arg1), getObject(arg2));
            return addHeapObject(ret);
        },
        __wbg_then_591b6b3a75ee817a: function(arg0, arg1) {
            const ret = getObject(arg0).then(getObject(arg1));
            return addHeapObject(ret);
        },
        __wbg_toISOString_fe2430ea12ec15b5: function(arg0) {
            const ret = getObject(arg0).toISOString();
            return addHeapObject(ret);
        },
        __wbg_truncate_76cd612e76bda8cb: function() { return handleError(function (arg0, arg1) {
            getObject(arg0).truncate(arg1);
        }, arguments); },
        __wbg_truncate_b3069d6495fbfd90: function() { return handleError(function (arg0, arg1) {
            getObject(arg0).truncate(arg1 >>> 0);
        }, arguments); },
        __wbg_value_49f783bb59765962: function(arg0) {
            const ret = getObject(arg0).value;
            return addHeapObject(ret);
        },
        __wbg_workspace_call_01b7d6f502ea279f: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = getObject(arg0).workspace_call(getStringFromWasm0(arg1, arg2), getObject(arg3));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_write_0d7b7d5ddb95d78a: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = getObject(arg0).write(getArrayU8FromWasm0(arg1, arg2), getObject(arg3));
            return ret;
        }, arguments); },
        __wbg_write_6157d3928729b244: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = getObject(arg0).write(getObject(arg1), getObject(arg2));
            return ret;
        }, arguments); },
        __wbg_ws_delete_file_e8c59f0346ed2836: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = getObject(arg0).ws_delete_file(getStringFromWasm0(arg1, arg2));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_ws_list_dir_34a20f741481368b: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = getObject(arg0).ws_list_dir(getStringFromWasm0(arg1, arg2));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_ws_read_file_30e1dfdc39a48aa3: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            const ret = getObject(arg0).ws_read_file(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
            return addHeapObject(ret);
        }, arguments); },
        __wbg_ws_write_file_148301a1581b9583: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11, arg12, arg13, arg14) {
            const ret = getObject(arg0).ws_write_file(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4), getStringFromWasm0(arg5, arg6), getStringFromWasm0(arg7, arg8), getStringFromWasm0(arg9, arg10), getStringFromWasm0(arg11, arg12), getStringFromWasm0(arg13, arg14));
            return addHeapObject(ret);
        }, arguments); },
        __wbindgen_cast_0000000000000001: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [Externref], shim_idx: 2239, ret: Result(Unit), inner_ret: Some(Result(Unit)) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, __wasm_bindgen_func_elem_13966);
            return addHeapObject(ret);
        },
        __wbindgen_cast_0000000000000002: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [], shim_idx: 1584, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, __wasm_bindgen_func_elem_10025);
            return addHeapObject(ret);
        },
        __wbindgen_cast_0000000000000003: function(arg0) {
            // Cast intrinsic for `F64 -> Externref`.
            const ret = arg0;
            return addHeapObject(ret);
        },
        __wbindgen_cast_0000000000000004: function(arg0) {
            // Cast intrinsic for `I64 -> Externref`.
            const ret = arg0;
            return addHeapObject(ret);
        },
        __wbindgen_cast_0000000000000005: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return addHeapObject(ret);
        },
        __wbindgen_cast_0000000000000006: function(arg0) {
            // Cast intrinsic for `U64 -> Externref`.
            const ret = BigInt.asUintN(64, arg0);
            return addHeapObject(ret);
        },
        __wbindgen_object_clone_ref: function(arg0) {
            const ret = getObject(arg0);
            return addHeapObject(ret);
        },
        __wbindgen_object_drop_ref: function(arg0) {
            takeObject(arg0);
        },
    };
    return {
        __proto__: null,
        "./vdg_freight_bg.js": import0,
    };
}

function __wasm_bindgen_func_elem_10025(arg0, arg1) {
    wasm.__wasm_bindgen_func_elem_10025(arg0, arg1);
}

function __wasm_bindgen_func_elem_13966(arg0, arg1, arg2) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.__wasm_bindgen_func_elem_13966(retptr, arg0, arg1, addHeapObject(arg2));
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        if (r1) {
            throw takeObject(r0);
        }
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

function __wasm_bindgen_func_elem_13979(arg0, arg1, arg2, arg3) {
    wasm.__wasm_bindgen_func_elem_13979(arg0, arg1, addHeapObject(arg2), addHeapObject(arg3));
}

const CustomerIndexFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_customerindex_free(ptr, 1));
const WasmEntityRepoFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmentityrepo_free(ptr, 1));

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

const CLOSURE_DTORS = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(state => wasm.__wbindgen_export4(state.a, state.b));

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

function dropObject(idx) {
    if (idx < 1028) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function getObject(idx) { return heap[idx]; }

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        wasm.__wbindgen_export3(addHeapObject(e));
    }
}

let heap = new Array(1024).fill(undefined);
heap.push(undefined, null, true, false);

let heap_next = heap.length;

function isLikeNone(x) {
    return x === undefined || x === null;
}

function makeMutClosure(arg0, arg1, f) {
    const state = { a: arg0, b: arg1, cnt: 1 };
    const real = (...args) => {

        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            state.a = a;
            real._wbg_cb_unref();
        }
    };
    real._wbg_cb_unref = () => {
        if (--state.cnt === 0) {
            wasm.__wbindgen_export4(state.a, state.b);
            state.a = 0;
            CLOSURE_DTORS.unregister(state);
        }
    };
    CLOSURE_DTORS.register(real, state, state);
    return real;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('vdg_freight_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
