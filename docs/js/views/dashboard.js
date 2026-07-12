function kpiSection(kpis) {
  return `
    <section class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      ${kpis.map(
        (k) => `<kpi-card label="${k.label}" value="${k.value}" delta="${k.delta}" tone="${k.tone}" icon="${k.icon}"></kpi-card>`
      ).join('')}
    </section>
  `;
}

function distributionSection(distribution) {
  return `
    <section class="bg-white rounded-xl border border-slate-200 p-5">
      <div class="flex items-center justify-between mb-4">
        <div>
          <div class="text-sm font-semibold text-slate-900">Shipment status distribution</div>
          <div class="text-xs text-slate-500">FSM-01 · live count by state</div>
        </div>
        <select class="text-xs border border-slate-200 rounded-md px-2 py-1 text-slate-600 bg-white">
          <option>This month</option><option>Last 30 days</option><option>Quarter</option>
        </select>
      </div>
      <div class="flex items-center gap-6">
        <div class="w-44 h-44 shrink-0"><canvas id="dist-chart"></canvas></div>
        <div class="flex-1 grid grid-cols-2 gap-2">
          ${distribution.map(
            (s) => `
            <div class="flex items-center justify-between text-xs py-1.5 px-2 rounded hover:bg-slate-50">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-sm" style="background:${s.color}"></span>
                <span class="text-slate-700">${s.label}</span>
              </div>
              <span class="font-mono font-semibold text-slate-900">${s.value}</span>
            </div>`
          ).join('')}
        </div>
      </div>
    </section>
  `;
}

function exceptionSection(exceptions) {
  const severityColor = { Critical: 'red', High: 'red', Medium: 'orange', Low: 'yellow' };
  if (!exceptions.length) return `<section class="bg-white rounded-xl border border-slate-200 p-5"><div class="text-sm font-semibold text-slate-900">No open exceptions</div></section>`;
  return `
    <section class="bg-white rounded-xl border border-slate-200 p-5">
      <div class="flex items-center justify-between mb-4">
        <div>
          <div class="text-sm font-semibold text-slate-900">Open exceptions</div>
          <div class="text-xs text-slate-500">FSM-18 · top 5 by SLA pressure</div>
        </div>
      </div>
      <div class="divide-y divide-slate-100">
        ${exceptions.map(
          (e) => `
          <div class="py-2.5 flex items-center gap-3">
            <span class="w-1.5 h-8 rounded-full bg-${severityColor[e.severity] || 'slate'}-500"></span>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-slate-800 truncate">${e.type}</div>
              <div class="text-[11px] text-slate-500">${e.id} · ${e.shipment}</div>
            </div>
            <status-badge state="${e.severity}" fsm="exception"></status-badge>
            <div class="text-xs font-mono ${e.mins < 60 ? 'text-red-600 font-semibold' : 'text-slate-500'} w-16 text-right">
              ${e.mins < 60 ? `${e.mins}m left` : `${Math.floor(e.mins / 60)}h left`}
            </div>
          </div>`
        ).join('')}
      </div>
    </section>
  `;
}

function cutoffSection(cutoffs) {
  if (!cutoffs.length) return `<section class="bg-white rounded-xl border border-slate-200 p-5"><div class="text-sm font-semibold text-slate-900">No upcoming cutoffs</div></section>`;
  return `
    <section class="bg-white rounded-xl border border-slate-200 p-5">
      <div class="flex items-center justify-between mb-4">
        <div>
          <div class="text-sm font-semibold text-slate-900">Upcoming cutoffs</div>
          <div class="text-xs text-slate-500">SI · VGM within 48h</div>
        </div>
      </div>
      <div class="space-y-3">
        ${cutoffs.map(
          (c) => `
          <div class="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition">
            <div>
              <div class="text-sm font-medium text-slate-800">${c.voyage}</div>
              <div class="text-[11px] text-slate-500 font-mono">POL ${c.port}</div>
            </div>
            <div class="flex flex-col items-end gap-1">
              <cutoff-timer deadline="${c.si}" label="SI cutoff"></cutoff-timer>
              <cutoff-timer deadline="${c.vgm}" label="VGM cutoff"></cutoff-timer>
            </div>
          </div>`
        ).join('')}
      </div>
    </section>
  `;
}

function demExposureCard() {
  return `
    <section class="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-5 text-white">
      <div class="text-xs uppercase tracking-wider text-slate-400 mb-1">DEM/DET exposure today</div>
      <div class="text-3xl font-bold tracking-tight">$0</div>
      <div class="text-xs text-slate-300 mt-1">Real data processing pending</div>
      <div class="mt-4 pt-4 border-t border-slate-700/60 grid grid-cols-2 gap-2 text-xs">
        <div>
          <div class="text-slate-400">Free time remaining</div>
          <div class="font-semibold mt-0.5">0 boxes</div>
        </div>
        <div>
          <div class="text-slate-400">Over free time</div>
          <div class="font-semibold mt-0.5 text-red-300">0 boxes</div>
        </div>
      </div>
    </section>
  `;
}

function renderChart(distribution) {
  const ctx = document.getElementById('dist-chart');
  if (!ctx || !window.Chart) return;
  new window.Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: distribution.map((s) => s.label),
      datasets: [{
        data: distribution.map((s) => s.value),
        backgroundColor: distribution.map((s) => s.color),
        borderWidth: 0,
      }],
    },
    options: {
      cutout: '70%',
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
      maintainAspectRatio: false,
    },
  });
}

export async function render(root) {
  const repo = window.__vdg_repo;
  let allShipments = [];
  if (repo) {
    allShipments = await repo.list('shipment', null);
  }

  // Calculate KPIs
  const activeShipments = allShipments.filter(s => !['Closed', 'Delivered'].includes(s.state || s.status));
  const kpis = [
    { label: 'Active Shipments', value: activeShipments.length, delta: 'Total active', tone: 'blue', icon: 'ship' },
    { label: 'Pending Documents', value: 0, delta: 'Real data NA', tone: 'amber', icon: 'doc' },
    { label: 'Open Exceptions', value: 0, delta: 'Real data NA', tone: 'red', icon: 'alert' },
    { label: 'Revenue MTD', value: 'N/A', delta: 'Requires PnL compute', tone: 'green', icon: 'dollar' },
  ];

  // Calculate Distribution
  const counts = { Created: 0, Booking: 0, InTransit: 0, Arrived: 0, Delivered: 0, Closed: 0 };
  for (const s of allShipments) {
    const st = s.state || s.status;
    if (st === 'Created') counts.Created++;
    else if (st === 'BookingConfirmed') counts.Booking++;
    else if (st === 'InTransit') counts.InTransit++;
    else if (st === 'Arrived') counts.Arrived++;
    else if (st === 'Delivered') counts.Delivered++;
    else if (st === 'Closed') counts.Closed++;
  }
  const distribution = [
    { label: 'Created', value: counts.Created, color: '#94a3b8' },
    { label: 'Booking', value: counts.Booking, color: '#3b82f6' },
    { label: 'In Transit', value: counts.InTransit, color: '#eab308' },
    { label: 'Arrived', value: counts.Arrived, color: '#22c55e' },
    { label: 'Delivered', value: counts.Delivered, color: '#14b8a6' },
    { label: 'Closed', value: counts.Closed, color: '#1f2937' },
  ];

  const exceptions = []; // Real data source not implemented yet
  const cutoffs = []; // Real data source not implemented yet

  root.innerHTML = `
    <div class="p-6 space-y-6 max-w-[1400px] mx-auto">
      ${kpiSection(kpis)}
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div class="xl:col-span-2 space-y-4">
          ${distributionSection(distribution)}
          ${exceptionSection(exceptions)}
        </div>
        <div class="space-y-4">
          ${demExposureCard()}
          ${cutoffSection(cutoffs)}
        </div>
      </div>
    </div>
  `;
  queueMicrotask(() => renderChart(distribution));
}
