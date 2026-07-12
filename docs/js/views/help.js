// F-12-12 — In-app help / onboarding docs

import { isManager } from '../auth/auth-gate.js';

const DOC_ADMIN = '/docs/onboarding/in-app-admin.md';
const DOC_SALES = '/docs/onboarding/in-app-sales.md';

// ── minimal markdown → HTML (no external dep per OQ-4) ───────────────────────

function mdToHtml(md) {
  const lines = md.split('\n');
  const out   = [];
  let inList  = false;

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line === '---') {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push('<hr class="my-4 border-slate-200" />');
      continue;
    }
    if (line.startsWith('### ')) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<h3 class="text-sm font-semibold text-slate-800 mt-4 mb-1">${inline(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith('## ')) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<h2 class="text-base font-semibold text-slate-900 mt-5 mb-2">${inline(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith('# ')) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<h1 class="text-lg font-bold text-slate-900 mt-2 mb-3">${inline(line.slice(2))}</h1>`);
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<p class="text-sm text-slate-700 my-1 pl-4">${inline(line)}</p>`);
      continue;
    }
    if (line.startsWith('- ')) {
      if (!inList) { out.push('<ul class="list-disc pl-6 space-y-1 my-2">'); inList = true; }
      out.push(`<li class="text-sm text-slate-700">${inline(line.slice(2))}</li>`);
      continue;
    }
    if (!line.trim()) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push('<div class="my-1"></div>');
      continue;
    }
    if (inList) { out.push('</ul>'); inList = false; }
    out.push(`<p class="text-sm text-slate-700 my-1">${inline(line)}</p>`);
  }
  if (inList) out.push('</ul>');
  return out.join('\n');
}

function inline(s) {
  return s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="font-mono bg-slate-100 px-1 rounded text-xs">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:underline">$1</a>');
}

// ── fetch doc ─────────────────────────────────────────────────────────────────

async function fetchDoc(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return `_Could not load ${url} (${res.status})_`;
    return res.text();
  } catch (err) {
    return `_Error loading doc: ${err.message}_`;
  }
}

// ── entry point ───────────────────────────────────────────────────────────────

export async function render(root) {
  const isM       = isManager();
  const activeTab = isM ? 'admin' : 'sales';

  root.innerHTML = `
    <div class="p-6 max-w-3xl mx-auto">
      <div class="text-lg font-semibold text-slate-900 mb-4">Help &amp; Getting Started</div>

      <div class="flex gap-1 border-b border-slate-200 mb-6">
        <button id="tab-admin"
                class="tab-btn px-4 py-2 text-sm font-medium border-b-2 transition
                       ${activeTab === 'admin' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}">
          Admin Guide
        </button>
        <button id="tab-sales"
                class="tab-btn px-4 py-2 text-sm font-medium border-b-2 transition
                       ${activeTab === 'sales' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}">
          Sales Quickstart
        </button>
      </div>

      <div id="doc-content" class="bg-white rounded-xl border border-slate-200 p-6 min-h-[300px]">
        <div class="text-xs text-slate-400">Loading…</div>
      </div>
    </div>`;

  const contentEl = root.querySelector('#doc-content');
  const tabAdmin  = root.querySelector('#tab-admin');
  const tabSales  = root.querySelector('#tab-sales');

  let _active = activeTab;
  const _cache = {};

  async function showTab(tab) {
    _active = tab;
    const url = tab === 'admin' ? DOC_ADMIN : DOC_SALES;

    tabAdmin.className = tabAdmin.className.replace(/border-blue-600 text-blue-700|border-transparent text-slate-500 hover:text-slate-700/g, '');
    tabSales.className = tabSales.className.replace(/border-blue-600 text-blue-700|border-transparent text-slate-500 hover:text-slate-700/g, '');

    if (tab === 'admin') {
      tabAdmin.classList.add('border-blue-600', 'text-blue-700');
      tabSales.classList.add('border-transparent', 'text-slate-500', 'hover:text-slate-700');
    } else {
      tabSales.classList.add('border-blue-600', 'text-blue-700');
      tabAdmin.classList.add('border-transparent', 'text-slate-500', 'hover:text-slate-700');
    }

    if (!_cache[tab]) {
      contentEl.innerHTML = '<div class="text-xs text-slate-400">Loading…</div>';
      const md = await fetchDoc(url);
      _cache[tab] = mdToHtml(md);
    }
    contentEl.innerHTML = _cache[tab];
  }

  tabAdmin.addEventListener('click', () => showTab('admin'));
  tabSales.addEventListener('click', () => showTab('sales'));

  await showTab(activeTab);
}
