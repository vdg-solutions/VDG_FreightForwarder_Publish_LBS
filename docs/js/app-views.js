// Route → lazy view module map

export const VIEWS = {
  '/dashboard':       () => import('./views/dashboard.js'),
  '/shipments':       () => import('./views/shipments.js'),
  '/upload':          () => import('./views/upload.js'),
  '/documents':       () => import('./views/documents.js'),
  '/finance':         () => import('./views/finance-dashboard.js'),
  '/finance/credit':  () => import('./views/credit-dashboard.js'),
  '/finance/demdet':  () => import('./views/demdet.js'),
  '/sales/drop':      () => import('./views/sales-drop.js'),
  // '/sales/:salesId/pnl/new' — create PNL, handled by tryParamRoute (app-router-ext.js)
  '/sales/me':        () => import('./views/sales-me.js'),
'/sales/analytics':  () => import('./views/sales-analytics.js'),
  '/sales/quote/new':  () => import('./views/sales-quote-new.js'),
  '/sales/quote':      () => import('./views/sales-quote-list.js'),
  '/masters/customers':() => import('./views/masters-customers.js'),
  '/masters/carriers': () => import('./views/masters-carriers.js'),
  '/masters/services': () => import('./views/masters-services.js'),
  '/help':             () => import('./views/help.js'),
  '/onboarding':       () => import('./views/onboarding-wizard.js'),
  '/background-jobs':  () => import('./views/background-jobs.js'),
  // Manager Workspace — E-14
  '/manager/dashboard':              () => import('./views/manager/dashboard.js'),
  '/manager/pipeline':               () => import('./views/manager/pipeline.js'),
  '/manager/approvals':              () => import('./views/manager/approvals.js'),
  '/manager/reports/pnl':            () => import('./views/manager/pnl-report.js'),
  '/manager/finance/cash-flow':      () => import('./views/manager/cash-flow.js'),
  '/manager/finance/close-period':   () => import('./views/manager/close-period.js'),
  '/manager/audit':                  () => import('./views/manager/audit.js'),
  '/manager/notifications':          () => import('./views/manager/notifications.js'),
  // E-14 batch-02
  '/manager/sales':                  () => import('./views/manager/sales.js'),
  '/manager/finance/commissions':    () => import('./views/manager/commissions.js'),
  '/manager/commission-rules':       () => import('./views/manager/commission-rules.js'),
  '/manager/exceptions':             () => import('./views/manager/exceptions.js'),
  // E-14 batch-04
  '/manager/onboarding':             () => import('./views/manager/onboarding.js'),
  // E-15
  '/manager/errors':             () => import('./views/manager/errors.js'),
  '/manager/dunning':            () => import('./views/manager/dunning.js'),
  '/manager/dunning-templates':  () => import('./views/manager/dunning-templates.js'),
  '/manager/backup':             () => import('./views/manager/backup.js'),
  '/manager/users':              () => import('./views/manager/users.js'),
  // E-15 F-15-36
  '/manager/fx-rates':           () => import('./views/manager/fx-rates.js'),
  '/manager/settings':           () => import('./views/manager/settings.js'),
  // E-16 F-16-02
  '/manager/awb':                () => import('./views/manager/awb.js'),
  // E-16 F-16-03
  '/masters/airports':           () => import('./views/manager/masters/airports.js'),
  '/masters/flights':            () => import('./views/manager/masters/flights.js'),
  '/masters/airline-carriers':   () => import('./views/manager/masters/airline-carriers.js'),
  // E-26 F-26-04
  '/masters/ocean-carriers':     () => import('./views/manager/masters/ocean-carriers.js'),
  // E-16 F-16-04
  '/masters/uld-types':          () => import('./views/manager/masters/uld-types.js'),
  '/manager/manifest':           () => import('./views/manager/manifest.js'),
  // E-16 F-16-05
  '/masters/air-rates':          () => import('./views/manager/masters/air-rates.js'),
  // E-25 / E-26 — sea-freight local charge masters
  '/masters/units-of-measure':   () => import('./views/manager/masters/units-of-measure.js'),
  '/masters/local-charges':      () => import('./views/manager/masters/local-charges.js'),
  '/quotes/air-calc':            () => import('./views/quotes/air-calc.js'),
  // E-16 F-16-09
  '/manager/air-invoice':        () => import('./views/manager/air-invoice.js'),
  // E-23 F-23-04
  '/accounting/ledger':          () => import('./views/accounting/ledger-viewer.js'),
  // E-23 F-23-05
  '/accounting/reports':         () => import('./views/accounting/reports.js'),
  // E-24 F-24-04
  '/admin/users':                () => import('./views/admin/users-view.js'),
  // E-24 F-24-06
  '/admin/users/audit-log':      () => import('./views/admin/user-audit-log-view.js'),
};
