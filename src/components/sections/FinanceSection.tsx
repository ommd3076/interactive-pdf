import React, { useMemo, useState } from "react";
import { Download, ShieldCheck, Sparkles, ArrowUpDown, TrendingUp } from "lucide-react";
import { BotanicalSectionEmblem } from "../BotanicalFraming";
import {
  AlphaScenario,
  ContributorProfile,
  PlatformDataset,
} from "../../types/platform";
import {
  computeMonteCarloValuation,
  computeRunwayStress,
} from "../../utils/analyticsMath";

interface FinanceSectionProps {
  dataset: PlatformDataset;
  profile: ContributorProfile | null;
  onAddAlphaScenario: (scenario: AlphaScenario) => void;
  onOpenAuth: () => void;
}

export function FinanceSection({
  dataset,
  profile,
  onAddAlphaScenario,
  onOpenAuth,
}: FinanceSectionProps) {
  // #11 Monte Carlo Sliders
  const [waccPct, setWaccPct] = useState(9.4);
  const [terminalGrowthPct, setTerminalGrowthPct] = useState(3.4);
  const [burnMultiple, setBurnMultiple] = useState(1.3);

  // #12 Sankey Highlight
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);

  // #14 Ledger Filter & Sort
  const [outliersOnly, setOutliersOnly] = useState(false);
  const [sortSigmaDesc, setSortSigmaDesc] = useState(true);

  // #15 Runway Stress Toggles
  const [hiringFreeze, setHiringFreeze] = useState(false);
  const [cloudCostCut, setCloudCostCut] = useState(false);
  const [bridgeFacility, setBridgeFacility] = useState(false);

  // #18 Risk Exposure Focus
  const [activeRiskSlice, setActiveRiskSlice] = useState(0);

  // #20 Alpha Scenario Publisher
  const [alphaTitle, setAlphaTitle] = useState("");
  const [alphaNote, setAlphaNote] = useState("");
  const [alphaSavedMsg, setAlphaSavedMsg] = useState("");

  const mcResult = useMemo(
    () => computeMonteCarloValuation(waccPct, terminalGrowthPct, burnMultiple),
    [waccPct, terminalGrowthPct, burnMultiple]
  );

  const runwayResult = useMemo(
    () =>
      computeRunwayStress(184, 14.5, 6.2, {
        hiringFreeze,
        cloudCostCut,
        bridgeFacility,
      }),
    [hiringFreeze, cloudCostCut, bridgeFacility]
  );

  // SVG Monte Carlo P10/P50/P90 paths (#11)
  const { p50Line, bandPolygon } = useMemo(() => {
    const pts = mcResult.points;
    const maxVal = Math.max(...pts.map((p) => p.p90), 220);
    const toX = (i: number) => 26 + (i / Math.max(1, pts.length - 1)) * 348;
    const toY = (v: number) => 128 - (v / maxVal) * 102;

    const p50 = pts.map((p, i) => `${toX(i).toFixed(1)},${toY(p.p50).toFixed(1)}`).join(" ");
    const upper = pts.map((p, i) => `${toX(i).toFixed(1)},${toY(p.p90).toFixed(1)}`);
    const lower = [...pts]
      .reverse()
      .map((p, idx) => {
        const i = pts.length - 1 - idx;
        return `${toX(i).toFixed(1)},${toY(p.p10).toFixed(1)}`;
      });

    return {
      p50Line: p50,
      bandPolygon: [...upper, ...lower].join(" "),
    };
  }, [mcResult]);

  // Ledger Filtering & Sorting (#14)
  const visibleLedger = useMemo(() => {
    const rows = outliersOnly
      ? dataset.financeLedger.filter((r) => Math.abs(r.sigma) >= 2)
      : [...dataset.financeLedger];
    rows.sort((a, b) =>
      sortSigmaDesc
        ? Math.abs(b.sigma) - Math.abs(a.sigma)
        : Math.abs(a.sigma) - Math.abs(b.sigma)
    );
    return rows;
  }, [dataset.financeLedger, outliersOnly, sortSigmaDesc]);

  const handleExportLedgerCsv = () => {
    const header = "LineItem,Department,BudgetM,ActualM,Sigma,Status";
    const lines = visibleLedger.map(
      (r) =>
        `"${r.lineItem.replace(/"/g, '""')}","${r.department}",${r.budgetM},${r.actualM},${r.sigma},${r.status}`
    );
    const blob = new Blob([[header, ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "morphos-variance-ledger.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  // Runway Curve (#15)
  const runwayPolyline = useMemo(() => {
    const pts = runwayResult.monthlyTimeline;
    const maxCash = Math.max(...pts.map((p) => p.cashM), 200);
    return pts
      .map((p, i) => {
        const x = 18 + (i / Math.max(1, pts.length - 1)) * 284;
        const y = 86 - (p.cashM / maxCash) * 68;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [runwayResult]);

  // Cohort Decay SVG (#17)
  const { entCurve, midCurve } = useMemo(() => {
    const pts = dataset.cohortCurves;
    const maxY = Math.max(...pts.map((p) => p.enterpriseLtvCac), 9);
    const toX = (i: number) => 18 + (i / Math.max(1, pts.length - 1)) * 244;
    const toY = (v: number) => 90 - (v / maxY) * 70;
    return {
      entCurve: pts.map((p, i) => `${toX(i).toFixed(1)},${toY(p.enterpriseLtvCac).toFixed(1)}`).join(" "),
      midCurve: pts.map((p, i) => `${toX(i).toFixed(1)},${toY(p.midMarketLtvCac).toFixed(1)}`).join(" "),
    };
  }, [dataset.cohortCurves]);

  const riskSlices = [
    { label: "Capex Concentration", pct: 64, color: "#C2410C" },
    { label: "FX & Supply Liquidity", pct: 48, color: "#92400E" },
    { label: "Gross Margin Buffer", pct: 81, color: "#1E3A2B" },
  ];

  const handlePublishAlpha = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      onOpenAuth();
      return;
    }
    if (!alphaTitle.trim()) return;
    onAddAlphaScenario({
      id: `alp_user_${Date.now()}`,
      title: alphaTitle.trim(),
      wacc: waccPct,
      terminalGrowth: terminalGrowthPct,
      burnMultiple,
      outlierNote:
        alphaNote.trim() ||
        `Calibrated at ${waccPct}% WACC / ${terminalGrowthPct}% terminal growth.`,
      authorHandle: profile.handle,
      createdAt: new Date().toISOString().slice(0, 10),
    });
    setAlphaTitle("");
    setAlphaNote("");
    setAlphaSavedMsg("Alpha scenario published & synced locally.");
  };

  return (
    <section
      id="finance"
      className="border-t border-[#EAE6DF] bg-[#F5F2EB]/45 py-16 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-3 flex justify-center">
            <BotanicalSectionEmblem variant="compass" />
          </div>
          <p className="font-mono-tabular text-[11px] uppercase tracking-[0.14em] text-[#78716C]">
            Section II · Components 11 – 20 · Finance & Quantitative Intelligence
          </p>
          <h2 className="font-editorial mt-2 text-3xl sm:text-5xl text-[#1C1917] leading-tight">
            Capital moves{" "}
            <span className="italic block sm:inline text-[#1E3A2B]">
              with precision
            </span>
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#57534E]">
            Monte Carlo sensitivity bands, Sankey capital clearing, 2-sigma ledger
            anomaly flags, and stress-tested treasury runway directly in memory.
          </p>
        </div>

        {/* Row 1: #11 Monte Carlo Simulator + #12 Sankey Flow */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Component #11: Monte Carlo Sensitivity & Stress Slider Matrix */}
          <div className="editorial-card rounded-2xl p-6 lg:col-span-6">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#1E3A2B]">
                  11 · Monte Carlo Sensitivity
                </p>
                <h3 className="font-editorial text-xl text-[#1C1917] mt-0.5">
                  Valuation P10 / P50 / P90 Envelope
                </h3>
              </div>
              <div className="text-right">
                <p className="font-mono-tabular text-xl font-semibold text-[#1C1917]">
                  ${mcResult.impliedEvM}M
                </p>
                <p className="font-mono-tabular text-[10px] text-[#78716C]">
                  Implied Enterprise Value
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-[#EAE6DF] bg-[#FBF9F5] p-3">
              <svg
                viewBox="0 0 400 144"
                className="w-full h-36"
                role="img"
                aria-label="Monte Carlo confidence distribution"
              >
                <polygon points={bandPolygon} fill="#DCE8DF" opacity="0.72" />
                <polyline
                  fill="none"
                  stroke="#1E3A2B"
                  strokeWidth="2.5"
                  points={p50Line}
                />
                {mcResult.points.map((pt, idx) => {
                  const x = 26 + (idx / Math.max(1, mcResult.points.length - 1)) * 348;
                  return (
                    <text
                      key={pt.year}
                      x={x}
                      y={140}
                      textAnchor="middle"
                      fontSize="9.5"
                      fontFamily="JetBrains Mono, monospace"
                      fill="#78716C"
                    >
                      {pt.year}
                    </text>
                  );
                })}
              </svg>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="flex justify-between text-xs">
                  <label htmlFor="wacc-slider" className="text-[#57534E]">WACC</label>
                  <span className="font-mono-tabular font-medium text-[#1C1917]">{waccPct.toFixed(1)}%</span>
                </div>
                <input
                  id="wacc-slider"
                  type="range"
                  min={6.5}
                  max={15}
                  step={0.1}
                  value={waccPct}
                  onChange={(e) => setWaccPct(Number(e.target.value))}
                  className="editorial-slider w-full mt-1.5"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs">
                  <label htmlFor="tgr-slider" className="text-[#57534E]">Growth</label>
                  <span className="font-mono-tabular font-medium text-[#1C1917]">{terminalGrowthPct.toFixed(1)}%</span>
                </div>
                <input
                  id="tgr-slider"
                  type="range"
                  min={1.0}
                  max={5.5}
                  step={0.1}
                  value={terminalGrowthPct}
                  onChange={(e) => setTerminalGrowthPct(Number(e.target.value))}
                  className="editorial-slider w-full mt-1.5"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs">
                  <label htmlFor="burn-slider" className="text-[#57534E]">Burn Mult</label>
                  <span className="font-mono-tabular font-medium text-[#1C1917]">{burnMultiple.toFixed(1)}x</span>
                </div>
                <input
                  id="burn-slider"
                  type="range"
                  min={0.6}
                  max={2.8}
                  step={0.1}
                  value={burnMultiple}
                  onChange={(e) => setBurnMultiple(Number(e.target.value))}
                  className="editorial-slider w-full mt-1.5"
                />
              </div>
            </div>
          </div>

          {/* Component #12: Capital Allocation Sankey Flow Engine */}
          <div className="editorial-card rounded-2xl p-6 lg:col-span-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#92400E]">
                  12 · Capital Allocation Sankey
                </p>
                <h3 className="font-editorial text-xl text-[#1C1917] mt-0.5">
                  Revenue Inflows to CAPEX & OPEX
                </h3>
              </div>
              <span className="font-mono-tabular text-xs text-[#78716C]">$4.82B Flow</span>
            </div>

            <div className="mt-4 rounded-xl border border-[#EAE6DF] bg-[#FBF9F5] p-3">
              <svg viewBox="0 0 520 190" className="w-full h-44" role="img" aria-label="Capital allocation flow diagram">
                {/* Left Inflows -> Center Pool */}
                {dataset.sankeyStreams
                  .filter((s) => s.category === "Inflow")
                  .map((s, idx) => {
                    const y = 32 + idx * 58;
                    const active = activeStreamId === s.id;
                    return (
                      <g
                        key={s.id}
                        onMouseEnter={() => setActiveStreamId(s.id)}
                        onMouseLeave={() => setActiveStreamId(null)}
                        className="cursor-pointer"
                      >
                        <path
                          d={`M145 ${y} C195 ${y}, 215 95, 252 95`}
                          fill="none"
                          stroke={active ? "#1E3A2B" : "#97B09C"}
                          strokeWidth={Math.max(5, s.amountM / 180)}
                          opacity={active ? 0.95 : 0.68}
                        />
                        <rect x="6" y={y - 16} width="139" height="32" rx="6" fill="#FFFFFF" stroke="#EAE6DF" />
                        <text x="14" y={y + 4} fontSize="10" fontWeight="600" fill="#1C1917">
                          {s.source}
                        </text>
                      </g>
                    );
                  })}

                {/* Center Clearing Node */}
                <rect x="242" y="54" width="38" height="82" rx="8" fill="#1C1917" />
                <text
                  x="261"
                  y="98"
                  textAnchor="middle"
                  fontSize="9.5"
                  fill="#FBF9F5"
                  fontFamily="JetBrains Mono, monospace"
                >
                  POOL
                </text>

                {/* Center Pool -> Right Allocations */}
                {dataset.sankeyStreams
                  .filter((s) => s.category === "Allocation")
                  .map((s, idx) => {
                    const y = 32 + idx * 58;
                    const active = activeStreamId === s.id;
                    return (
                      <g
                        key={s.id}
                        onMouseEnter={() => setActiveStreamId(s.id)}
                        onMouseLeave={() => setActiveStreamId(null)}
                        className="cursor-pointer"
                      >
                        <path
                          d={`M280 95 C325 95, 340 ${y}, 375 ${y}`}
                          fill="none"
                          stroke={active ? "#C2410C" : "#C9A57C"}
                          strokeWidth={Math.max(5, s.amountM / 170)}
                          opacity={active ? 0.95 : 0.72}
                        />
                        <rect x="375" y={y - 16} width="139" height="32" rx="6" fill="#FFFFFF" stroke="#EAE6DF" />
                        <text x="383" y={y + 4} fontSize="10" fontWeight="600" fill="#1C1917">
                          {s.target}
                        </text>
                      </g>
                    );
                  })}
              </svg>
            </div>
            <p className="mt-2.5 font-mono-tabular text-[11px] text-[#78716C]">
              {activeStreamId
                ? `Selected stream: ${
                    dataset.sankeyStreams.find((x) => x.id === activeStreamId)?.source
                  } -> ${
                    dataset.sankeyStreams.find((x) => x.id === activeStreamId)?.target
                  } ($${
                    dataset.sankeyStreams.find((x) => x.id === activeStreamId)?.amountM
                  }M)`
                : "Hover any capital ribbon to inspect exact tranche clearing volume."}
            </p>
          </div>
        </div>

        {/* Row 2: #13 Dot-Matrix Anomaly Chart + #14 Variance & Outlier Ledger Grid */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Component #13: Dot-Matrix Volume & Cashflow Anomaly Chart */}
          <div className="editorial-card rounded-2xl p-6 lg:col-span-5">
            <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#C2410C]">
              13 · Dot-Matrix Cashflow Anomaly
            </p>
            <h3 className="font-editorial text-xl text-[#1C1917] mt-0.5">
              Projected vs Actual Variance
            </h3>

            <div className="mt-4 rounded-xl border border-[#EAE6DF] bg-[#FBF9F5] p-3">
              <svg viewBox="0 0 360 155" className="w-full h-40" role="img" aria-label="Dot matrix cashflow variance chart">
                {dataset.cashflowDots.map((pt, colIdx) => {
                  const x = 32 + colIdx * 42;
                  const anomaly = Math.abs(pt.actualM - pt.projectedM) >= 5;
                  const dotsCount = Math.max(2, Math.round(pt.actualM / 7));
                  return (
                    <g key={pt.month}>
                      {Array.from({ length: dotsCount }).map((_, rowIdx) => {
                        const cy = 126 - rowIdx * 11;
                        return (
                          <circle
                            key={rowIdx}
                            cx={x}
                            cy={cy}
                            r="3.5"
                            fill={anomaly ? "#C2410C" : "#3F4E34"}
                            opacity={anomaly ? 0.92 : 0.72}
                          />
                        );
                      })}
                      <text
                        x={x}
                        y={145}
                        textAnchor="middle"
                        fontSize="9.5"
                        fontFamily="JetBrains Mono, monospace"
                        fill="#78716C"
                      >
                        {pt.month}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <div className="mt-3 flex items-center justify-between font-mono-tabular text-[11px] text-[#78716C]">
              <span className="text-[#3F4E34]">● Nominal Month</span>
              <span className="text-[#C2410C]">● Divergence ≥ $5M</span>
            </div>
          </div>

          {/* Component #14: Variance & Outlier Ledger Grid */}
          <div className="editorial-card rounded-2xl p-6 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#92400E]">
                  14 · Variance & Outlier Ledger
                </p>
                <h3 className="font-editorial text-xl text-[#1C1917] mt-0.5">
                  Line-Item Dispersion (&gt; 2σ Flagged)
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOutliersOnly((v) => !v)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                    outliersOnly
                      ? "border-[#C2410C] bg-[#F7E3DC] text-[#C2410C]"
                      : "border-[#EAE6DF] text-[#57534E] hover:bg-[#F5F2EB]"
                  }`}
                >
                  {outliersOnly ? "Showing > 2σ Only" : "Filter > 2σ"}
                </button>
                <button
                  type="button"
                  onClick={() => setSortSigmaDesc((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#EAE6DF] px-2.5 py-1.5 text-xs text-[#57534E] hover:bg-[#F5F2EB]"
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  |σ|
                </button>
                <button
                  type="button"
                  onClick={handleExportLedgerCsv}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#EAE6DF] px-2.5 py-1.5 text-xs text-[#1C1917] hover:bg-[#F5F2EB]"
                >
                  <Download className="h-3.5 w-3.5" />
                  CSV
                </button>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EAE6DF] font-mono-tabular text-[10px] uppercase text-[#78716C]">
                    <th className="py-2 pr-3 font-medium">Line Item</th>
                    <th className="py-2 px-2 text-right font-medium">Budget</th>
                    <th className="py-2 px-2 text-right font-medium">Actual</th>
                    <th className="py-2 pl-2 pr-2 text-right font-medium">Sigma</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE6DF] text-xs">
                  {visibleLedger.map((row) => {
                    const isOutlier = Math.abs(row.sigma) >= 2;
                    return (
                      <tr key={row.id} className={isOutlier ? "bg-[#FBF3F0]" : ""}>
                        <td className="py-2.5 pr-3">
                          <div className="font-medium text-[#1C1917]">{row.lineItem}</div>
                          <div className="font-mono-tabular text-[10px] text-[#78716C]">
                            {row.department}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono-tabular whitespace-nowrap text-[#57534E]">
                          ${row.budgetM}M
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono-tabular whitespace-nowrap font-medium text-[#1C1917]">
                          ${row.actualM}M
                        </td>
                        <td
                          className={`py-2.5 pl-2 pr-2 text-right font-mono-tabular whitespace-nowrap font-semibold ${
                            isOutlier ? "text-[#C2410C]" : "text-[#1E3A2B]"
                          }`}
                        >
                          {row.sigma > 0 ? `+${row.sigma}` : row.sigma}σ
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Row 3: #15 Runway Stress + #16 Covariance Matrix + #17 Unit Economics + #18 Risk Gauge */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          {/* Component #15: Runway & Zero-Cash Stress Simulator */}
          <div className="editorial-card rounded-2xl p-6 lg:col-span-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#1E3A2B]">
                  15 · Runway Stress Simulator
                </p>
                <h3 className="font-editorial text-xl text-[#1C1917] mt-0.5">
                  Zero-Cash Horizon
                </h3>
              </div>
              <div className="text-right">
                <p className="font-mono-tabular text-lg font-semibold text-[#1C1917]">
                  {runwayResult.monthsRemaining} mo
                </p>
                <p className="font-mono-tabular text-[10px] text-[#92400E]">
                  {runwayResult.zeroCashLabel}
                </p>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-[#EAE6DF] bg-[#FBF9F5] p-2.5">
              <svg viewBox="0 0 320 96" className="w-full h-24" role="img" aria-label="Treasury cash runway curve">
                <polyline
                  fill="none"
                  stroke="#3F4E34"
                  strokeWidth="2.4"
                  points={runwayPolyline}
                />
              </svg>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              {[
                { label: "Hiring Freeze (-16% Opex)", state: hiringFreeze, set: setHiringFreeze },
                { label: "Cloud Reservation Cut (-9%)", state: cloudCostCut, set: setCloudCostCut },
                { label: "Credit Bridge (+$18M Reserve)", state: bridgeFacility, set: setBridgeFacility },
              ].map((t) => (
                <label
                  key={t.label}
                  className="flex items-center justify-between rounded-lg border border-[#EAE6DF] bg-[#FBF9F5] px-3 py-2 cursor-pointer"
                >
                  <span className="text-[#292524]">{t.label}</span>
                  <input
                    type="checkbox"
                    checked={t.state}
                    onChange={(e) => t.set(e.target.checked)}
                    className="h-4 w-4 accent-[#3F4E34]"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Component #16: Multi-Asset Factor Covariance Matrix */}
          <div className="editorial-card rounded-2xl p-6 lg:col-span-4">
            <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#92400E]">
              16 · Factor Covariance Matrix
            </p>
            <h3 className="font-editorial text-xl text-[#1C1917] mt-0.5">
              Cross-Asset Correlation
            </h3>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-center border-collapse font-mono-tabular text-[10px]">
                <thead>
                  <tr>
                    <th className="p-1" />
                    {dataset.covarianceAssets.map((a) => (
                      <th key={a} className="p-1 text-[#78716C] font-medium">
                        {a}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataset.covarianceMatrix.map((row, rIdx) => (
                    <tr key={dataset.covarianceAssets[rIdx]}>
                      <td className="p-1 text-left font-semibold text-[#1C1917]">
                        {dataset.covarianceAssets[rIdx]}
                      </td>
                      {row.map((val, cIdx) => {
                        const cls =
                          val >= 0.7
                            ? "bg-[#1E3A2B] text-[#FBF9F5]"
                            : val >= 0.25
                            ? "bg-[#E2EBE4] text-[#1E3A2B]"
                            : val <= -0.2
                            ? "bg-[#F7E3DC] text-[#C2410C]"
                            : "bg-[#F5F2EB] text-[#57534E]";
                        return (
                          <td key={cIdx} className="p-0.5">
                            <span className={`block rounded py-1.5 ${cls}`}>
                              {val.toFixed(2)}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Component #17: Unit Economics Cohort Decay Card (Dark Slate Contrast Anchor) */}
          <div className="editorial-dark-card rounded-2xl p-6 lg:col-span-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#A8A29E]">
                  17 · Unit Economics Cohort
                </p>
                <TrendingUp className="h-4 w-4 text-[#A7C4A0]" />
              </div>
              <h3 className="font-editorial text-xl text-[#FBF9F5] mt-0.5">
                LTV : CAC Expansion
              </h3>
              <div className="mt-3 rounded-xl border border-white/10 bg-black/25 p-2.5">
                <svg viewBox="0 0 280 100" className="w-full h-24" role="img" aria-label="LTV to CAC cohort curve">
                  <polyline fill="none" stroke="#D4A64A" strokeWidth="1.8" strokeDasharray="3 3" points={midCurve} />
                  <polyline fill="none" stroke="#A7C4A0" strokeWidth="2.4" points={entCurve} />
                </svg>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-3 font-mono-tabular">
              <div>
                <p className="text-[10px] text-[#A8A29E]">Enterprise M24</p>
                <p className="text-lg font-semibold text-[#A7C4A0]">8.2x</p>
              </div>
              <div>
                <p className="text-[10px] text-[#A8A29E]">Mid-Market M24</p>
                <p className="text-lg font-semibold text-[#D4A64A]">3.7x</p>
              </div>
            </div>
          </div>
        </div>

        {/* Row 4: #18 Risk Radial Gauge + #19 Quant Gate + #20 Community Alpha Publisher */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Component #18: Risk Exposure Concentric Radial Gauge */}
          <div className="editorial-card rounded-2xl p-6 lg:col-span-4">
            <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#C2410C]">
              18 · Risk Exposure Gauge
            </p>
            <h3 className="font-editorial text-xl text-[#1C1917] mt-0.5">
              Portfolio Balance Telemetry
            </h3>

            <div className="mt-4 flex items-center gap-4">
              <svg width="116" height="116" viewBox="0 0 120 120" role="img" aria-label="Concentric risk exposure rings">
                {riskSlices.map((slice, idx) => {
                  const r = 48 - idx * 12;
                  const circ = 2 * Math.PI * r;
                  const dashOffset = circ * (1 - slice.pct / 100);
                  return (
                    <g key={slice.label}>
                      <circle cx="60" cy="60" r={r} fill="none" stroke="#EAE6DF" strokeWidth="6" />
                      <circle
                        cx="60"
                        cy="60"
                        r={r}
                        fill="none"
                        stroke={slice.color}
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={circ}
                        strokeDashoffset={dashOffset}
                        transform="rotate(-90 60 60)"
                      />
                    </g>
                  );
                })}
              </svg>
              <div className="space-y-2 flex-1">
                {riskSlices.map((s, idx) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => setActiveRiskSlice(idx)}
                    className={`w-full rounded-lg border px-2.5 py-1.5 text-left text-xs transition ${
                      activeRiskSlice === idx
                        ? "border-[#1C1917] bg-[#F5F2EB]"
                        : "border-[#EAE6DF]"
                    }`}
                  >
                    <div className="flex justify-between font-mono-tabular">
                      <span className="text-[#292524]">{s.label}</span>
                      <span className="font-semibold text-[#1C1917]">{s.pct}%</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Component #19: Quant Contributor Analyst Gate */}
          <div className="editorial-card rounded-2xl p-6 lg:col-span-3 flex flex-col justify-between">
            <div>
              <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#3F4E34]">
                19 · Quant Analyst Gate
              </p>
              <h3 className="font-editorial text-xl text-[#1C1917] mt-0.5">
                {profile ? profile.handle : "Analyst Credentials"}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#57534E]">
                {profile
                  ? `Clearance: ${profile.clearanceLevel}. Active mandate: ${profile.focusOrMandate}.`
                  : "Verify an analyst pass to publish calibrated Alpha scenarios and load sensitivity presets."}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#EAE6DF]">
              {profile ? (
                <span className="inline-flex items-center gap-1.5 font-mono-tabular text-xs text-[#1E3A2B]">
                  <ShieldCheck className="h-4 w-4" />
                  Alpha Desk Verified
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#3F4E34] px-3 py-2 text-xs font-medium text-[#FBF9F5] hover:bg-[#1E3A2B]"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Sign In as Quant Analyst
                </button>
              )}
            </div>
          </div>

          {/* Component #20: Community Alpha Scenario Publisher */}
          <div className="editorial-card rounded-2xl p-6 lg:col-span-5">
            <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#1E3A2B]">
              20 · Alpha Scenario Publisher
            </p>
            <h3 className="font-editorial text-xl text-[#1C1917] mt-0.5">
              Save & Load Sensitivity Presets
            </h3>

            {!profile ? (
              <div className="mt-3 rounded-xl border border-dashed border-[#D6D0C4] bg-[#FBF9F5] p-4 text-center">
                <p className="text-xs text-[#57534E]">
                  Sign in as a Quant Analyst to publish WACC / Burn scenarios.
                </p>
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="mt-2.5 rounded-lg bg-[#3F4E34] px-4 py-1.5 text-xs font-medium text-[#FBF9F5]"
                >
                  Verify Analyst Pass
                </button>
              </div>
            ) : (
              <form onSubmit={handlePublishAlpha} className="mt-3 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="alpha-title" className="sr-only">Scenario Title</label>
                    <input
                      id="alpha-title"
                      type="text"
                      value={alphaTitle}
                      onChange={(e) => setAlphaTitle(e.target.value)}
                      placeholder="Scenario title (e.g. Base Case Q4)"
                      className="w-full rounded-lg border border-[#EAE6DF] bg-[#FBF9F5] px-3 py-1.5 text-xs text-[#1C1917]"
                    />
                  </div>
                  <div>
                    <label htmlFor="alpha-note" className="sr-only">Outlier Note</label>
                    <input
                      id="alpha-note"
                      type="text"
                      value={alphaNote}
                      onChange={(e) => setAlphaNote(e.target.value)}
                      placeholder="Thesis / outlier note"
                      className="w-full rounded-lg border border-[#EAE6DF] bg-[#FBF9F5] px-3 py-1.5 text-xs text-[#1C1917]"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <button
                    type="submit"
                    className="rounded-lg bg-[#3F4E34] px-3.5 py-1.5 text-xs font-medium text-[#FBF9F5] hover:bg-[#1E3A2B]"
                  >
                    Publish Current Sliders ({waccPct.toFixed(1)}% WACC)
                  </button>
                  {alphaSavedMsg && (
                    <span className="font-mono-tabular text-[11px] text-[#1E3A2B]">
                      {alphaSavedMsg}
                    </span>
                  )}
                </div>
              </form>
            )}

            <div className="mt-3 space-y-2 border-t border-[#EAE6DF] pt-3">
              {dataset.alphaScenarios.slice(0, 3).map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => {
                    setWaccPct(sc.wacc);
                    setTerminalGrowthPct(sc.terminalGrowth);
                    setBurnMultiple(sc.burnMultiple);
                  }}
                  className="w-full rounded-lg border border-[#EAE6DF] bg-[#FBF9F5] px-3 py-2 text-left hover:bg-[#F5F2EB] transition"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-[#1C1917]">
                    <span>{sc.title}</span>
                    <span className="font-mono-tabular text-[10px] text-[#3F4E34]">
                      Load {sc.wacc}% / {sc.terminalGrowth}%
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#57534E]">
                    {sc.outlierNote} · <span className="font-mono-tabular">{sc.authorHandle}</span>
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
