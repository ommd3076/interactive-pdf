import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useEngine } from '../context/EngineContext';
import { ROLE_META } from '../engine/rbac';
import type { Role } from '../engine/types';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const BLOCK_LABELS = ['00–04', '04–08', '08–12', '12–16', '16–20', '20–24'];

export const ActivityView: React.FC = () => {
  const { state, activityMetrics, can } = useEngine();
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');

  const filteredEvents = useMemo(() => {
    if (roleFilter === 'all') return state.activity;
    return state.activity.filter((e) => e.userRole === roleFilter);
  }, [state.activity, roleFilter]);

  const canAuditExport = can('activity:audit');

  const handleExportAudit = () => {
    if (!canAuditExport) return;
    const blob = new Blob([JSON.stringify(filteredEvents, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'meridian-activity-audit.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Daily velocity SVG dimensions
  const W = 540;
  const H = 210;
  const pad = { top: 20, right: 16, bottom: 32, left: 36 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const maxDaily = Math.max(5, ...activityMetrics.dailySeries.map((d) => d.count)) * 1.15;

  const maxHeat = Math.max(1, ...activityMetrics.hourlyGrid.flat());

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-stone-200 dark:border-slate-800">
        <div>
          <p className="text-xs text-stone-500 dark:text-slate-400">
            User Activity & Engagement Trends · Live Encrypted Audit Ledger
          </p>
          <h1 className="mt-1 font-editorial text-3xl sm:text-4xl font-medium text-stone-950 dark:text-white">
            Team Activity & Engagement Metrics
          </h1>
        </div>
        <button
          type="button"
          disabled={!canAuditExport}
          onClick={handleExportAudit}
          title={canAuditExport ? 'Download full activity audit JSON' : 'Audit export requires Admin role'}
          className={`inline-flex items-center gap-1.5 h-10 px-4 rounded-md border text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
            canAuditExport
              ? 'border-stone-300 dark:border-slate-700 bg-white dark:bg-[#131821] text-stone-800 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer'
              : 'border-stone-200 dark:border-slate-800 text-stone-400 dark:text-slate-500 cursor-not-allowed'
          }`}
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Export Audit JSON
        </button>
      </div>

      {/* 4-Column Activity Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-stone-200 dark:bg-slate-800 border border-stone-200 dark:border-slate-800 rounded-lg overflow-hidden">
        <StatBox label="Tracked Interactions" value={String(activityMetrics.totalEvents)} detail="Captured in encrypted vault" />
        <StatBox label="Vault Mutations" value={String(activityMetrics.writesCount)} detail="Creates, edits, sync pushes" />
        <StatBox label="Edge KV Syncs" value={String(activityMetrics.syncCount)} detail={`${state.telemetry.coalescedWritesSaved} redundant writes saved`} />
        <StatBox label="Active Contributors" value={String(activityMetrics.activeContributors)} detail="Authenticated workspace roles" />
      </div>

      {/* 2-Column Visual Activity Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Daily Activity Velocity Bar/Line Chart */}
        <section className="lg:col-span-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-[#131821] p-6">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="font-editorial text-xl font-medium text-stone-950 dark:text-white">
                Weekly Activity Velocity
              </h2>
              <p className="text-xs text-stone-500 dark:text-slate-400">
                Total interactions vs. encrypted write operations by day
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-blue-700/25 dark:bg-blue-400/30 border border-blue-700 dark:border-blue-400" />
                Total
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-emerald-700 dark:bg-emerald-400" />
                Writes
              </span>
            </div>
          </div>

          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Weekly user activity velocity chart" className="w-full h-auto">
            {[0, 0.5, 1].map((t) => {
              const y = pad.top + plotH * (1 - t);
              return (
                <g key={t}>
                  <line x1={pad.left} x2={W - pad.right} y1={y} y2={y} className="stroke-stone-200 dark:stroke-slate-800" />
                  <text x={pad.left - 8} y={y + 4} textAnchor="end" className="fill-stone-500 dark:fill-slate-400 text-[10px] font-mono">
                    {Math.round(maxDaily * t)}
                  </text>
                </g>
              );
            })}

            {activityMetrics.dailySeries.map((day, idx) => {
              const slotW = plotW / activityMetrics.dailySeries.length;
              const cx = pad.left + idx * slotW + slotW / 2;
              const totalH = Math.max(4, (day.count / maxDaily) * plotH);
              const writeH = Math.max(day.writes > 0 ? 4 : 0, (day.writes / maxDaily) * plotH);
              return (
                <g key={day.label}>
                  <rect
                    x={cx - 16}
                    y={pad.top + plotH - totalH}
                    width={15}
                    height={totalH}
                    rx="2"
                    className="fill-blue-700/25 dark:fill-blue-400/30 stroke-blue-700 dark:stroke-blue-400"
                    strokeWidth="1"
                  />
                  <rect
                    x={cx + 2}
                    y={pad.top + plotH - writeH}
                    width={15}
                    height={writeH}
                    rx="2"
                    className="fill-emerald-700 dark:fill-emerald-400"
                  />
                  <text x={cx} y={H - 10} textAnchor="middle" className="fill-stone-600 dark:fill-slate-400 text-[11px] font-mono">
                    {day.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </section>

        {/* Day x Hour Engagement Heatmap */}
        <section className="lg:col-span-6 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-[#131821] p-6">
          <div className="mb-4">
            <h2 className="font-editorial text-xl font-medium text-stone-950 dark:text-white">
              Cadence Heatmap (UTC Blocks)
            </h2>
            <p className="text-xs text-stone-500 dark:text-slate-400">
              Concentrated editorial & analytical engagement windows across the week
            </p>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[360px]">
              <div className="grid grid-cols-[44px_repeat(6,1fr)] gap-1.5 mb-1.5 text-[10px] font-mono text-stone-500 dark:text-slate-400 text-center">
                <div />
                {BLOCK_LABELS.map((b) => (
                  <div key={b}>{b}</div>
                ))}
              </div>
              <div className="space-y-1.5">
                {activityMetrics.hourlyGrid.map((row, dayIdx) => (
                  <div key={DAY_LABELS[dayIdx]} className="grid grid-cols-[44px_repeat(6,1fr)] gap-1.5 items-center">
                    <span className="text-[11px] font-mono text-stone-600 dark:text-slate-400">{DAY_LABELS[dayIdx]}</span>
                    {row.map((val, blockIdx) => {
                      const ratio = val / maxHeat;
                      const shade =
                        ratio === 0
                          ? 'bg-stone-100 dark:bg-slate-800/60'
                          : ratio < 0.35
                            ? 'bg-blue-200 dark:bg-blue-950'
                            : ratio < 0.7
                              ? 'bg-blue-500/75 dark:bg-blue-600/80'
                              : 'bg-blue-700 dark:bg-blue-400';
                      return (
                        <div
                          key={blockIdx}
                          title={`${DAY_LABELS[dayIdx]} ${BLOCK_LABELS[blockIdx]}: ${val} activity units`}
                          className={`h-6 rounded-xs transition-colors ${shade}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Live Audit & Activity Log */}
      <section className="rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-[#131821]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-stone-200 dark:border-slate-800">
          <div>
            <h2 className="font-editorial text-xl font-medium text-stone-950 dark:text-white">
              Live Workspace Activity Stream
            </h2>
            <p className="text-xs text-stone-500 dark:text-slate-400">
              Every filter change, record edit, role switch, and KV sync is recorded locally.
            </p>
          </div>
          <div
            role="group"
            aria-label="Filter activity by role"
            className="inline-flex rounded-md border border-stone-200 dark:border-slate-700 bg-stone-100 dark:bg-[#0B0E14] p-0.5"
          >
            {(['all', 'admin', 'editor', 'viewer'] as const).map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={roleFilter === r}
                onClick={() => setRoleFilter(r)}
                className={`h-8 px-2.5 text-xs font-medium rounded whitespace-nowrap cursor-pointer ${
                  roleFilter === r
                    ? 'bg-white dark:bg-[#1C2433] text-stone-950 dark:text-white shadow-xs'
                    : 'text-stone-600 dark:text-slate-400'
                }`}
              >
                {r === 'all' ? 'All Roles' : ROLE_META[r].label}
              </button>
            ))}
          </div>
        </div>

        <ul className="divide-y divide-stone-200/80 dark:divide-slate-800">
          {filteredEvents.slice(0, 18).map((ev) => (
            <li key={ev.id} className="px-6 py-3.5 flex flex-wrap items-baseline justify-between gap-2 text-xs">
              <div className="min-w-0">
                <span className="font-semibold text-stone-900 dark:text-slate-100">{ev.userName}</span>
                <span className="mx-1.5 text-stone-400">·</span>
                <span className="text-stone-500 dark:text-slate-400">{ROLE_META[ev.userRole].label}</span>
                <span className="mx-1.5 text-stone-400">·</span>
                <span className="font-mono text-blue-700 dark:text-blue-400">{ev.action}</span>
                <p className="mt-1 text-stone-700 dark:text-slate-300">{ev.summary}</p>
              </div>
              <div className="font-mono tabular-nums text-[11px] text-stone-500 dark:text-slate-400 whitespace-nowrap shrink-0">
                {new Date(ev.timestamp).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {ev.durationMs !== undefined ? ` · ${ev.durationMs}ms` : ''}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: string; detail: string }> = ({ label, value, detail }) => (
  <div className="bg-white dark:bg-[#131821] p-5">
    <p className="text-xs font-medium text-stone-500 dark:text-slate-400">{label}</p>
    <p className="mt-1.5 font-mono text-2xl sm:text-3xl font-semibold tabular-nums text-stone-950 dark:text-white">
      {value}
    </p>
    <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">{detail}</p>
  </div>
);
