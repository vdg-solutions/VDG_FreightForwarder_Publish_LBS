// i18n/ag-grid-locale.js — F-19-93: shared ag-grid localeText, locale-aware via t('grid.*').
// Views re-mount on 'vdg:locale-changed' (shipments.js, pnl-report.js, kanban, sidebar), so
// calling agGridLocaleText() at grid-init time always resolves the current locale. Property
// names below are ag-grid's own localeText contract — do not rename.
import { t } from './index.js';

// AC-06 key-completeness — one grid.* i18n key per ag-grid localeText property.
export const AG_GRID_LOCALE_KEYS = [
  'grid.noRowsToShow', 'grid.loadingOoo',
  'grid.page', 'grid.to', 'grid.of',
  'grid.nextPage', 'grid.previousPage', 'grid.firstPage', 'grid.lastPage', 'grid.pageSizeSelectorLabel',
  'grid.pinColumn', 'grid.pinLeft', 'grid.pinRight', 'grid.noPin',
  'grid.autosizeThisColumn', 'grid.autosizeAllColumns', 'grid.resetColumns',
  'grid.searchOoo', 'grid.filterOoo', 'grid.selectAll', 'grid.blanks',
  'grid.applyFilter', 'grid.resetFilter',
  'grid.equals', 'grid.notEqual', 'grid.contains', 'grid.notContains',
  'grid.startsWith', 'grid.endsWith', 'grid.blank', 'grid.notBlank',
  'grid.andCondition', 'grid.orCondition',
  'grid.sortAscending', 'grid.sortDescending',
];

// Call sites: pass this into every agGrid.Grid(...)/createGrid(...) options object as
// `localeText: agGridLocaleText()`. Wiring the 15 call sites is the area lanes' job (D2, PM scope).
export function agGridLocaleText() {
  return {
    noRowsToShow: t('grid.noRowsToShow'),
    loadingOoo: t('grid.loadingOoo'),
    page: t('grid.page'),
    to: t('grid.to'),
    of: t('grid.of'),
    nextPage: t('grid.nextPage'),
    previousPage: t('grid.previousPage'),
    firstPage: t('grid.firstPage'),
    lastPage: t('grid.lastPage'),
    pageSizeSelectorLabel: t('grid.pageSizeSelectorLabel'),
    pinColumn: t('grid.pinColumn'),
    pinLeft: t('grid.pinLeft'),
    pinRight: t('grid.pinRight'),
    noPin: t('grid.noPin'),
    autosizeThisColumn: t('grid.autosizeThisColumn'),
    autosizeAllColumns: t('grid.autosizeAllColumns'),
    resetColumns: t('grid.resetColumns'),
    searchOoo: t('grid.searchOoo'),
    filterOoo: t('grid.filterOoo'),
    selectAll: t('grid.selectAll'),
    blanks: t('grid.blanks'),
    applyFilter: t('grid.applyFilter'),
    resetFilter: t('grid.resetFilter'),
    equals: t('grid.equals'),
    notEqual: t('grid.notEqual'),
    contains: t('grid.contains'),
    notContains: t('grid.notContains'),
    startsWith: t('grid.startsWith'),
    endsWith: t('grid.endsWith'),
    blank: t('grid.blank'),
    notBlank: t('grid.notBlank'),
    andCondition: t('grid.andCondition'),
    orCondition: t('grid.orCondition'),
    sortAscending: t('grid.sortAscending'),
    sortDescending: t('grid.sortDescending'),
  };
}
