// route-prefetch — port: warm the local tier with the window the dashboard is about to read, off
// the render path. Fire-and-forget: a prefetch that cannot read is not a boot failure.

let _impl = null;

/// Root bootstrap binds { prefetchDashboard } once.
export function bindRoutePrefetch(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/route-prefetch: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (repo) -> Promise<void>
export const prefetchDashboard = (...a) => _i().prefetchDashboard(...a);
