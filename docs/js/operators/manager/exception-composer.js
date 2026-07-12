// Pure compute — exception sorting, trends, MTTR, per-sales rate. No DOM, no I/O.

const SEVERITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const SLA_HOURS_CRITICAL = 4;
const SLA_HOURS_HIGH     = 24;
const SLA_HOURS_MEDIUM   = 72;
const SLA_HOURS_LOW      = 168;
const TREND_WEEKS        = 8;
const TREND_MAX_TYPES    = 6;
const KIND_EXCEPTION     = 'exception';

const SLA_RED_THRESHOLD_MS   = 3_600_000;       // < 1h
const MS_PER_HOUR            = 3_600_000;
const MS_PER_DAY             = 86_400_000;
const MS_PER_WEEK            = 604_800_000;

const SEVERITY_SEQUENCE = ['Low', 'Medium', 'High', 'Critical'];

const SEVERITY_BADGE_CLS = {
  Critical: 'bg-red-100 text-red-700',
  High:     'bg-orange-100 text-orange-700',
  Medium:   'bg-amber-100 text-amber-700',
  Low:      'bg-slate-100 text-slate-600',
};

function slaCap(severity) {
  switch (severity) {
    case 'Critical': return SLA_HOURS_CRITICAL;
    case 'High':     return SLA_HOURS_HIGH;
    case 'Medium':   return SLA_HOURS_MEDIUM;
    default:         return SLA_HOURS_LOW;
  }
}

function slaStatus(remainingMs, totalMs) {
  if (remainingMs < SLA_RED_THRESHOLD_MS) return 'red';
  if (remainingMs < totalMs * 0.25)       return 'amber';
  return 'green';
}

/**
 * @param {object[]} exceptions  raw L2 entities
 * @returns {object[]} ExceptionVm[]
 */
export function computeSortedExceptions(exceptions) {
  const now = Date.now();
  return exceptions
    .filter((e) => (e.state || e.State || '') !== 'Closed')
    .map((e) => {
      const severity     = e.severity || 'Low';
      const hours        = slaCap(severity);
      const totalMs      = hours * MS_PER_HOUR;
      const raised       = new Date(e.raised_at || e.created_at || now).getTime();
      const deadline     = raised + totalMs;
      const remainingMs  = deadline - now;
      return {
        ...e,
        slaRemainingMs: remainingMs,
        slaStatus:      slaStatus(remainingMs, totalMs),
        _severityOrder: SEVERITY_ORDER[severity] ?? 99,
      };
    })
    .sort((a, b) => a._severityOrder - b._severityOrder);
}

/**
 * @returns {{ weeks: string[], datasets: Array<{label:string, data:number[]}> }}
 */
export function computeTrends(exceptions) {
  const now = Date.now();
  const weekStarts = [];
  for (let i = TREND_WEEKS - 1; i >= 0; i--) {
    weekStarts.push(now - i * MS_PER_WEEK);
  }

  // Count volume per type
  const typeVolume = {};
  for (const e of exceptions) {
    const t = e.type || 'Other';
    typeVolume[t] = (typeVolume[t] || 0) + 1;
  }
  const topTypes = Object.entries(typeVolume)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TREND_MAX_TYPES)
    .map(([t]) => t);

  const typeSet = new Set(topTypes);
  const labels = weekStarts.map((t) => {
    const d = new Date(t);
    return `W${TREND_WEEKS - weekStarts.indexOf(t)} (${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })})`;
  });

  const datasets = [...topTypes, 'Other'].map((label) => ({
    label,
    data: weekStarts.map((wStart, i) => {
      const wEnd = wStart + MS_PER_WEEK;
      return exceptions.filter((e) => {
        const t   = new Date(e.raised_at || e.created_at || 0).getTime();
        const typ = typeSet.has(e.type || '') ? (e.type || 'Other') : 'Other';
        return t >= wStart && t < wEnd && typ === label;
      }).length;
    }),
  }));

  return { weeks: labels, datasets };
}

/**
 * @returns {Array<{type:string, avgHours:number}>}
 */
export function computeMttr(exceptions) {
  const typeMap = new Map();
  for (const e of exceptions) {
    if (!e.resolved_at && !e.closed_at) continue;
    const type     = e.type || 'Unknown';
    const start    = new Date(e.raised_at || e.created_at || 0).getTime();
    const end      = new Date(e.resolved_at || e.closed_at).getTime();
    const hours    = (end - start) / MS_PER_HOUR;
    if (!typeMap.has(type)) typeMap.set(type, { total: 0, count: 0 });
    const row = typeMap.get(type);
    row.total += hours;
    row.count += 1;
  }
  return [...typeMap.entries()].map(([type, d]) => ({
    type,
    avgHours: d.count > 0 ? Math.round(d.total / d.count) : 0,
  }));
}

/**
 * @returns {Array<{salesRep:string, open:number, closedThisPeriod:number, avgResolutionHours:number}>}
 */
export function computePerSalesRate(exceptions) {
  const repMap = new Map();
  const now    = Date.now();
  const periodStart = now - 30 * MS_PER_DAY;

  for (const e of exceptions) {
    const rep = e.owner || e.assigned_to || '—';
    if (!repMap.has(rep)) repMap.set(rep, { open: 0, closed: 0, totalHours: 0 });
    const row = repMap.get(rep);
    const closed = (e.state || e.State || '') === 'Closed';
    if (!closed) {
      row.open += 1;
    } else {
      const closedAt = new Date(e.closed_at || e.resolved_at || 0).getTime();
      if (closedAt >= periodStart) {
        row.closed += 1;
        const raised = new Date(e.raised_at || e.created_at || 0).getTime();
        row.totalHours += (closedAt - raised) / MS_PER_HOUR;
      }
    }
  }

  return [...repMap.entries()].map(([rep, d]) => ({
    salesRep:           rep,
    open:               d.open,
    closedThisPeriod:   d.closed,
    avgResolutionHours: d.closed > 0 ? Math.round(d.totalHours / d.closed) : 0,
  }));
}

/**
 * Returns next severity level, capped at Critical.
 */
export function computeEscalated(severity) {
  const idx = SEVERITY_SEQUENCE.indexOf(severity);
  if (idx < 0) return 'Low';
  return SEVERITY_SEQUENCE[Math.min(idx + 1, SEVERITY_SEQUENCE.length - 1)];
}

export { SEVERITY_ORDER, SLA_HOURS_CRITICAL, SLA_HOURS_HIGH, SLA_HOURS_MEDIUM, SLA_HOURS_LOW, TREND_WEEKS, TREND_MAX_TYPES, KIND_EXCEPTION, SEVERITY_BADGE_CLS };
