// Breadcrumb resolver — pure fn, no DOM, no side effects

// i18n-keyed V1 sidebar + edit routes
const I18N_ROUTES = [
  { pattern: /^(#\/?)?$/,               group: 'nav.group.workspace', viewKey: 'nav.workspace.dashboard' },
  { pattern: /^#\/dashboard$/,           group: 'nav.group.workspace', viewKey: 'nav.workspace.dashboard' },
  { pattern: /^#\/shipments$/,           group: 'nav.group.workspace', viewKey: 'nav.workspace.shipments' },
  { pattern: /^#\/sales\/new$/,          group: 'nav.group.sales',     viewKey: 'nav.sales.create_shipment' },
  { pattern: /^#\/sales\/me$/,           group: 'nav.group.sales',     viewKey: 'nav.sales.my_shipments' },
  // F-37-03: creating a shipment belongs to the workspace, not to a rep's corner of it — CS opens
  // this screen too, and the old /sales/:salesId/pnl/new said the job was already somebody's.
  { pattern: /^#\/shipments\/new$/,      group: 'nav.group.workspace', viewKey: 'nav.sales.create_shipment' },
  { pattern: /^#\/sales\/edit\/(.+)$/,   group: 'nav.group.sales',     viewKey: 'nav.sales.edit_shipment', paramKey: 'ref' },
  { pattern: /^#\/masters\/customers$/,  group: 'nav.group.masters',   viewKey: 'nav.masters.customers' },
  { pattern: /^#\/masters\/ocean-carriers$/, group: 'nav.group.masters', viewKey: 'nav.masters.ocean_carriers' },
  { pattern: /^#\/manager\/reports\/pnl$/, group: 'nav.group.reports', viewKey: 'nav.reports.pnl_report' },
  // Same shape as the P&L route above (group 'nav.group.reports' = "Kế toán") — viewKey reuses
  // ledger-viewer.js's own page-heading key rather than nav.reports.ledger, which is a single
  // pre-combined "Kế toán / Sổ cái" string for the sidebar's one-line label, not a group/view pair.
  { pattern: /^#\/accounting\/ledger$/,  group: 'nav.group.reports', viewKey: 'ledger.title' },
  { pattern: /^#\/manager\/fx-rates$/,   group: 'nav.group.manager',   viewKey: 'nav.manager.fx_rates' },
  { pattern: /^#\/manager\/settings$/,   group: 'nav.group.manager',   viewKey: 'nav.manager.settings' },
  { pattern: /^#\/manager\/awb$/,        group: 'nav.group.manager',   viewKey: 'awb.admin.title' },
];

// Static legacy entries — real i18n key-ids like I18N_ROUTES above (F-19-74: these used to
// store English prose directly as the "key", which t()'s key-as-fallback echoed verbatim
// under vi — now every group/viewKey resolves through a real vi/en pair)
const STATIC_ROUTES = [
  { pattern: /^#\/upload$/,                        group: 'nav.group.workspace', viewKey: 'nav.workspace.excel_import' },
  { pattern: /^#\/sales\/quote\/new$/,              group: 'nav.group.sales',     viewKey: 'nav.sales.new_quote' },
  { pattern: /^#\/sales\/quote$/,                   group: 'nav.group.sales',     viewKey: 'nav.sales.quotations' },
  { pattern: /^#\/masters\/customers$/,             group: 'nav.group.masters',   viewKey: 'nav.masters.customers' },
  { pattern: /^#\/masters\/carriers$/,              group: 'nav.group.masters',   viewKey: 'nav.masters.carriers' },
  { pattern: /^#\/masters\/services$/,              group: 'nav.group.masters',   viewKey: 'nav.masters.services' },
  { pattern: /^#\/masters\/airports$/,              group: 'nav.group.masters',   viewKey: 'nav.masters.airports' },
  { pattern: /^#\/masters\/flights$/,               group: 'nav.group.masters',   viewKey: 'nav.masters.flights' },
  { pattern: /^#\/masters\/airline-carriers$/,      group: 'nav.group.masters',   viewKey: 'nav.masters.airline_carriers' },
  { pattern: /^#\/masters\/uld-types$/,             group: 'nav.group.masters',   viewKey: 'nav.masters.uld_types' },
  { pattern: /^#\/masters\/air-rates$/,             group: 'nav.group.masters',   viewKey: 'nav.masters.air_rates' },
  { pattern: /^#\/quotes\/air-calc$/,               group: 'nav.group.quotes',    viewKey: 'nav.quotes.air_calc' },
  { pattern: /^#\/manager\/manifest$/,              group: 'nav.group.manager',   viewKey: 'nav.manager.manifest' },
  { pattern: /^#\/manager\/air-invoice$/,           group: 'nav.group.manager',   viewKey: 'nav.manager.air_invoice' },
  { pattern: /^#\/help$/,                           group: 'nav.group.workspace', viewKey: 'nav.workspace.help' },
  { pattern: /^#\/manager\/dashboard$/,             group: 'nav.group.manager',   viewKey: 'nav.manager.workspace' },
  { pattern: /^#\/manager\/pipeline$/,              group: 'nav.group.manager',   viewKey: 'nav.manager.pipeline' },
  { pattern: /^#\/manager\/approvals$/,             group: 'nav.group.manager',   viewKey: 'nav.manager.approvals' },
  { pattern: /^#\/manager\/finance\/cash-flow$/,    group: 'nav.group.manager',   viewKey: 'nav.manager.cash_flow' },
  { pattern: /^#\/manager\/finance\/close-period$/, group: 'nav.group.manager',   viewKey: 'nav.manager.close_period' },
  { pattern: /^#\/manager\/finance\/self-approved-review$/, group: 'nav.group.manager', viewKey: 'nav.manager.self_approved_review' },
  { pattern: /^#\/manager\/audit$/,                 group: 'nav.group.manager',   viewKey: 'nav.manager.audit' },
  { pattern: /^#\/manager\/notifications$/,         group: 'nav.group.manager',   viewKey: 'nav.manager.notifications' },
  { pattern: /^#\/manager\/sales$/,                 group: 'nav.group.manager',   viewKey: 'nav.manager.sales_perf' },
  { pattern: /^#\/manager\/finance\/commissions$/,  group: 'nav.group.manager',   viewKey: 'nav.manager.commissions' },
  { pattern: /^#\/manager\/exceptions$/,            group: 'nav.group.manager',   viewKey: 'nav.manager.exceptions' },
  { pattern: /^#\/manager\/masters\/customers$/,    group: 'nav.group.manager',   viewKey: 'nav.manager.customer_master' },
  { pattern: /^#\/manager\/masters\/carriers$/,     group: 'nav.group.manager',   viewKey: 'nav.manager.carrier_master' },
  { pattern: /^#\/manager\/masters\/users$/,        group: 'nav.group.manager',   viewKey: 'nav.manager.user_master' },
  { pattern: /^#\/manager\/errors$/,                group: 'nav.group.manager',   viewKey: 'nav.manager.errors' },
];

export const ROUTES = [...I18N_ROUTES, ...STATIC_ROUTES];

const FALLBACK_GROUP = 'nav.group.workspace';
const FALLBACK_VIEW  = 'nav.workspace.dashboard';

/**
 * @param {string} hash - location.hash (e.g. '#/sales/me')
 * @param {string} _locale - current locale (reserved; t() is already locale-aware)
 * @param {function} t - i18n fn: key → string (key-as-fallback for missing keys)
 * @returns {{ group: string, view: string }}
 */
export function resolveBreadcrumb(hash, _locale, t) {
  // Every pattern is anchored with $, so a query string used to drop the route to the fallback —
  // `#/shipments/new?sales=nv01` showed "Dashboard". Pre-existing, and F-37-03 made it the common
  // case by moving the rep out of the path and into the query. Strip it once, for all routes.
  const h = (hash == null ? '' : String(hash)).split('?')[0];
  for (const route of ROUTES) {
    const m = h.match(route.pattern);
    if (m) {
      let view = t(route.viewKey);
      if (route.paramKey && m[1]) view = view.replace(`{${route.paramKey}}`, m[1]);
      return { group: t(route.group), view };
    }
  }
  return { group: t(FALLBACK_GROUP), view: t(FALLBACK_VIEW) };
}
