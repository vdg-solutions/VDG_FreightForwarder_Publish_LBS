// Pure compute helpers for sales analytics dashboard.
// Replaced by WASM (Rust) implementation for performance and architecture constraints.

const COMMISSION_PCT = 0.10;

function getWasm() {
  const wasm = window.__vdg_wasm;
  if (!wasm || !wasm.wasm_compute_sales_analytics) {
    throw new Error('WASM module not loaded or wasm_compute_sales_analytics not found');
  }
  return wasm;
}

export function computeKpis(shipments, lines) {
  const wasm = getWasm();
  const res = wasm.wasm_compute_sales_analytics(JSON.stringify(shipments), JSON.stringify(lines));
  return res.kpis;
}

export function computeLeaderboard(shipments, lines) {
  const wasm = getWasm();
  const res = wasm.wasm_compute_sales_analytics(JSON.stringify(shipments), JSON.stringify(lines));
  return res.leaderboard;
}

export function computeTopCustomers(shipments, lines, n = 10) {
  const wasm = getWasm();
  const res = wasm.wasm_compute_sales_analytics(JSON.stringify(shipments), JSON.stringify(lines));
  // The rust impl truncates to 10 by default, let's slice it to n just in case
  return res.top_customers.slice(0, n);
}

export function computeLaneHeatmap(shipments, lines) {
  const wasm = getWasm();
  const res = wasm.wasm_compute_sales_analytics(JSON.stringify(shipments), JSON.stringify(lines));
  return res.heatmap;
}

export function computeMonthlyBars(shipments, lines, months = 12) {
  const wasm = getWasm();
  const res = wasm.wasm_compute_sales_analytics(JSON.stringify(shipments), JSON.stringify(lines));
  // Rust impl returns 12 months by default, slice to match if needed
  return {
    labels: res.monthly_bars.labels.slice(-months),
    revenue: res.monthly_bars.revenue.slice(-months),
    cost: res.monthly_bars.cost.slice(-months),
  };
}

export function computeBillingFunnel(shipments) {
  const wasm = getWasm();
  const res = wasm.wasm_compute_sales_analytics(JSON.stringify(shipments), "[]");
  return res.billing_funnel;
}

export { COMMISSION_PCT };
