// Manager Onboarding Wizard — F-14-20 AC-14-20-1

import { OnboardingOrchestrator, DEFAULT_COMMISSION_PCT, ONBOARDING_TOTAL_STEPS }
  from '../../operators/manager/onboarding-orchestrator.js';
import { openVdgDb } from '../../cache/idb-cache.js';
import { navigate } from '../../router.js';
import { t } from '../../i18n/index.js';

const BREAKPOINT_TABLET_PX = 768;
const BASE_CURRENCY_OPTIONS = ['VND', 'USD', 'EUR'];
const FISCAL_MONTHS         = Array.from({ length: 12 }, (_, i) => i + 1);

let _orchestrator = null;
let _currentStep  = 1;
let _salesReps    = [{ name: '', email: '' }];
let _commRates    = {};
let _dialog       = null;

function isMobile() {
  return navigator.maxTouchPoints > 0 && window.innerWidth < BREAKPOINT_TABLET_PX;
}

function dotNav() {
  return Array.from({ length: ONBOARDING_TOTAL_STEPS }, (_, i) =>
    `<span class="w-2.5 h-2.5 rounded-full transition ${i + 1 === _currentStep
      ? 'bg-indigo-600' : 'bg-slate-300'}"></span>`
  ).join('');
}

function fileInputHtml(id = 'file-import') {
  if (!isMobile()) return '';
  return `
    <label class="mt-3 block">
      <span class="text-xs text-slate-600">${t('select_file')}</span>
      <input id="${id}" type="file" accept=".xlsx,.csv,.json"
             class="block mt-1 text-xs text-slate-600 file:mr-2 file:py-1 file:px-3
                    file:rounded file:border-0 file:text-xs file:bg-indigo-50 file:text-indigo-700">
    </label>`;
}

function renderStep1() {
  return `
    <div class="text-center space-y-4">
      <div class="w-16 h-16 mx-auto rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold">V</div>
      <h2 class="text-xl font-semibold text-slate-900">${t('welcome_title')}</h2>
      <p class="text-sm text-slate-500 max-w-xs mx-auto">
        Thiết lập workspace Drive, thêm nhân viên kinh doanh và cấu hình báo cáo hoa hồng.
      </p>
      <button id="btn-next" class="mt-4 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">
        ${t('get_started')}
      </button>
    </div>`;
}

function renderStep2() {
  return `
    <div class="space-y-4 text-center">
      <h2 class="text-lg font-semibold text-slate-900">${t('step_provision')}</h2>
      <p class="text-sm text-slate-500">Tạo cấu trúc thư mục Google Drive cho workspace.</p>
      <div id="provision-status" class="text-sm text-slate-600">
        <span id="provision-spinner" class="inline-block">⏳ ${t('provisioning')}</span>
      </div>
      <div class="flex justify-between mt-6">
        <button id="btn-back" class="px-4 py-2 text-xs text-slate-600 hover:underline">${t('previous')}</button>
        <button id="btn-next" disabled class="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium
                disabled:opacity-40 disabled:cursor-not-allowed">
          ${t('next')}
        </button>
      </div>
    </div>`;
}

function renderStep3() {
  const rows = _salesReps.map((r, i) => `
    <div class="flex gap-2 items-center" data-rep="${i}">
      <input data-field="name" value="${r.name}" placeholder="${t('name')}"
             class="flex-1 text-xs border border-slate-200 rounded px-2 py-1.5">
      <input data-field="email" value="${r.email}" placeholder="${t('email')}"
             class="flex-1 text-xs border border-slate-200 rounded px-2 py-1.5">
      ${i > 0 ? `<button data-remove="${i}" class="text-slate-400 hover:text-red-500 text-xs">✕</button>` : ''}
    </div>`).join('');

  return `
    <div class="space-y-3">
      <h2 class="text-lg font-semibold text-slate-900">${t('step_sales_reps')}</h2>
      <div id="rep-rows" class="space-y-2">${rows}</div>
      <button id="btn-add-rep" class="text-xs text-indigo-600 hover:underline">+ ${t('add_another')}</button>
      ${fileInputHtml('import-reps')}
      <div class="flex justify-between mt-4">
        <button id="btn-back" class="px-4 py-2 text-xs text-slate-600 hover:underline">${t('previous')}</button>
        <div class="flex gap-2">
          <button id="btn-skip" class="px-4 py-2 text-xs text-slate-500 hover:underline">${t('skip_for_now')}</button>
          <button id="btn-next" class="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">
            ${t('next')}
          </button>
        </div>
      </div>
    </div>`;
}

function renderStep4() {
  const rows = _salesReps.filter((r) => r.name).map((r, i) => `
    <div class="flex items-center justify-between gap-3">
      <span class="text-xs text-slate-700 flex-1 truncate">${r.name}</span>
      <input type="number" data-rep="${i}" value="${_commRates[i] ?? DEFAULT_COMMISSION_PCT}"
             min="0.1" max="100" step="0.1"
             class="w-20 text-xs border border-slate-200 rounded px-2 py-1.5 text-right">
      <span class="text-xs text-slate-400">%</span>
    </div>`).join('') || `<p class="text-xs text-slate-400">Chưa có nhân viên nào.</p>`;

  return `
    <div class="space-y-3">
      <h2 class="text-lg font-semibold text-slate-900">${t('step_commission')}</h2>
      <div id="comm-rows" class="space-y-2">${rows}</div>
      <p class="text-[11px] text-slate-400">0 &lt; tỷ lệ ≤ 100%</p>
      <div class="flex justify-between mt-4">
        <button id="btn-back" class="px-4 py-2 text-xs text-slate-600 hover:underline">${t('previous')}</button>
        <button id="btn-next" class="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">
          ${t('next')}
        </button>
      </div>
    </div>`;
}

function renderStep5() {
  const currOpts = BASE_CURRENCY_OPTIONS.map((c) =>
    `<option${c === 'VND' ? ' selected' : ''}>${c}</option>`).join('');
  const monthOpts = FISCAL_MONTHS.map((m) =>
    `<option${m === 1 ? ' selected' : ''}>${m}</option>`).join('');
  return `
    <div class="space-y-3">
      <h2 class="text-lg font-semibold text-slate-900">${t('step_settings')}</h2>
      <div class="space-y-2">
        <label class="block text-xs text-slate-600">${t('currency')}
          <select id="set-currency" class="mt-1 block w-full text-xs border border-slate-200 rounded px-2 py-1.5">
            ${currOpts}
          </select>
        </label>
        <label class="block text-xs text-slate-600">${t('commission_rate')} (default)
          <input id="set-comm" type="number" value="${DEFAULT_COMMISSION_PCT}" min="0.1" max="100" step="0.1"
                 class="mt-1 block w-full text-xs border border-slate-200 rounded px-2 py-1.5">
        </label>
        <label class="block text-xs text-slate-600">${t('fiscal_month')}
          <select id="set-fiscal" class="mt-1 block w-full text-xs border border-slate-200 rounded px-2 py-1.5">
            ${monthOpts}
          </select>
        </label>
      </div>
      <div class="flex justify-between mt-4">
        <button id="btn-back" class="px-4 py-2 text-xs text-slate-600 hover:underline">${t('previous')}</button>
        <button id="btn-next" class="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">
          ${t('next')}
        </button>
      </div>
    </div>`;
}

function renderStep6() {
  return `
    <div class="text-center space-y-4">
      <div class="text-4xl">✅</div>
      <h2 class="text-xl font-semibold text-slate-900">${t('you_are_ready')}</h2>
      <p class="text-sm text-slate-500">Workspace đã được cấu hình. Bắt đầu quản lý lô hàng ngay.</p>
      <button id="btn-done" class="mt-4 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700">
        ${t('go_to_dashboard')}
      </button>
    </div>`;
}

const STEP_RENDERERS = [null, renderStep1, renderStep2, renderStep3, renderStep4, renderStep5, renderStep6];

function renderDialog() {
  _dialog.innerHTML = `
    <div class="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div class="flex justify-center gap-1.5 mb-6">${dotNav()}</div>
        <div id="step-content">${STEP_RENDERERS[_currentStep]?.() || ''}</div>
      </div>
    </div>`;
  bindStep(_dialog);
}

function bindStep(root) {
  root.querySelector('#btn-next')?.addEventListener('click', () => handleNext(root));
  root.querySelector('#btn-back')?.addEventListener('click', () => gotoStep(_currentStep - 1));
  root.querySelector('#btn-skip')?.addEventListener('click', () => gotoStep(_currentStep + 1));
  root.querySelector('#btn-done')?.addEventListener('click', handleDone);
  root.querySelector('#btn-add-rep')?.addEventListener('click', () => {
    _salesReps.push({ name: '', email: '' });
    gotoStep(_currentStep);
  });
  root.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      _salesReps.splice(Number(btn.dataset.remove), 1);
      gotoStep(_currentStep);
    });
  });
  root.querySelectorAll('#rep-rows [data-field]').forEach((inp) => {
    const repIdx = Number(inp.closest('[data-rep]').dataset.rep);
    inp.addEventListener('input', () => {
      _salesReps[repIdx][inp.dataset.field] = inp.value;
    });
  });
  root.querySelectorAll('#comm-rows input[data-rep]').forEach((inp) => {
    inp.addEventListener('input', () => { _commRates[inp.dataset.rep] = Number(inp.value); });
  });
  if (_currentStep === 2) runProvision(root);
}

async function runProvision(root) {
  const statusEl  = root.querySelector('#provision-status');
  const nextBtn   = root.querySelector('#btn-next');
  const user      = window.__vdg_auth?.getCurrentUser?.();
  const result    = await _orchestrator.provisionWorkspace(user?.email || 'manager');
  if (result.ok) {
    statusEl.innerHTML = `<span class="text-emerald-600">✓ ${t('provisioned_ok')}</span>`;
    nextBtn.disabled = false;
  } else {
    statusEl.innerHTML = `
      <span class="text-red-600">Lỗi: ${result.error}</span>
      <button id="btn-retry" class="ml-2 text-xs text-blue-600 hover:underline">${t('retry')}</button>`;
    root.querySelector('#btn-retry')?.addEventListener('click', () => runProvision(root));
  }
}

async function handleNext(root) {
  if (_currentStep === 3) {
    for (const r of _salesReps.filter((x) => x.name)) {
      await _orchestrator.addSalesRep(r.name, r.email);
    }
  }
  if (_currentStep === 5) {
    const currency    = root.querySelector('#set-currency')?.value || 'VND';
    const commissionPct = Number(root.querySelector('#set-comm')?.value || DEFAULT_COMMISSION_PCT);
    const fiscalMonth = Number(root.querySelector('#set-fiscal')?.value || 1);
    await _orchestrator.saveSettings({ currency, commissionPct, fiscalMonth });
  }
  gotoStep(_currentStep + 1);
}

async function handleDone() {
  await _orchestrator.markComplete();
  _dialog.innerHTML = '';
  navigate('/manager/dashboard');
}

async function gotoStep(n) {
  const step = Math.max(1, Math.min(ONBOARDING_TOTAL_STEPS, n));
  _currentStep = step;
  await _orchestrator.saveStep(step);
  renderDialog();
}

export async function render(root) {
  let db = null;
  try { db = await openVdgDb(); } catch { /* IDB unavailable */ }

  _orchestrator = new OnboardingOrchestrator(db);
  _currentStep  = await _orchestrator.getStep();
  _salesReps    = [{ name: '', email: '' }];
  _commRates    = {};

  _dialog = document.createElement('div');
  _dialog.id = 'onboarding-modal-root';
  document.body.appendChild(_dialog);

  renderDialog();

  root.innerHTML = `<div class="p-6 text-xs text-slate-400">Loading wizard…</div>`;
}
