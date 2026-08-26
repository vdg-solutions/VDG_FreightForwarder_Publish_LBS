// rel-time.js — "3 minutes ago" style formatting, shared by the audit grid + activity feed.
import { dateFrom, nowMs } from '../ports/clock.js';

const _rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function relTime(iso) {
  if (!iso) return '—';
  const diff = (dateFrom(iso).getTime() - nowMs()) / 1000;
  if (Math.abs(diff) < 60)    return _rtf.format(Math.round(diff), 'second');
  if (Math.abs(diff) < 3600)  return _rtf.format(Math.round(diff / 60), 'minute');
  if (Math.abs(diff) < 86400) return _rtf.format(Math.round(diff / 3600), 'hour');
  return _rtf.format(Math.round(diff / 86400), 'day');
}
