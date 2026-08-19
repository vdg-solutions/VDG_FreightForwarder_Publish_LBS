// Route → lazy view module map

export const VIEWS = {
  '/dashboard':       () => import('../implementations/ui/bootstrap/views/dashboard.js'),
  '/shipments':       () => import('../implementations/ui/bootstrap/views/shipments.js'),
  '/upload':          () => import('../implementations/ui/bootstrap/views/upload.js'),
  '/documents':       () => import('../implementations/ui/bootstrap/views/documents.js'),
  '/finance':         () => import('../implementations/ui/bootstrap/views/finance-dashboard.js'),
  '/finance/credit':  () => import('../implementations/ui/bootstrap/views/credit-dashboard.js'),
  '/finance/demdet':  () => import('../implementations/ui/bootstrap/views/demdet.js'),
  // '/shipments/new' — create a shipment, handled by tryParamRoute (app-router-ext.js) because it
  // reads ?sales= and ?quote_id= prefills; the static table here has no query hook.
  '/sales/me':        () => import('../implementations/ui/bootstrap/views/sales-me.js'),
'/sales/analytics':  () => import('../implementations/ui/bootstrap/views/sales-analytics.js'),
  '/sales/quote/new':  () => import('../implementations/ui/bootstrap/views/sales-quote-new.js'),
  '/sales/quote':      () => import('../implementations/ui/bootstrap/views/sales-quote-list.js'),
  '/masters/customers':() => import('../implementations/ui/bootstrap/views/masters-customers.js'),
  '/masters/carriers': () => import('../implementations/ui/bootstrap/views/masters-carriers.js'),
  '/masters/services': () => import('../implementations/ui/bootstrap/views/masters-services.js'),
  '/help':             () => import('../implementations/ui/bootstrap/views/help.js'),
  '/pending-access':   () => import('../implementations/ui/bootstrap/views/pending-access.js'),
  '/onboarding':       () => import('../implementations/ui/bootstrap/views/onboarding-wizard.js'),
  '/background-jobs':  () => import('../implementations/ui/bootstrap/views/background-jobs.js'),
  // Manager Workspace — E-14
  '/manager/dashboard':              () => import('../implementations/ui/bootstrap/views/manager/dashboard.js'),
  '/manager/pipeline':               () => import('../implementations/ui/bootstrap/views/manager/pipeline.js'),
  '/manager/approvals':              () => import('../implementations/ui/bootstrap/views/manager/approvals.js'),
  '/manager/reports/pnl':            () => import('../implementations/ui/bootstrap/views/manager/pnl-report.js'),
  '/manager/finance/cash-flow':      () => import('../implementations/ui/bootstrap/views/manager/cash-flow.js'),
  '/manager/finance/close-period':   () => import('../implementations/ui/bootstrap/views/manager/close-period.js'),
  '/manager/audit':                  () => import('../implementations/ui/bootstrap/views/manager/audit.js'),
  '/manager/notifications':          () => import('../implementations/ui/bootstrap/views/manager/notifications.js'),
  // E-14 batch-02
  '/manager/sales':                  () => import('../implementations/ui/bootstrap/views/manager/sales.js'),
  '/manager/finance/commissions':    () => import('../implementations/ui/bootstrap/views/manager/commissions.js'),
  '/manager/commission-rules':       () => import('../implementations/ui/bootstrap/views/manager/commission-rules.js'),
  '/manager/exceptions':             () => import('../implementations/ui/bootstrap/views/manager/exceptions.js'),
  // E-15
  '/manager/errors':             () => import('../implementations/ui/bootstrap/views/manager/errors.js'),
  '/manager/backup':             () => import('../implementations/ui/bootstrap/views/manager/backup.js'),
  '/manager/users':              () => import('../implementations/ui/bootstrap/views/manager/users.js'),
  // E-15 F-15-36
  '/manager/fx-rates':           () => import('../implementations/ui/bootstrap/views/manager/fx-rates.js'),
  '/manager/settings':           () => import('../implementations/ui/bootstrap/views/manager/settings.js'),
  // E-16 F-16-02
  '/manager/awb':                () => import('../implementations/ui/bootstrap/views/manager/awb.js'),
  // E-16 F-16-03
  '/masters/airports':           () => import('../implementations/ui/bootstrap/views/manager/masters/airports.js'),
  '/masters/flights':            () => import('../implementations/ui/bootstrap/views/manager/masters/flights.js'),
  '/masters/airline-carriers':   () => import('../implementations/ui/bootstrap/views/manager/masters/airline-carriers.js'),
  // E-26 F-26-04
  '/masters/ocean-carriers':     () => import('../implementations/ui/bootstrap/views/manager/masters/ocean-carriers.js'),
  // E-20 F-28-15
  '/masters/ocean-tariff':       () => import('../implementations/ui/bootstrap/views/manager/masters/ocean-tariff.js'),
  // E-16 F-16-04
  '/masters/uld-types':          () => import('../implementations/ui/bootstrap/views/manager/masters/uld-types.js'),
  '/manager/manifest':           () => import('../implementations/ui/bootstrap/views/manager/manifest.js'),
  // E-16 F-16-05
  '/masters/air-rates':          () => import('../implementations/ui/bootstrap/views/manager/masters/air-rates.js'),
  // E-25 / E-26 — sea-freight local charge masters
  '/masters/units-of-measure':   () => import('../implementations/ui/bootstrap/views/manager/masters/units-of-measure.js'),
  '/masters/local-charges':      () => import('../implementations/ui/bootstrap/views/manager/masters/local-charges.js'),
  // E-20 F-18-11 — shipment lifecycle-state alias registry, manager-only
  '/masters/shipment-states':    () => import('../implementations/ui/bootstrap/views/manager/masters/shipment-states.js'),
  '/quotes/air-calc':            () => import('../implementations/ui/bootstrap/views/quotes/air-calc.js'),
  // E-16 F-16-09
  '/manager/air-invoice':        () => import('../implementations/ui/bootstrap/views/manager/air-invoice.js'),
  // E-23 F-23-04
  '/accounting/ledger':          () => import('../implementations/ui/bootstrap/views/accounting/ledger-viewer.js'),
  // E-23 F-23-05
  '/accounting/reports':         () => import('../implementations/ui/bootstrap/views/accounting/reports.js'),
  '/accounting/settings':        () => import('../implementations/ui/bootstrap/views/accounting/settings.js'),
  // E-24 F-24-04
  '/admin/users':                () => import('../implementations/ui/bootstrap/views/admin/users-view.js'),
  // E-24 F-24-06
  '/admin/users/audit-log':      () => import('../implementations/ui/bootstrap/views/admin/user-audit-log-view.js'),
};
