import {
  saveDraft
} from "./chunk-5UHUC2YB.js";
import {
  navigate
} from "./chunk-H2H4WJDI.js";
import {
  currentSalesRepId
} from "./chunk-B24LWBUG.js";
import {
  t
} from "./chunk-MGTH6QM4.js";

// output/web/js.tmp/implementations/ui/bootstrap/views/sales-quote-new.js
var DEFAULT_VALIDITY_DAYS = 7;
async function getContainerTypes(repo) {
  try {
    const list = await repo?.list?.("units-of-measure");
    if (Array.isArray(list) && list.length > 0) {
      const conts = list.filter((u) => u.category === "container");
      if (conts.length > 0) {
        return conts.map((u) => {
          const code = u.aliases?.[0] || u.code;
          const label = u.label_vi ? `${code} (${u.label_vi})` : code;
          return { code, label };
        });
      }
    }
  } catch {
  }
  return [
    { code: "20DC", label: "20DC (Container 20' kh\xF4)" },
    { code: "40DC", label: "40DC (Container 40' kh\xF4)" },
    { code: "40HC", label: "40HC (Container 40' cao)" },
    { code: "45HC", label: "45HC (Container 45' cao)" },
    { code: "20RF", label: "20RF (Container 20' l\u1EA1nh)" },
    { code: "40RF", label: "40RF (Container 40' l\u1EA1nh)" },
    { code: "20OT", label: "20OT (Container 20' h\u1EDF n\xF3c)" },
    { code: "40OT", label: "40OT (Container 40' h\u1EDF n\xF3c)" },
    { code: "20FR", label: "20FR (Container 20' s\xE0n ph\u1EB3ng)" },
    { code: "40FR", label: "40FR (Container 40' s\xE0n ph\u1EB3ng)" },
    { code: "20TK", label: "20TK (Container 20' b\u1ED3n)" }
  ];
}
var VALID_CURRENCIES = ["VND", "USD", "EUR", "SGD", "JPY"];
function escHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function showError(root, fieldId, msg) {
  const el = root.querySelector(`#err-${fieldId}`);
  if (el) {
    el.textContent = msg;
    el.classList.remove("hidden");
  }
}
function clearErrors(root) {
  root.querySelectorAll(".field-err").forEach((el) => {
    el.textContent = "";
    el.classList.add("hidden");
  });
}
function attachAutocomplete(inputEl, items, labelKey) {
  if (!inputEl) return;
  const list = document.createElement("ul");
  list.className = "absolute z-50 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto w-full";
  list.style.display = "none";
  inputEl.parentElement.style.position = "relative";
  inputEl.parentElement.appendChild(list);
  function show(filtered) {
    list.innerHTML = filtered.slice(0, 10).map(
      (item) => `<li class="px-3 py-1.5 text-xs cursor-pointer hover:bg-slate-100" data-val="${escHtml(item[labelKey] || item.name || item)}">${escHtml(item[labelKey] || item.name || item)}</li>`
    ).join("");
    list.style.display = filtered.length ? "block" : "none";
  }
  inputEl.addEventListener("input", () => {
    const q = inputEl.value.toLowerCase();
    show(q ? items.filter((i) => (i[labelKey] || i.name || i).toLowerCase().includes(q)) : []);
  });
  list.addEventListener("mousedown", (e) => {
    const li = e.target.closest("li[data-val]");
    if (li) {
      inputEl.value = li.dataset.val;
      list.style.display = "none";
    }
  });
  inputEl.addEventListener("blur", () => setTimeout(() => {
    list.style.display = "none";
  }, 150));
}
var _lines = [{ description: "", amount: "", currency: "VND" }];
function renderLinesTable(root) {
  const tbody = root.querySelector("#lines-tbody");
  if (!tbody) return;
  tbody.innerHTML = _lines.map((l, i) => `
    <tr data-idx="${i}">
      <td class="px-2 py-1">
        <input type="text" value="${escHtml(l.description)}" placeholder="${t("quote_new.ph.description")}"
               class="w-full border rounded px-2 py-1 text-xs" data-field="description" data-idx="${i}" />
      </td>
      <td class="px-2 py-1">
        <input type="number" value="${escHtml(l.amount)}" placeholder="0"
               class="w-full border rounded px-2 py-1 text-xs" data-field="amount" data-idx="${i}" />
      </td>
      <td class="px-2 py-1">
        <select class="border rounded px-2 py-1 text-xs" data-field="currency" data-idx="${i}">
          ${VALID_CURRENCIES.map((c) => `<option ${c === l.currency ? "selected" : ""}>${c}</option>`).join("")}
        </select>
      </td>
      <td class="px-2 py-1 text-center">
        <button class="text-red-500 hover:text-red-700 text-xs font-bold" data-rm="${i}">\u2715</button>
      </td>
    </tr>`).join("");
  tbody.querySelectorAll("[data-field]").forEach((el) => {
    el.addEventListener("change", () => {
      const idx = Number(el.dataset.idx);
      _lines[idx][el.dataset.field] = el.value;
    });
    el.addEventListener("input", () => {
      const idx = Number(el.dataset.idx);
      _lines[idx][el.dataset.field] = el.value;
    });
  });
  tbody.querySelectorAll("[data-rm]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.rm);
      _lines.splice(idx, 1);
      if (!_lines.length) _lines.push({ description: "", amount: "", currency: "VND" });
      renderLinesTable(root);
    });
  });
}
function formHtml(presetSales, containerTypes = []) {
  const ctOptions = containerTypes.map((ct) => `<option value="${escHtml(ct.code)}">${escHtml(ct.label)}</option>`).join("");
  return `
    <div class="p-6 max-w-3xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div>
          <div class="text-lg font-semibold text-slate-900">${t("quote_new.title")}</div>
          <div class="text-xs text-slate-500 mt-0.5">${t("quote_new.subtitle")}</div>
        </div>
        <a href="#/sales/quote" class="text-sm text-slate-500 hover:text-slate-700">${t("quote_new.back")}</a>
      </div>
      <div id="override-banner" class="hidden mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        ${t("quote_new.override_banner")}
      </div>
      <form id="quote-form" class="bg-white rounded-xl border border-slate-200 p-6 space-y-4" novalidate>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t("quote_new.field.customer")} <span class="text-red-500">*</span></label>
            <div class="relative">
              <input id="f-customer" type="text" autocomplete="off" placeholder="${t("quote_new.ph.customer")}"
                     class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <span id="err-customer" class="field-err hidden text-xs text-red-600"></span>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t("quote_new.field.carrier")}</label>
            <div class="relative">
              <input id="f-carrier" type="text" autocomplete="off" placeholder="${t("quote_new.ph.carrier")}"
                     class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t("sales_new.field.pol")} <span class="text-red-500">*</span></label>
            <input id="f-pol" type="text" placeholder="${t("quote_new.ph.pol")}"
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <span id="err-pol" class="field-err hidden text-xs text-red-600"></span>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t("sales_new.field.pod")} <span class="text-red-500">*</span></label>
            <input id="f-pod" type="text" placeholder="${t("quote_new.ph.pod")}"
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <span id="err-pod" class="field-err hidden text-xs text-red-600"></span>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t("quote_new.field.container_type")} <span class="text-red-500">*</span></label>
            <select id="f-container" class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              ${ctOptions}
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t("quote_new.field.validity")} <span class="text-red-500">*</span></label>
            <input id="f-validity" type="number" value="${DEFAULT_VALIDITY_DAYS}" min="1" max="365"
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <span id="err-validity" class="field-err hidden text-xs text-red-600"></span>
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="block text-xs font-medium text-slate-700">${t("quote_new.field.rate_lines")} <span class="text-red-500">*</span></label>
            <button type="button" id="btn-add-line"
                    class="text-xs text-blue-600 hover:text-blue-800 font-medium">${t("quote_new.add_line")}</button>
          </div>
          <span id="err-lines" class="field-err hidden text-xs text-red-600 block mb-1"></span>
          <div class="rounded-lg border border-slate-200 overflow-x-auto">
            <table class="w-full text-xs">
              <thead class="bg-slate-50">
                <tr>
                  <th class="px-2 py-1.5 text-left text-slate-500 font-medium">${t("quote_new.col.description")}</th>
                  <th class="px-2 py-1.5 text-left text-slate-500 font-medium w-28">${t("quote_new.col.amount")}</th>
                  <th class="px-2 py-1.5 text-left text-slate-500 font-medium w-20">${t("quote_new.col.currency")}</th>
                  <th class="w-8"></th>
                </tr>
              </thead>
              <tbody id="lines-tbody"></tbody>
            </table>
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t("quote_new.field.notes")}</label>
          <textarea id="f-notes" rows="2" placeholder="${t("quote_new.ph.notes")}"
                    class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"></textarea>
        </div>

        <div class="flex items-center gap-3 pt-2 border-t border-slate-100">
          <button type="submit" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition">
            ${t("quote_new.save_draft")}
          </button>
          <a href="#/sales/quote" class="text-sm text-slate-500 hover:text-slate-700">${t("common.action.cancel")}</a>
          <span id="form-status" class="text-xs text-slate-500 ml-auto"></span>
        </div>
      </form>
    </div>`;
}
async function render(root) {
  _lines = [{ description: "", amount: "", currency: "VND" }];
  const salesId = currentSalesRepId();
  if (!salesId) {
    root.innerHTML = `<div data-auth-stale class="p-6 text-red-600 text-sm">${t("sales_me.not_authenticated")}</div>`;
    return;
  }
  const repo = window.__vdg_repo;
  const containerTypes = await getContainerTypes(repo);
  root.innerHTML = formHtml(salesId, containerTypes);
  renderLinesTable(root);
  let customers = [], carriers = [];
  if (repo) {
    [customers, carriers] = await Promise.all([
      repo.list("customers", null).catch(() => []),
      repo.list("carriers", null).catch(() => [])
    ]);
  }
  attachAutocomplete(root.querySelector("#f-customer"), customers, "name");
  attachAutocomplete(root.querySelector("#f-carrier"), carriers, "name");
  root.querySelector("#btn-add-line")?.addEventListener("click", () => {
    _lines.push({ description: "", amount: "", currency: "VND" });
    renderLinesTable(root);
  });
  root.querySelector("#quote-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors(root);
    const customer = root.querySelector("#f-customer").value.trim();
    const pol = root.querySelector("#f-pol").value.trim();
    const pod = root.querySelector("#f-pod").value.trim();
    const validity = root.querySelector("#f-validity").value.trim();
    const container_type = root.querySelector("#f-container").value;
    const carrier = root.querySelector("#f-carrier").value.trim();
    const notes = root.querySelector("#f-notes").value.trim();
    let ok = true;
    if (!customer) {
      showError(root, "customer", t("quote_new.val.customer"));
      ok = false;
    }
    if (!pol) {
      showError(root, "pol", t("quote_new.val.pol"));
      ok = false;
    }
    if (!pod) {
      showError(root, "pod", t("quote_new.val.pod"));
      ok = false;
    }
    if (!validity || Number(validity) < 1) {
      showError(root, "validity", t("quote_new.val.validity"));
      ok = false;
    }
    const validLines = _lines.filter((l) => l.description && Number(l.amount) > 0);
    if (!validLines.length) {
      showError(root, "lines", t("quote_new.val.lines"));
      ok = false;
    }
    if (!ok) return;
    const statusEl = root.querySelector("#form-status");
    if (statusEl) statusEl.textContent = t("quote_new.status.saving");
    try {
      const { id, pending_manager_approval } = await saveDraft(repo, salesId, {
        customer,
        pol,
        pod,
        container_type,
        carrier,
        notes,
        lines: validLines,
        validity_days: Number(validity)
      });
      if (pending_manager_approval) {
        root.querySelector("#override-banner")?.classList.remove("hidden");
        if (statusEl) statusEl.textContent = t("quote_new.status.saved_pending");
      }
      setTimeout(() => navigate("/sales/quote"), pending_manager_approval ? 2e3 : 400);
    } catch (err) {
      if (statusEl) statusEl.textContent = t("quote_new.status.error", { error: err.message });
    }
  });
}
export {
  getContainerTypes,
  render
};
