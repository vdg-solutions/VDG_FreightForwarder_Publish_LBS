// Breadcrumb resolver — pure fn, no DOM, no side effects

// i18n-keyed V1 sidebar + edit routes
const I18N_ROUTES = [
  { pattern: /^(#\/?)?$/,               group: 'nav.group.workspace', viewKey: 'nav.workspace.dashboard' },
  { pattern: /^#\/dashboard$/,           group: 'nav.group.workspace', viewKey: 'nav.workspace.dashboard' },
  { pattern: /^#\/shipments$/,           group: 'nav.group.workspace', viewKey: 'nav.workspace.shipments' },
  { pattern: /^#\/sales\/new$/,          group: 'nav.group.sales',     viewKey: 'nav.sales.create_pnl' },
  { pattern: /^#\/sales\/me$/,           group: 'nav.group.sales',     viewKey: 'nav.sales.my_pnl' },
  { pattern: /^#\/sales\/edit\/(.+)$/,   group: 'nav.group.sales',     viewKey: 'nav.sales.edit_pnl', paramKey: 'ref' },
  { pattern: /^#\/masters\/customers$/,  group: 'nav.group.masters',   viewKey: 'nav.masters.customers' },
  { pattern: /^#\/manager\/reports\/pnl$/, group: 'nav.group.reports', viewKey: 'nav.reports.pnl_report' },
  { pattern: /^#\/manager\/fx-rates$/,   group: 'nav.group.manager',   viewKey: 'nav.manager.fx_rates' },
  { pattern: /^#\/manager\/settings$/,   group: 'nav.group.manager',   viewKey: 'nav.manager.settings' },
  { pattern: /^#\/manager\/awb$/,        group: 'nav.group.manager',   viewKey: 'awb.admin.title' },
];

// Static legacy entries — t() key-as-fallback returns labels unchanged (pending i18n migration)
const STATIC_ROUTES = [
  { pattern: /^#\/upload$/,                        group: 'Workspace', viewKey: 'Excel Import' },
  { pattern: /^#\/sales\/quote\/new$/,              group: 'Sales',     viewKey: 'New Quote' },
  { pattern: /^#\/sales\/quote$/,                   group: 'Sales',     viewKey: 'Quotations' },
  { pattern: /^#\/masters\/customers$/,             group: 'Masters',   viewKey: 'Masters · Customers' },
  { pattern: /^#\/masters\/carriers$/,              group: 'Masters',   viewKey: 'Masters · Carriers' },
  { pattern: /^#\/masters\/services$/,              group: 'Masters',   viewKey: 'Masters · Services' },
  { pattern: /^#\/masters\/airports$/,              group: 'Masters',   viewKey: 'Masters · Airports' },
  { pattern: /^#\/masters\/flights$/,               group: 'Masters',   viewKey: 'Masters · Flights' },
  { pattern: /^#\/masters\/airline-carriers$/,      group: 'Masters',   viewKey: 'Masters · Airline Carriers' },
  { pattern: /^#\/masters\/uld-types$/,             group: 'Masters',   viewKey: 'Masters · ULD Types' },
  { pattern: /^#\/masters\/air-rates$/,             group: 'Masters',   viewKey: 'Masters · Air Rates' },
  { pattern: /^#\/quotes\/air-calc$/,               group: 'Quotes',    viewKey: 'Air Freight Calculator' },
  { pattern: /^#\/manager\/manifest$/,              group: 'Manager',   viewKey: 'ULD Manifest' },
  { pattern: /^#\/manager\/air-invoice$/,           group: 'Manager',   viewKey: 'Air Invoice' },
  { pattern: /^#\/help$/,                           group: 'Workspace', viewKey: 'Help' },
  { pattern: /^#\/manager\/dashboard$/,             group: 'Manager',   viewKey: 'Manager Workspace' },
  { pattern: /^#\/manager\/pipeline$/,              group: 'Manager',   viewKey: 'Pipeline' },
  { pattern: /^#\/manager\/approvals$/,             group: 'Manager',   viewKey: 'Approval Queue' },
  { pattern: /^#\/manager\/finance\/cash-flow$/,    group: 'Manager',   viewKey: 'Cash Flow & AR' },
  { pattern: /^#\/manager\/finance\/close-period$/, group: 'Manager',   viewKey: 'Period Close' },
  { pattern: /^#\/manager\/audit$/,                 group: 'Manager',   viewKey: 'Audit Log' },
  { pattern: /^#\/manager\/notifications$/,         group: 'Manager',   viewKey: 'Notifications' },
  { pattern: /^#\/manager\/sales$/,                 group: 'Manager',   viewKey: 'Sales Performance' },
  { pattern: /^#\/manager\/finance\/commissions$/,  group: 'Manager',   viewKey: 'Commission Settlement' },
  { pattern: /^#\/manager\/exceptions$/,            group: 'Manager',   viewKey: 'Exception Center' },
  { pattern: /^#\/manager\/masters\/customers$/,    group: 'Manager',   viewKey: 'Customer Master' },
  { pattern: /^#\/manager\/masters\/carriers$/,     group: 'Manager',   viewKey: 'Carrier Master' },
  { pattern: /^#\/manager\/masters\/users$/,        group: 'Manager',   viewKey: 'User Master' },
  { pattern: /^#\/manager\/errors$/,                group: 'Manager',   viewKey: 'Error Log' },
  { pattern: /^#\/manager\/dunning$/,               group: 'Manager',   viewKey: 'AR Dunning' },
  { pattern: /^#\/manager\/dunning-templates$/,     group: 'Manager',   viewKey: 'Dunning Templates' },
];

const ROUTES = [...I18N_ROUTES, ...STATIC_ROUTES];

const FALLBACK_GROUP = 'nav.group.workspace';
const FALLBACK_VIEW  = 'nav.workspace.dashboard';

/**
 * @param {string} hash - location.hash (e.g. '#/sales/drop')
 * @param {string} _locale - current locale (reserved; t() is already locale-aware)
 * @param {function} t - i18n fn: key → string (key-as-fallback for missing keys)
 * @returns {{ group: string, view: string }}
 */
export function resolveBreadcrumb(hash, _locale, t) {
  const h = hash == null ? '' : String(hash);
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
