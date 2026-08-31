// Is a given view still the one on screen?
//
// Views that survive their own render() — a `vdg:locale-changed` or `vdg:entity-changed` listener
// kept in a module-level handle — re-resolve `#view-root` at FIRE time on purpose: freshViewRoot()
// (F-19-16) swaps that node on navigation, so re-rendering into the captured one is a silent
// no-op. The cost of resolving it live is that the handler will happily paint ITS view into
// whatever view is mounted now, and those handlers are only ever removed by a LATER render() of
// the same view — so one visit arms them for the rest of the session.
//
// What that shipped as: sit on /shipments, open "Tạo lô hàng mới", start typing the P&L, and the
// next delta tick carrying any shipment change — another user's save, 30 seconds away — repainted
// the list straight over the half-filled form. Unsaved work gone, from no action of the user's.
//
// Compared EXACTLY, never by prefix: the create form is `/shipments/new`, which a `startsWith`
// test would wrongly report as "the list is still mounted". The query string is dropped because
// `/shipments/new?sales=me` and `/shipments/new` are the same view.
export function isMountedRoute(ownRoute) {
  return (location.hash.slice(1).split('?')[0] || '') === ownRoute;
}
