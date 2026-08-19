// Dev-only debug overlay gate. True on localhost/loopback or a file: page.
const DEV_HOST_RE = /^(localhost|127\.0\.0\.1|\[::1\])$/;

export function isDevHost(hostname, protocol) {
  return DEV_HOST_RE.test(hostname) || protocol === 'file:';
}
