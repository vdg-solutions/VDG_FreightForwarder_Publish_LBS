import {
  currentUserRole
} from "./chunk-Z5J2LHCQ.js";
import "./chunk-EQL6UFHA.js";
import {
  ROLE_ACCOUNTANT,
  ROLE_MANAGER,
  ROLE_SALES_REP
} from "./chunk-KXTXGKNK.js";
import {
  hasRole
} from "./chunk-B24LWBUG.js";
import {
  t
} from "./chunk-NPO6NGQC.js";

// output/web/js.tmp/implementations/ui/bootstrap/views/help-md.js
function mdToHtml(md) {
  const lines = md.split("\n");
  const out = [];
  let inList = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line === "---") {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push('<hr class="my-4 border-slate-200" />');
      continue;
    }
    if (line.startsWith("### ")) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(`<h3 class="text-sm font-semibold text-slate-800 mt-4 mb-1">${inline(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith("## ")) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(`<h2 class="text-base font-semibold text-slate-900 mt-5 mb-2">${inline(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith("# ")) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(`<h1 class="text-lg font-bold text-slate-900 mt-2 mb-3">${inline(line.slice(2))}</h1>`);
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(`<p class="text-sm text-slate-700 my-1 pl-4">${inline(line)}</p>`);
      continue;
    }
    if (line.startsWith("- ")) {
      if (!inList) {
        out.push('<ul class="list-disc pl-6 space-y-1 my-2">');
        inList = true;
      }
      out.push(`<li class="text-sm text-slate-700">${inline(line.slice(2))}</li>`);
      continue;
    }
    if (!line.trim()) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push('<div class="my-1"></div>');
      continue;
    }
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
    out.push(`<p class="text-sm text-slate-700 my-1">${inline(line)}</p>`);
  }
  if (inList) out.push("</ul>");
  return out.join("\n");
}
function resolveAssetSrc(src) {
  if (!src.startsWith("/")) return src;
  return resolveGuideUrl(document.baseURI, src.slice(1));
}
function inline(s) {
  return s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, '<code class="font-mono bg-slate-100 px-1 rounded text-xs">$1</code>').replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, src) => `<img src="${resolveAssetSrc(src)}" alt="${alt}" loading="lazy" class="max-w-full rounded border border-slate-200 my-2" />`).replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, href) => `<a href="${resolveAssetSrc(href)}" class="text-blue-600 hover:underline">${text}</a>`);
}

// output/web/js.tmp/implementations/ui/bootstrap/views/help.js
var TABS = ["manager", "accountant", "sales"];
var TAB_DOC = {
  manager: "docs/onboarding/guide-manager.md",
  accountant: "docs/onboarding/guide-accountant.md",
  sales: "docs/onboarding/guide-sales.md"
};
var TAB_LABEL_KEY = {
  manager: "help.tab.manager",
  accountant: "help.tab.accountant",
  sales: "help.tab.sales"
};
var TAB_ACTIVE_CLASSES = ["border-blue-600", "text-blue-700"];
var TAB_INACTIVE_CLASSES = ["border-transparent", "text-slate-500", "hover:text-slate-700"];
var TAB_STATE_CLASSES_RE = /border-blue-600 text-blue-700|border-transparent text-slate-500 hover:text-slate-700/g;
function resolveDefaultTab() {
  if (hasRole(ROLE_MANAGER)) return "manager";
  const role = currentUserRole();
  if (role === ROLE_MANAGER) return "manager";
  if (role === ROLE_ACCOUNTANT) return "accountant";
  if (role === ROLE_SALES_REP) return "sales";
  return "sales";
}
function resolveGuideUrl(baseURI, docPath) {
  return new URL(docPath, baseURI).href;
}
async function fetchDoc(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return `_Could not load ${url} (${res.status})_`;
    return res.text();
  } catch (err) {
    return `_Error loading doc: ${err.message}_`;
  }
}
async function render(root) {
  const activeTab = resolveDefaultTab();
  const tabsHtml = TABS.map((tab) => `
        <button id="tab-${tab}"
                class="tab-btn px-4 py-2 text-sm font-medium border-b-2 transition
                       ${tab === activeTab ? TAB_ACTIVE_CLASSES.join(" ") : TAB_INACTIVE_CLASSES.join(" ")}">
          ${t(TAB_LABEL_KEY[tab])}
        </button>`).join("");
  root.innerHTML = `
    <div class="p-6 max-w-3xl mx-auto">
      <div class="text-lg font-semibold text-slate-900 mb-4">${t("help.page_title")}</div>

      <div class="flex gap-1 border-b border-slate-200 mb-6">${tabsHtml}</div>

      <div id="doc-content" class="bg-white rounded-xl border border-slate-200 p-6 min-h-[300px]">
        <div class="text-xs text-slate-400">${t("loading")}</div>
      </div>
    </div>`;
  const contentEl = root.querySelector("#doc-content");
  const tabEls = Object.fromEntries(TABS.map((tab) => [tab, root.querySelector(`#tab-${tab}`)]));
  const _cache = {};
  async function showTab(tab) {
    for (const other of TABS) {
      const el = tabEls[other];
      el.className = el.className.replace(TAB_STATE_CLASSES_RE, "");
      el.classList.add(...other === tab ? TAB_ACTIVE_CLASSES : TAB_INACTIVE_CLASSES);
    }
    if (!_cache[tab]) {
      contentEl.innerHTML = `<div class="text-xs text-slate-400">${t("loading")}</div>`;
      const md = await fetchDoc(resolveGuideUrl(document.baseURI, TAB_DOC[tab]));
      _cache[tab] = mdToHtml(md);
    }
    contentEl.innerHTML = _cache[tab];
  }
  for (const tab of TABS) tabEls[tab].addEventListener("click", () => showTab(tab));
  await showTab(activeTab);
}
export {
  TAB_DOC,
  render,
  resolveGuideUrl
};
