import React, { useState } from 'react';
import { useEngine } from '../context/EngineContext';
import { formatCompactNumber, formatDwell } from '../engine/analytics';

export const AnalyticsView: React.FC = () => {
  const { state, summary, setFilters } = useEngine();
  const [scaleMode, setScaleMode] = useState<'linear' | 'indexed'>('linear');
  const [showMovingAvg, setShowMovingAvg] = useState(true);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  const pts = summary.monthlySeries;
  const baseVal = Math.max(1, pts[0]?.readers ?? 1);
  const seriesValues = pts.map((p) => (scaleMode === 'indexed' ? (p.readers / baseVal) * 100 : p.readers));
  const maValues = summary.movingAverage.map((v) => (scaleMode === 'indexed' ? (v / baseVal) * 100 : v));

  const W = 820;
  const H = 290;
  const pad = { top: 24, right: 24, bottom: 38, left: 60 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const minY = scaleMode === 'indexed' ? Math.max(0, Math.min(...seriesValues, 90) - 10) : 0;
  const maxY = Math.max(10, ...seriesValues, ...maValues) * 1.1;
  const xAt = (i: number) => pad.left + (pts.length <= 1 ? plotW / 2 : (i / (pts.length - 1)) * plotW);
  const yAt = (v: number) => pad.top + plotH - ((v - minY) / Math.max(1, maxY - minY)) * plotH;

  const linePath = seriesValues
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`)
    .join(' ');
  const maPath = maValues
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`)
    .join(' ');

  const selectedIdx = hoveredMonth ?? pts.length - 1;
  const selectedPoint = pts[selectedIdx];

  // Donut Arc Calculations
  const channels = summary.channelBreakdown;
  const donutColors = [
    { stroke: '#1D4ED8', darkStroke: '#60A5FA', swatch: 'bg-blue-700 dark:bg-blue-400' },
    { stroke: '#15803D', darkStroke: '#34D399', swatch: 'bg-emerald-700 dark:bg-emerald-400' },
    { stroke: '#B45309', darkStroke: '#FBBF24', swatch: 'bg-amber-600 dark:bg-amber-400' },
    { stroke: '#BE123C', darkStroke: '#FB7185', swatch: 'bg-rose-700 dark:bg-rose-400' },
  ];
  const radius = 66;
  const circumference = 2 * Math.PI * radius;
  let cumulativePct = 0;

  const maxRegionalReaders = Math.max(1, ...summary.regionalBreakdown.map((r) => r.readers));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-stone-200 dark:border-slate-800">
        <div>
          <p className="text-xs text-stone-500 dark:text-slate-400">
            Comparative Telemetry · {state.filters.region} · {state.filters.channel} · {state.filters.timeframe}
          </p>
          <h1 className="mt-1 font-editorial text-3xl sm:text-4xl font-medium text-stone-950 dark:text-white">
            Audience Analytics Workbench
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label="Chart scale"
            className="inline-flex rounded-md border border-stone-200 dark:border-slate-700 bg-stone-100 dark:bg-[#0B0E14] p-0.5"
          >
            <button
              type="button"
              aria-pressed={scaleMode === 'linear'}
              onClick={() => setScaleMode('linear')}
              className={`h-8 px-3 text-xs font-medium rounded whitespace-nowrap cursor-pointer ${
                scaleMode === 'linear'
                  ? 'bg-white dark:bg-[#1C2433] text-stone-950 dark:text-white shadow-xs'
                  : 'text-stone-600 dark:text-slate-400'
              }`}
            >
              Absolute Volume
            </button>
            <button
              type="button"
              aria-pressed={scaleMode === 'indexed'}
              onClick={() => setScaleMode('indexed')}
              className={`h-8 px-3 text-xs font-medium rounded whitespace-nowrap cursor-pointer ${
                scaleMode === 'indexed'
                  ? 'bg-white dark:bg-[#1C2433] text-stone-950 dark:text-white shadow-xs'
                  : 'text-stone-600 dark:text-slate-400'
              }`}
            >
              Indexed (Base 100)
            </button>
          </div>
          <button
            type="button"
            aria-pressed={showMovingAvg}
            onClick={() => setShowMovingAvg((prev) => !prev)}
            className={`h-9 px-3 rounded-md border text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              showMovingAvg
                ? 'border-amber-600/60 dark:border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300'
                : 'border-stone-300 dark:border-slate-700 bg-white dark:bg-[#131821] text-stone-600 dark:text-slate-400'
            }`}
          >
            {showMovingAvg ? 'Hide 3-Mo Average' : 'Show 3-Mo Average'}
          </button>
        </div>
      </div>

      {/* Main Comparative SVG Chart */}
      <section className="rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-[#131821] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="font-editorial text-xl font-medium text-stone-950 dark:text-white">
              {scaleMode === 'indexed' ? 'Indexed Growth Trajectory (First Month = 100)' : 'Monthly Readership & Completions'}
            </h2>
            <p className="text-xs text-stone-500 dark:text-slate-400">
              Hover or focus any month marker to inspect exact cohort metrics.
            </p>
          </div>
          {selectedPoint && (
            <div className="font-mono text-xs tabular-nums text-stone-800 dark:text-slate-200">
              {selectedPoint.month}: <strong>{formatCompactNumber(selectedPoint.readers)}</strong> readers ·{' '}
              {formatCompactNumber(selectedPoint.completions)} completions · {formatDwell(selectedPoint.dwellSeconds)}
            </div>
          )}
        </div>

        {summary.recordCount === 0 ? (
          <div className="py-16 text-center text-sm text-stone-500 dark:text-slate-400">
            No records match the active filter combination.
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label="Comparative readership trend chart"
            className="w-full h-auto overflow-visible"
          >
            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
              const val = minY + (maxY - minY) * t;
              const y = yAt(val);
              return (
                <g key={t}>
                  <line x1={pad.left} x2={W - pad.right} y1={y} y2={y} className="stroke-stone-200 dark:stroke-slate-800" />
                  <text x={pad.left - 10} y={y + 4} textAnchor="end" className="fill-stone-500 dark:fill-slate-400 text-[10px] font-mono tabular-nums">
                    {scaleMode === 'indexed' ? val.toFixed(0) : formatCompactNumber(val)}
                  </text>
                </g>
              );
            })}

            {showMovingAvg && (
              <path
                d={maPath}
                fill="none"
                className="stroke-amber-600 dark:stroke-amber-400"
                strokeWidth="1.75"
                strokeDasharray="5 4"
              />
            )}

            <path
              d={linePath}
              fill="none"
              className="stroke-blue-700 dark:stroke-blue-400"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {pts.map((pt, idx) => {
              const cx = xAt(idx);
              const cy = yAt(seriesValues[idx]);
              const isSelected = selectedIdx === idx;
              return (
                <g key={pt.month}>
                  <text
                    x={cx}
                    y={H - 12}
                    textAnchor="middle"
                    className={`text-[10px] font-mono ${
                      isSelected ? 'fill-stone-950 dark:fill-white font-semibold' : 'fill-stone-500 dark:fill-slate-400'
                    }`}
                  >
                    {pt.month}
                  </text>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 5.5 : 3.5}
                    className={
                      isSelected
                        ? 'fill-blue-700 dark:fill-blue-400 stroke-white dark:stroke-[#131821]'
                        : 'fill-white dark:fill-[#131821] stroke-blue-700 dark:stroke-blue-400'
                    }
                    strokeWidth="2"
                  />
                  <rect
                    x={cx - 20}
                    y={pad.top}
                    width={40}
                    height={plotH}
                    fill="transparent"
                    tabIndex={0}
                    role="button"
                    aria-label={`${pt.month}: ${formatCompactNumber(pt.readers)} readers`}
                    onMouseEnter={() => setHoveredMonth(idx)}
                    onFocus={() => setHoveredMonth(idx)}
                    onClick={() => setHoveredMonth(idx)}
                    className="cursor-pointer outline-none"
                  />
                </g>
              );
            })}
          </svg>
        )}
      </section>

      {/* Bottom 2-Column Split: Channel Mix Donut + Regional Horizontal Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Channel Mix Donut */}
        <section className="lg:col-span-5 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-[#131821] p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-editorial text-xl font-medium text-stone-950 dark:text-white">
              Channel Distribution
            </h2>
            <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
              Click any channel row to filter the entire workspace.
            </p>
          </div>

          <div className="my-6 flex flex-col sm:flex-row items-center gap-6">
            <svg viewBox="0 0 180 180" role="img" aria-label="Readership share by channel" className="w-40 h-40 shrink-0">
              <circle
                cx="90"
                cy="90"
                r={radius}
                fill="none"
                strokeWidth="20"
                className="stroke-stone-100 dark:stroke-slate-800"
              />
              {channels.map((ch, idx) => {
                const dash = (ch.sharePct / 100) * circumference;
                const offset = -cumulativePct * (circumference / 100);
                cumulativePct += ch.sharePct;
                const dimmed = activeChannel !== null && activeChannel !== ch.channel;
                return (
                  <circle
                    key={ch.channel}
                    cx="90"
                    cy="90"
                    r={radius}
                    fill="none"
                    stroke={donutColors[idx % donutColors.length].stroke}
                    strokeWidth={activeChannel === ch.channel ? 24 : 20}
                    strokeDasharray={`${Math.max(0, dash - 1.5)} ${circumference}`}
                    strokeDashoffset={offset}
                    transform="rotate(-90 90 90)"
                    style={{ opacity: dimmed ? 0.35 : 1, transition: 'all 180ms ease' }}
                  />
                );
              })}
              <text x="90" y="86" textAnchor="middle" className="fill-stone-950 dark:fill-white font-mono text-base font-semibold tabular-nums">
                {formatCompactNumber(summary.totalReaders)}
              </text>
              <text x="90" y="104" textAnchor="middle" className="fill-stone-500 dark:fill-slate-400 text-[10px]">
                Total Readers
              </text>
            </svg>

            <div className="w-full space-y-2">
              {channels.map((ch, idx) => {
                const isSelected = state.filters.channel === ch.channel;
                return (
                  <button
                    key={ch.channel}
                    type="button"
                    onMouseEnter={() => setActiveChannel(ch.channel)}
                    onMouseLeave={() => setActiveChannel(null)}
                    onClick={() =>
                      setFilters({ channel: isSelected ? 'All' : ch.channel })
                    }
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-700/10 dark:bg-blue-400/15 text-blue-900 dark:text-blue-200'
                        : 'hover:bg-stone-100 dark:hover:bg-slate-800/60 text-stone-800 dark:text-slate-200'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2 font-medium">
                      <span className={`h-2.5 w-2.5 rounded-xs ${donutColors[idx % donutColors.length].swatch}`} />
                      {ch.channel}
                    </span>
                    <span className="font-mono tabular-nums text-stone-600 dark:text-slate-300">
                      {ch.sharePct}% · {formatDwell(ch.avgDwell)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-stone-500 dark:text-slate-400 border-t border-stone-200 dark:border-slate-800 pt-3">
            Tip: Click a selected channel again to return to All Channels.
          </p>
        </section>

        {/* Regional Horizontal Bar Breakdown */}
        <section className="lg:col-span-7 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-[#131821] p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-editorial text-xl font-medium text-stone-950 dark:text-white">
              Regional Reach & Completion Depth
            </h2>
            <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
              Click any region bar to cross-filter the editorial narrative and data ledger.
            </p>
          </div>

          <div className="my-6 space-y-4">
            {summary.regionalBreakdown.map((reg) => {
              const pctWidth = Math.max(2, (reg.readers / maxRegionalReaders) * 100);
              const isSelected = state.filters.region === reg.region;
              return (
                <button
                  key={reg.region}
                  type="button"
                  onClick={() => setFilters({ region: isSelected ? 'All' : reg.region })}
                  className={`w-full text-left p-3 rounded-md border transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-blue-700 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-950/25'
                      : 'border-transparent hover:border-stone-200 dark:hover:border-slate-800 hover:bg-stone-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                    <span className="font-semibold text-stone-900 dark:text-slate-100">
                      {reg.region}
                      <span className="ml-2 font-normal text-stone-500 dark:text-slate-400">
                        {reg.count} {reg.count === 1 ? 'edition' : 'editions'}
                      </span>
                    </span>
                    <span className="font-mono tabular-nums text-stone-700 dark:text-slate-300">
                      <strong>{formatCompactNumber(reg.readers)}</strong> · {reg.completionRate}% completion ·{' '}
                      {reg.returningPct}% returning
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 w-full rounded-xs bg-stone-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-blue-700 dark:bg-blue-400 rounded-xs transition-all duration-200"
                      style={{ width: `${pctWidth}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500 dark:text-slate-400 border-t border-stone-200 dark:border-slate-800 pt-3">
            <span>Sub-millisecond browser LRU cache active</span>
            <span className="font-mono tabular-nums">
              Hit ratio: {state.telemetry.cacheHitRate}% · Avg {state.telemetry.avgQueryMs}ms
            </span>
          </div>
        </section>
      </div>
    </div>
  );
};
