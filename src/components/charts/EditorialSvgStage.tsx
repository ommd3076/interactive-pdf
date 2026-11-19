import React, { useState } from 'react';
import { formatCompactNumber, formatDwell } from '../../engine/analytics';
import type { AnalyticsSummary, VisualMode } from '../../engine/types';

interface EditorialSvgStageProps {
  summary: AnalyticsSummary;
  visualMode: VisualMode;
  onChangeMode: (mode: VisualMode) => void;
  caption: string;
}

const MODE_LABELS: ReadonlyArray<{ id: VisualMode; label: string }> = [
  { id: 'area-trend', label: 'Trajectory' },
  { id: 'dwell-bars', label: 'Dwell Bands' },
  { id: 'regional-scatter', label: 'Regional Cohorts' },
  { id: 'channel-slope', label: 'Q1 → Q4 Shift' },
];

const SERIES_COLORS = {
  primary: '#1D4ED8',
  primaryDark: '#60A5FA',
  emerald: '#15803D',
  amber: '#B45309',
  rose: '#BE123C',
};

export const EditorialSvgStage: React.FC<EditorialSvgStageProps> = ({
  summary,
  visualMode,
  onChangeMode,
  caption,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [focusedRegion, setFocusedRegion] = useState<string | null>(null);

  const isEmpty = summary.recordCount === 0;

  return (
    <div className="rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-[#131821] p-5 sm:p-6">
      {/* Stage Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-200 dark:border-slate-800">
        <div>
          <p className="text-xs font-medium text-stone-500 dark:text-slate-400">
            Interactive SVG Stage · {summary.recordCount} active {summary.recordCount === 1 ? 'record' : 'records'}
          </p>
        </div>
        <div
          role="tablist"
          aria-label="Chart visualization mode"
          className="inline-flex items-center rounded-md border border-stone-200 dark:border-slate-700 bg-stone-100 dark:bg-[#0B0E14] p-0.5 overflow-x-auto max-w-full"
        >
          {MODE_LABELS.map((tab) => {
            const active = visualMode === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => {
                  onChangeMode(tab.id);
                  setHoveredIdx(null);
                  setFocusedRegion(null);
                }}
                className={`h-8 px-2.5 text-xs font-medium rounded whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'bg-white dark:bg-[#1C2433] text-stone-950 dark:text-white shadow-xs'
                    : 'text-stone-600 dark:text-slate-400 hover:text-stone-950 dark:hover:text-slate-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Responsive SVG Canvas */}
      <div className="relative mt-5 min-h-[340px] flex items-center justify-center">
        {isEmpty ? (
          <div className="text-center py-14 px-4">
            <p className="font-editorial text-lg font-medium text-stone-900 dark:text-slate-100">
              No matching records in current filter scope
            </p>
            <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
              Reset Region or Channel filters above to inspect audience trends.
            </p>
          </div>
        ) : (
          <div key={visualMode} className="w-full meridian-enter">
            {visualMode === 'area-trend' && (
              <AreaTrendSvg
                summary={summary}
                hoveredIdx={hoveredIdx}
                setHoveredIdx={setHoveredIdx}
              />
            )}
            {visualMode === 'dwell-bars' && (
              <DwellBarsSvg
                summary={summary}
                hoveredIdx={hoveredIdx}
                setHoveredIdx={setHoveredIdx}
              />
            )}
            {visualMode === 'regional-scatter' && (
              <RegionalScatterSvg
                summary={summary}
                focusedRegion={focusedRegion}
                setFocusedRegion={setFocusedRegion}
              />
            )}
            {visualMode === 'channel-slope' && <ChannelSlopeSvg summary={summary} />}
          </div>
        )}
      </div>

      {/* Figure Caption */}
      <div className="mt-4 pt-3 border-t border-stone-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <p className="font-editorial italic text-xs text-stone-500 dark:text-slate-400">{caption}</p>
        <span className="font-mono text-[11px] tabular-nums text-stone-400 dark:text-slate-500">
          SVG 100% Vector · Keyboard Accessible
        </span>
      </div>
    </div>
  );
};

/* --- 1. Multi-Series Area & Rolling Average Line Chart --- */
const AreaTrendSvg: React.FC<{
  summary: AnalyticsSummary;
  hoveredIdx: number | null;
  setHoveredIdx: (idx: number | null) => void;
}> = ({ summary, hoveredIdx, setHoveredIdx }) => {
  const pts = summary.monthlySeries;
  const ma = summary.movingAverage;
  const W = 640;
  const H = 310;
  const pad = { top: 24, right: 20, bottom: 38, left: 54 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const maxVal = Math.max(1000, ...pts.map((p) => p.readers)) * 1.12;
  const xAt = (i: number) => pad.left + (pts.length <= 1 ? plotW / 2 : (i / (pts.length - 1)) * plotW);
  const yAt = (val: number) => pad.top + plotH - (val / maxVal) * plotH;

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(p.readers).toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${xAt(pts.length - 1).toFixed(1)} ${(pad.top + plotH).toFixed(1)} L ${xAt(0).toFixed(1)} ${(pad.top + plotH).toFixed(1)} Z`;
  const maPath = ma.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`).join(' ');

  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const activeIdx = hoveredIdx ?? pts.length - 1;
  const activePt = pts[activeIdx];

  return (
    <div>
      {/* Inline Precision Readout */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-4 text-stone-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-xs bg-blue-700 dark:bg-blue-400" />
            Monthly Readers
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-3.5 bg-amber-600 dark:bg-amber-400" />
            3-Mo Rolling Avg
          </span>
        </div>
        {activePt && (
          <div className="font-mono tabular-nums text-stone-800 dark:text-slate-200">
            {activePt.month} 2026: <strong>{formatCompactNumber(activePt.readers)}</strong> readers ·{' '}
            {formatDwell(activePt.dwellSeconds)} dwell · {activePt.returningPct}% returning
          </div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Monthly engaged readership trajectory and 3-month moving average"
        className="w-full h-auto overflow-visible"
      >
        <defs>
          <linearGradient id="meridianAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines */}
        {ticks.map((t) => {
          const y = pad.top + plotH * (1 - t);
          return (
            <g key={t}>
              <line
                x1={pad.left}
                x2={W - pad.right}
                y1={y}
                y2={y}
                className="stroke-stone-200 dark:stroke-slate-800"
                strokeWidth="1"
              />
              <text
                x={pad.left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-stone-500 dark:fill-slate-400 text-[10px] font-mono tabular-nums"
              >
                {formatCompactNumber(maxVal * t)}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill="url(#meridianAreaGrad)" className="text-blue-700 dark:text-blue-400" />

        {/* Moving average dashed line */}
        <path
          d={maPath}
          fill="none"
          className="stroke-amber-600 dark:stroke-amber-400"
          strokeWidth="1.75"
          strokeDasharray="4 4"
        />

        {/* Primary series line */}
        <path
          d={linePath}
          fill="none"
          className="stroke-blue-700 dark:stroke-blue-400"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Active vertical crosshair */}
        {activePt && (
          <line
            x1={xAt(activeIdx)}
            x2={xAt(activeIdx)}
            y1={pad.top}
            y2={pad.top + plotH}
            className="stroke-stone-400 dark:stroke-slate-600"
            strokeDasharray="3 3"
            strokeWidth="1"
          />
        )}

        {/* Interactive points + X-axis labels */}
        {pts.map((pt, i) => {
          const cx = xAt(i);
          const cy = yAt(pt.readers);
          const isSelected = activeIdx === i;
          return (
            <g key={pt.month}>
              <text
                x={cx}
                y={H - 12}
                textAnchor="middle"
                className={`text-[10px] font-mono ${
                  isSelected
                    ? 'fill-stone-950 dark:fill-white font-semibold'
                    : 'fill-stone-500 dark:fill-slate-400'
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
              {/* Wide accessible hit target */}
              <rect
                x={cx - 18}
                y={pad.top}
                width={36}
                height={plotH}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`${pt.month}: ${formatCompactNumber(pt.readers)} readers, ${formatDwell(pt.dwellSeconds)} median dwell`}
                onMouseEnter={() => setHoveredIdx(i)}
                onFocus={() => setHoveredIdx(i)}
                onClick={() => setHoveredIdx(i)}
                className="cursor-pointer outline-none"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/* --- 2. Grouped Dwell Duration Distribution Bars --- */
const DwellBarsSvg: React.FC<{
  summary: AnalyticsSummary;
  hoveredIdx: number | null;
  setHoveredIdx: (idx: number | null) => void;
}> = ({ summary, hoveredIdx, setHoveredIdx }) => {
  const buckets = summary.dwellDistribution;
  const W = 640;
  const H = 310;
  const pad = { top: 24, right: 20, bottom: 42, left: 52 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const series: Array<{ key: 'mobile' | 'web' | 'newsletter' | 'audio'; label: string; colorClass: string }> = [
    { key: 'mobile', label: 'Mobile', colorClass: 'fill-blue-700 dark:fill-blue-400' },
    { key: 'web', label: 'Web', colorClass: 'fill-emerald-700 dark:fill-emerald-400' },
    { key: 'newsletter', label: 'Newsletter', colorClass: 'fill-amber-600 dark:fill-amber-400' },
    { key: 'audio', label: 'Audio', colorClass: 'fill-rose-700 dark:fill-rose-400' },
  ];

  const maxVal = Math.max(
    10,
    ...buckets.flatMap((b) => [b.mobile, b.web, b.newsletter, b.audio])
  ) * 1.15;

  const groupW = plotW / buckets.length;
  const barW = Math.min(24, (groupW - 28) / 4);
  const activeBucket = hoveredIdx !== null ? buckets[hoveredIdx] : buckets[2];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-3.5 text-stone-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-blue-700 dark:bg-blue-400" />
            Mobile
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-emerald-700 dark:bg-emerald-400" />
            Web
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-amber-600 dark:bg-amber-400" />
            Newsletter
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-rose-700 dark:bg-rose-400" />
            Audio
          </span>
        </div>
        {activeBucket && (
          <div className="font-mono tabular-nums text-stone-800 dark:text-slate-200">
            Band {activeBucket.bucket}: Mobile <strong>{activeBucket.mobile}K</strong> · Web{' '}
            <strong>{activeBucket.web}K</strong> · Audio <strong>{activeBucket.audio}K</strong>
          </div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Reading dwell time distribution across Mobile, Web, Newsletter, and Audio"
        className="w-full h-auto overflow-visible"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = pad.top + plotH * (1 - t);
          return (
            <g key={t}>
              <line x1={pad.left} x2={W - pad.right} y1={y} y2={y} className="stroke-stone-200 dark:stroke-slate-800" />
              <text
                x={pad.left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-stone-500 dark:fill-slate-400 text-[10px] font-mono tabular-nums"
              >
                {Math.round(maxVal * t)}K
              </text>
            </g>
          );
        })}

        {buckets.map((bucket, gIdx) => {
          const gx = pad.left + gIdx * groupW;
          const totalBarsW = series.length * barW + (series.length - 1) * 4;
          const startX = gx + (groupW - totalBarsW) / 2;
          const isHovered = hoveredIdx === gIdx;

          return (
            <g
              key={bucket.bucket}
              onMouseEnter={() => setHoveredIdx(gIdx)}
              onFocus={() => setHoveredIdx(gIdx)}
              tabIndex={0}
              role="button"
              aria-label={`Dwell band ${bucket.bucket}: Mobile ${bucket.mobile}K, Web ${bucket.web}K, Newsletter ${bucket.newsletter}K, Audio ${bucket.audio}K`}
              className="cursor-pointer outline-none"
            >
              {isHovered && (
                <rect
                  x={gx + 4}
                  y={pad.top}
                  width={groupW - 8}
                  height={plotH}
                  rx="4"
                  className="fill-stone-100/80 dark:fill-slate-800/40"
                />
              )}
              {series.map((s, sIdx) => {
                const val = bucket[s.key];
                const barH = Math.max(2, (val / maxVal) * plotH);
                const x = startX + sIdx * (barW + 4);
                const y = pad.top + plotH - barH;
                return (
                  <rect
                    key={s.key}
                    x={x}
                    y={y}
                    width={barW}
                    height={barH}
                    rx="2"
                    className={`${s.colorClass} transition-opacity duration-150 ${
                      hoveredIdx !== null && !isHovered ? 'opacity-45' : 'opacity-100'
                    }`}
                  />
                );
              })}
              <text
                x={gx + groupW / 2}
                y={H - 14}
                textAnchor="middle"
                className="fill-stone-700 dark:fill-slate-300 text-[11px] font-mono font-medium"
              >
                {bucket.bucket}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/* --- 3. Regional Cohort Scatter Bubble Plot --- */
const RegionalScatterSvg: React.FC<{
  summary: AnalyticsSummary;
  focusedRegion: string | null;
  setFocusedRegion: (region: string | null) => void;
}> = ({ summary, focusedRegion, setFocusedRegion }) => {
  const regions = summary.regionalBreakdown.filter((r) => r.count > 0);
  const W = 640;
  const H = 310;
  const pad = { top: 28, right: 32, bottom: 44, left: 56 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const minDwell = 300;
  const maxDwell = 520;
  const minRet = 52;
  const maxRet = 82;
  const maxReaders = Math.max(1, ...regions.map((r) => r.readers));

  const xAt = (dwell: number) => pad.left + ((Math.max(minDwell, Math.min(maxDwell, dwell)) - minDwell) / (maxDwell - minDwell)) * plotW;
  const yAt = (ret: number) => pad.top + plotH - ((Math.max(minRet, Math.min(maxRet, ret)) - minRet) / (maxRet - minRet)) * plotH;

  const palette = [
    SERIES_COLORS.primary,
    SERIES_COLORS.emerald,
    SERIES_COLORS.amber,
    SERIES_COLORS.rose,
  ];

  const active = regions.find((r) => r.region === focusedRegion) ?? regions[0];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-stone-500 dark:text-slate-400">
          X: Median Dwell · Y: Returning Rate · Size: Readers
        </span>
        {active && (
          <span className="font-mono tabular-nums text-stone-800 dark:text-slate-200">
            <strong>{active.region}</strong>: {formatCompactNumber(active.readers)} readers ·{' '}
            {active.returningPct}% returning · {formatDwell(active.dwellSeconds)}
          </span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Regional cohort scatter plot comparing dwell time and returning reader percentage"
        className="w-full h-auto overflow-visible"
      >
        {/* Y gridlines */}
        {[55, 65, 75].map((ret) => {
          const y = yAt(ret);
          return (
            <g key={ret}>
              <line x1={pad.left} x2={W - pad.right} y1={y} y2={y} className="stroke-stone-200 dark:stroke-slate-800" />
              <text x={pad.left - 8} y={y + 4} textAnchor="end" className="fill-stone-500 dark:fill-slate-400 text-[10px] font-mono">
                {ret}%
              </text>
            </g>
          );
        })}

        {/* X gridlines */}
        {[330, 390, 450, 510].map((sec) => {
          const x = xAt(sec);
          return (
            <g key={sec}>
              <line x1={x} x2={x} y1={pad.top} y2={pad.top + plotH} className="stroke-stone-200/70 dark:stroke-slate-800/70" strokeDasharray="3 3" />
              <text x={x} y={H - 16} textAnchor="middle" className="fill-stone-500 dark:fill-slate-400 text-[10px] font-mono">
                {Math.round(sec / 60)}m {(sec % 60).toString().padStart(2, '0')}s
              </text>
            </g>
          );
        })}

        {regions.map((reg, idx) => {
          const cx = xAt(reg.dwellSeconds);
          const cy = yAt(reg.returningPct);
          const radius = 16 + Math.sqrt(reg.readers / maxReaders) * 24;
          const dimmed = focusedRegion !== null && focusedRegion !== reg.region;
          const color = palette[idx % palette.length];
          return (
            <g
              key={reg.region}
              tabIndex={0}
              role="button"
              aria-label={`${reg.region}: ${formatCompactNumber(reg.readers)} readers, ${reg.returningPct}% returning, ${formatDwell(reg.dwellSeconds)} median dwell`}
              onMouseEnter={() => setFocusedRegion(reg.region)}
              onMouseLeave={() => setFocusedRegion(null)}
              onFocus={() => setFocusedRegion(reg.region)}
              onBlur={() => setFocusedRegion(null)}
              className="cursor-pointer outline-none"
              style={{ opacity: dimmed ? 0.35 : 1, transition: 'opacity 150ms ease' }}
            >
              <circle cx={cx} cy={cy} r={radius} fill={color} fillOpacity="0.22" stroke={color} strokeWidth="2" />
              <text
                x={cx}
                y={cy - 2}
                textAnchor="middle"
                className="fill-stone-950 dark:fill-white text-[11px] font-semibold"
              >
                {reg.region}
              </text>
              <text
                x={cx}
                y={cy + 12}
                textAnchor="middle"
                className="fill-stone-700 dark:fill-slate-300 text-[10px] font-mono tabular-nums"
              >
                {formatCompactNumber(reg.readers)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/* --- 4. Q1 to Q4 Channel Slopegraph --- */
const ChannelSlopeSvg: React.FC<{ summary: AnalyticsSummary }> = ({ summary }) => {
  const rows = summary.channelBreakdown.filter((c) => c.q1Readers > 0 || c.q4Readers > 0);
  const W = 640;
  const H = 310;
  const leftX = 160;
  const rightX = 480;
  const topY = 44;
  const bottomY = 270;

  const maxVal = Math.max(1000, ...rows.flatMap((r) => [r.q1Readers, r.q4Readers])) * 1.1;
  const yAt = (v: number) => bottomY - (v / maxVal) * (bottomY - topY);

  const strokes = [
    'stroke-blue-700 dark:stroke-blue-400',
    'stroke-emerald-700 dark:stroke-emerald-400',
    'stroke-amber-600 dark:stroke-amber-400',
    'stroke-rose-700 dark:stroke-rose-400',
  ];
  const fills = [
    'fill-blue-700 dark:fill-blue-400',
    'fill-emerald-700 dark:fill-emerald-400',
    'fill-amber-600 dark:fill-amber-400',
    'fill-rose-700 dark:fill-rose-400',
  ];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Channel audience growth slopegraph comparing Q1 baseline to Q4 closing volume"
      className="w-full h-auto overflow-visible"
    >
      {/* Column axis rails */}
      <line x1={leftX} x2={leftX} y1={topY - 8} y2={bottomY + 8} className="stroke-stone-300 dark:stroke-slate-700" strokeWidth="1.5" />
      <line x1={rightX} x2={rightX} y1={topY - 8} y2={bottomY + 8} className="stroke-stone-300 dark:stroke-slate-700" strokeWidth="1.5" />

      <text x={leftX} y={22} textAnchor="middle" className="fill-stone-600 dark:fill-slate-300 text-xs font-mono font-semibold">
        Q1 Baseline (Jan–Mar)
      </text>
      <text x={rightX} y={22} textAnchor="middle" className="fill-stone-600 dark:fill-slate-300 text-xs font-mono font-semibold">
        Q4 Run-Rate (Oct–Dec)
      </text>

      {rows.map((row, idx) => {
        const y1 = yAt(row.q1Readers);
        const y2 = yAt(row.q4Readers);
        const pctGain = row.q1Readers > 0 ? (((row.q4Readers - row.q1Readers) / row.q1Readers) * 100).toFixed(1) : '0.0';
        return (
          <g key={row.channel}>
            <line
              x1={leftX}
              y1={y1}
              x2={rightX}
              y2={y2}
              className={strokes[idx % strokes.length]}
              strokeWidth="2.5"
            />
            <circle cx={leftX} cy={y1} r="4.5" className={fills[idx % fills.length]} />
            <circle cx={rightX} cy={y2} r="4.5" className={fills[idx % fills.length]} />

            <text
              x={leftX - 12}
              y={y1 + 4}
              textAnchor="end"
              className="fill-stone-800 dark:fill-slate-200 text-xs font-medium"
            >
              {row.channel} · <tspan className="font-mono tabular-nums">{formatCompactNumber(row.q1Readers)}</tspan>
            </text>
            <text
              x={rightX + 12}
              y={y2 + 4}
              textAnchor="start"
              className="fill-stone-900 dark:fill-white text-xs font-mono tabular-nums font-medium"
            >
              {formatCompactNumber(row.q4Readers)}{' '}
              <tspan className="fill-emerald-700 dark:fill-emerald-400">(+{pctGain}%)</tspan>
            </text>
          </g>
        );
      })}
    </svg>
  );
};
