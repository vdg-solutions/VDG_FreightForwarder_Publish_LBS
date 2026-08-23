import { apiFetch } from '../../core_abstractions/backend.js';
import { ApiError } from '../../core_abstractions/api-error.js';
import { DriveApiError } from '../../core_abstractions/drive-errors.js';
import { classifyDriveError } from '../../core_abstractions/drive-error-classifier.js';

const HTTP_OK           = 200;
const HTTP_NO_CONTENT   = 204;
const HTTP_NOT_FOUND    = 404;
const HTTP_BAD_REQUEST  = 400;
const SYNTHETIC_QUOTA   = '1099511627776';

let _me = null;
async function _meCached() {
  if (!_me) _me = await apiFetch('GET', '/me');
  return _me;
}

class ShimResponse {
  constructor(status, body, headers = {}) {
    this.status     = status;
    this.ok         = status >= HTTP_OK && status < 300;
    this.statusText = String(status);
    this._body      = body;
    this._headers   = headers;
    this.headers    = { get: (k) => this._headers[String(k).toLowerCase()] ?? null };
  }
  async text() { return typeof this._body === 'string' ? this._body : JSON.stringify(this._body ?? ''); }
  async json() { return typeof this._body === 'string' ? JSON.parse(this._body) : this._body; }
}

export async function handle(method, path, body = undefined, extraHeaders = {}) {
  const url = new URL(path.startsWith('http') ? path : `https://drive.local${path}`);
  const p   = url.pathname.replace(/^\/(upload\/)?drive\/v3/, '');
  const seg = p.split('/').filter(Boolean);

  try {
    if (seg[0] === 'about') {
      const me = await _meCached();
      return ok({ storageQuota: { limit: SYNTHETIC_QUOTA, usage: '0', usageInDrive: '0' }, user: { emailAddress: me.email } });
    }
    
    return fail(HTTP_BAD_REQUEST, `unsupported in native CharterDB mode: ${method} ${p}`);
  } catch (err) {
    if (err instanceof ApiError) {
      return { status: err.status, body: { error: { code: err.status, message: err.message, errors: [{ message: err.message, reason: err.status === HTTP_NOT_FOUND ? 'notFound' : 'forbidden' }] } }, headers: {} };
    }
    throw err;
  }
}

function ok(body, headers = {}) { return { status: HTTP_OK, body, headers }; }
function fail(status, message) { return { status, body: { error: { code: status, message } }, headers: {} }; }

export async function fetchRaw(method, path, body, extraHeaders) {
  const r = await handle(method, path, body, extraHeaders);
  return new ShimResponse(r.status, r.body, { 'content-type': typeof r.body === 'string' ? 'text/plain' : 'application/json', ...r.headers });
}

export async function fetchJson(method, path, body) {
  return await handle(method, path, body);
}

export function _resetShim() { _me = null; }

const HTTP_UNAUTHORIZED = 401;

async function driveFetch(method, path, body = undefined) {
  const r = await handle(method, path, body);
  if (r.status >= 200 && r.status < 300) return r.body === '' ? {} : r.body;
  const error = new DriveApiError(r.status, `Drive API ${r.status}: ${JSON.stringify(r.body)}`);
  if (r.status === HTTP_UNAUTHORIZED) window.dispatchEvent(new CustomEvent('vdg:auth-needs-reconnect'));
  error.driveErrorKind = classifyDriveError(error);
  throw error;
}

const driveFetchRaw = fetchRaw;

export const serverTransport = { driveFetch, driveFetchRaw };
