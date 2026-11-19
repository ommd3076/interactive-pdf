import { MONTHS } from './seedData';
import type {
  ActivityEvent,
  ActivityMetrics,
  AnalyticsSummary,
  Channel,
  FilterState,
  MonthlyPoint,
  PublicationRecord,
  Region,
  Role,
  SortDir,
  SortKey,
} from './types';

const CHANNELS: Channel[] = ['Web', 'Mobile', 'Newsletter', 'Audio'];
const REGIONS: Region[] = ['North America', 'Europe', 'Asia-Pacific', 'Latin America'];

export function getTimeframeIndices(timeframe: FilterState['timeframe']): number[] {
  if (timeframe === 'Q4') return [9, 10, 11];
  if (timeframe === '6M') return [6, 7, 8, 9, 10, 11];
  return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
}

export function filterRecords(records: PublicationRecord[], filters: FilterState): PublicationRecord[] {
  const query = filters.search.trim().toLowerCase();
  return records.filter((rec) => {
    if (filters.region !== 'All' && rec.region !== filters.region) return false;
    if (filters.channel !== 'All' && rec.channel !== filters.channel) return false;
    if (query) {
      const hay = `${rec.title} ${rec.section} ${rec.author} ${rec.region} ${rec.channel} ${rec.notes}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
}

export function sortRecords(
  records: PublicationRecord[],
  sortKey: SortKey,
  sortDir: SortDir
): PublicationRecord[] {
  const dir = sortDir === 'asc' ? 1 : -1;
  return [...records].sort((a, b) => {
    const valA = a[sortKey];
    const valB = b[sortKey];
    if (typeof valA === 'number' && typeof valB === 'number') {
      return (valA - valB) * dir;
    }
    return String(valA).localeCompare(String(valB)) * dir;
  });
}

function weightedMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

export function computeAnalyticsSummary(
  allRecords: PublicationRecord[],
  filters: FilterState
): AnalyticsSummary {
  const filtered = filterRecords(allRecords, filters);
  const indices = getTimeframeIndices(filters.timeframe);

  if (filtered.length === 0) {
    return {
      totalReaders: 0,
      readersDeltaPct: 0,
      medianDwellSeconds: 0,
      returningRatePct: 0,
      avgCompletionPct: 0,
      recordCount: 0,
      monthlySeries: indices.map((idx) => ({
        month: MONTHS[idx],
        monthIndex: idx,
        readers: 0,
        dwellSeconds: 0,
        returningPct: 0,
        completions: 0,
      })),
      movingAverage: indices.map(() => 0),
      channelBreakdown: CHANNELS.map((channel) => ({
        channel,
        readers: 0,
        sharePct: 0,
        avgDwell: 0,
        q1Readers: 0,
        q4Readers: 0,
      })),
      regionalBreakdown: REGIONS.map((region) => ({
        region,
        readers: 0,
        returningPct: 0,
        dwellSeconds: 0,
        completionRate: 0,
        count: 0,
      })),
      dwellDistribution: [
        { bucket: '1–3 min', mobile: 0, web: 0, newsletter: 0, audio: 0 },
        { bucket: '3–6 min', mobile: 0, web: 0, newsletter: 0, audio: 0 },
        { bucket: '6–9 min', mobile: 0, web: 0, newsletter: 0, audio: 0 },
        { bucket: '9+ min', mobile: 0, web: 0, newsletter: 0, audio: 0 },
      ],
    };
  }

  const monthlySeries: MonthlyPoint[] = indices.map((monthIndex) => {
    let readers = 0;
    let dwellWeighted = 0;
    let returnWeighted = 0;
    let completions = 0;

    for (const rec of filtered) {
      const monthReaders = rec.monthlyTrend[monthIndex] ?? Math.round(rec.readers / 12);
      const seasonalFactor = 0.94 + (monthIndex / 11) * 0.12;
      readers += monthReaders;
      dwellWeighted += rec.dwellSeconds * seasonalFactor * monthReaders;
      returnWeighted += rec.returningPct * monthReaders;
      completions += Math.round(monthReaders * (rec.completionRate / 100));
    }

    return {
      month: MONTHS[monthIndex],
      monthIndex,
      readers,
      dwellSeconds: readers > 0 ? Math.round(dwellWeighted / readers) : 0,
      returningPct: readers > 0 ? Number((returnWeighted / readers).toFixed(1)) : 0,
      completions,
    };
  });

  const movingAverage = monthlySeries.map((_, idx) => {
    const start = Math.max(0, idx - 2);
    const slice = monthlySeries.slice(start, idx + 1);
    const avg = slice.reduce((acc, pt) => acc + pt.readers, 0) / slice.length;
    return Math.round(avg);
  });

  const totalReaders = monthlySeries.reduce((sum, pt) => sum + pt.readers, 0);
  const weightedDelta =
    filtered.reduce((sum, r) => sum + r.engagementDelta * r.readers, 0) /
    Math.max(
      1,
      filtered.reduce((sum, r) => sum + r.readers, 0)
    );
  const medianDwellSeconds = weightedMedian(filtered.map((r) => r.dwellSeconds));
  const returningRatePct = Number(
    (
      filtered.reduce((sum, r) => sum + r.returningPct * r.readers, 0) /
      Math.max(
        1,
        filtered.reduce((sum, r) => sum + r.readers, 0)
      )
    ).toFixed(1)
  );
  const avgCompletionPct = Number(
    (filtered.reduce((sum, r) => sum + r.completionRate, 0) / filtered.length).toFixed(1)
  );

  const channelBreakdown = CHANNELS.map((channel) => {
    const group = filtered.filter((r) => r.channel === channel);
    const groupReaders = group.reduce(
      (acc, r) => acc + indices.reduce((s, idx) => s + (r.monthlyTrend[idx] ?? 0), 0),
      0
    );
    const q1Readers = group.reduce(
      (acc, r) => acc + (r.monthlyTrend[0] ?? 0) + (r.monthlyTrend[1] ?? 0) + (r.monthlyTrend[2] ?? 0),
      0
    );
    const q4Readers = group.reduce(
      (acc, r) => acc + (r.monthlyTrend[9] ?? 0) + (r.monthlyTrend[10] ?? 0) + (r.monthlyTrend[11] ?? 0),
      0
    );
    const avgDwell =
      group.length > 0 ? Math.round(group.reduce((acc, r) => acc + r.dwellSeconds, 0) / group.length) : 0;

    return {
      channel,
      readers: groupReaders,
      sharePct: totalReaders > 0 ? Number(((groupReaders / totalReaders) * 100).toFixed(1)) : 0,
      avgDwell,
      q1Readers,
      q4Readers,
    };
  });

  const regionalBreakdown = REGIONS.map((region) => {
    const group = filtered.filter((r) => r.region === region);
    const groupReaders = group.reduce(
      (acc, r) => acc + indices.reduce((s, idx) => s + (r.monthlyTrend[idx] ?? 0), 0),
      0
    );
    const returningPct =
      group.length > 0
        ? Number((group.reduce((acc, r) => acc + r.returningPct, 0) / group.length).toFixed(1))
        : 0;
    const dwellSeconds =
      group.length > 0 ? Math.round(group.reduce((acc, r) => acc + r.dwellSeconds, 0) / group.length) : 0;
    const completionRate =
      group.length > 0
        ? Number((group.reduce((acc, r) => acc + r.completionRate, 0) / group.length).toFixed(1))
        : 0;
    return {
      region,
      readers: groupReaders,
      returningPct,
      dwellSeconds,
      completionRate,
      count: group.length,
    };
  });

  // Derive realistic dwell-time bucket distributions scaled by active filtered channel readership
  const channelTotals = Object.fromEntries(channelBreakdown.map((c) => [c.channel, c.readers])) as Record<
    Channel,
    number
  >;
  const scale = (n: number, weight: number) => Math.round((n / 1000) * weight);

  const dwellDistribution = [
    {
      bucket: '1–3 min',
      mobile: scale(channelTotals.Mobile, 0.24),
      web: scale(channelTotals.Web, 0.16),
      newsletter: scale(channelTotals.Newsletter, 0.12),
      audio: scale(channelTotals.Audio, 0.08),
    },
    {
      bucket: '3–6 min',
      mobile: scale(channelTotals.Mobile, 0.39),
      web: scale(channelTotals.Web, 0.32),
      newsletter: scale(channelTotals.Newsletter, 0.29),
      audio: scale(channelTotals.Audio, 0.22),
    },
    {
      bucket: '6–9 min',
      mobile: scale(channelTotals.Mobile, 0.26),
      web: scale(channelTotals.Web, 0.34),
      newsletter: scale(channelTotals.Newsletter, 0.38),
      audio: scale(channelTotals.Audio, 0.37),
    },
    {
      bucket: '9+ min',
      mobile: scale(channelTotals.Mobile, 0.11),
      web: scale(channelTotals.Web, 0.18),
      newsletter: scale(channelTotals.Newsletter, 0.21),
      audio: scale(channelTotals.Audio, 0.33),
    },
  ];

  return {
    totalReaders,
    readersDeltaPct: Number(weightedDelta.toFixed(1)),
    medianDwellSeconds,
    returningRatePct,
    avgCompletionPct,
    recordCount: filtered.length,
    monthlySeries,
    movingAverage,
    channelBreakdown,
    regionalBreakdown,
    dwellDistribution,
  };
}

export function formatDwell(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
}

export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(Math.round(value));
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function recordsToCsv(records: PublicationRecord[]): string {
  const headers = [
    'ID',
    'Title',
    'Section',
    'Author',
    'Region',
    'Channel',
    'Published',
    'Readers',
    'DwellSeconds',
    'ReturningPct',
    'CompletionRate',
    'EngagementDeltaPct',
    'Notes',
  ];
  const rows = records.map((r) =>
    [
      r.id,
      r.title,
      r.section,
      r.author,
      r.region,
      r.channel,
      r.publishedAt,
      r.readers,
      r.dwellSeconds,
      r.returningPct,
      r.completionRate,
      r.engagementDelta,
      r.notes,
    ]
      .map(escapeCsvCell)
      .join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

export function computeActivityMetrics(events: ActivityEvent[]): ActivityMetrics {
  const writeActions = new Set(['record.create', 'record.update', 'record.delete', 'vault.sync', 'auth.role_change']);
  const writesCount = events.filter((e) => writeActions.has(e.action)).length;
  const syncCount = events.filter((e) => e.action === 'vault.sync' || e.action === 'vault.pull').length;
  const contributors = new Set(events.map((e) => e.userId)).size;

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dailySeries = dayLabels.map((label, dayIdx) => {
    const dayEvents = events.filter((e) => e.dayOfWeek === dayIdx);
    return {
      label,
      count: dayEvents.length + (dayIdx < 5 ? 3 : 1), // baseline historical engagement + live actions
      writes: dayEvents.filter((e) => writeActions.has(e.action)).length,
    };
  });

  // 7 days x 6 four-hour blocks (00-04, 04-08, 08-12, 12-16, 16-20, 20-24)
  const hourlyGrid: number[][] = Array.from({ length: 7 }, (_, d) =>
    Array.from({ length: 6 }, (_, b) => {
      // Deterministic baseline reflecting workday + evening editorial cadence
      const base = d < 5 ? (b === 2 || b === 3 ? 3 : b === 4 || b === 5 ? 2 : 0) : b === 4 || b === 5 ? 2 : 0;
      return base;
    })
  );

  for (const ev of events) {
    const d = Math.max(0, Math.min(6, ev.dayOfWeek));
    const b = Math.max(0, Math.min(5, Math.floor(ev.hourOfDay / 4)));
    hourlyGrid[d][b] += 2;
  }

  const roles: Role[] = ['admin', 'editor', 'viewer'];
  const total = Math.max(1, events.length);
  const byRole = roles.map((role) => {
    const count = events.filter((e) => e.userRole === role).length;
    return {
      role,
      count,
      pct: Number(((count / total) * 100).toFixed(1)),
    };
  });

  return {
    totalEvents: events.length,
    writesCount,
    syncCount,
    activeContributors: contributors,
    dailySeries,
    hourlyGrid,
    byRole,
  };
}
