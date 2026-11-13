export interface RetentionPoint {
  day: number;
  retentionPct: number;
  readinessPct: number;
}

/**
 * Ebbinghaus spaced-repetition readiness curve driven by weekly study hours,
 * concept complexity (1-10), and retention halflife (days).
 */
export function computeStudyRetentionCurve(
  weeklyHours: number,
  complexity: number,
  halflifeDays: number,
  days = 28
): { curve: RetentionPoint[]; examReadiness: number } {
  const curve: RetentionPoint[] = [];
  const boostPerWeek = Math.min(0.45, (weeklyHours / 25) * (1.2 - complexity * 0.05));
  const effectiveHalflife = Math.max(2, halflifeDays * (1 + weeklyHours / 40));

  for (let d = 0; d <= days; d += 2) {
    const cycleDay = d % 7;
    const baseDecay = Math.exp((-Math.LN2 * cycleDay) / effectiveHalflife);
    const cumulativeMastery = 1 - Math.exp(-(d + 3) * Math.max(0.03, boostPerWeek / 6));
    const retentionPct = Math.min(
      99,
      Math.max(18, Math.round((baseDecay * 0.42 + cumulativeMastery * 0.58) * 100))
    );
    const readinessPct = Math.min(
      98,
      Math.max(15, Math.round(cumulativeMastery * 100 - complexity * 1.8 + weeklyHours * 0.6))
    );
    curve.push({ day: d, retentionPct, readinessPct });
  }

  const examReadiness = curve[curve.length - 1]?.readinessPct ?? 50;
  return { curve, examReadiness };
}

export interface MonteCarloBandPoint {
  year: string;
  p10: number;
  p50: number;
  p90: number;
}

/**
 * Valuation & Cashflow Monte Carlo distribution curves driven by WACC, Terminal Growth, and Burn Multiple.
 */
export function computeMonteCarloValuation(
  waccPct: number,
  terminalGrowthPct: number,
  burnMultiple: number
): { points: MonteCarloBandPoint[]; impliedEvM: number } {
  const spread = Math.max(1.5, waccPct - terminalGrowthPct);
  const efficiencyFactor = Math.max(0.45, 2.2 - burnMultiple * 0.35);
  const baseFcf = 120 * efficiencyFactor;
  const points: MonteCarloBandPoint[] = [];

  for (let yr = 0; yr <= 5; yr++) {
    const growthFactor = Math.pow(1 + (terminalGrowthPct * 2.1) / 100, yr);
    const discount = Math.pow(1 + waccPct / 100, yr * 0.45);
    const median = Number(((baseFcf * growthFactor) / discount).toFixed(1));
    const vol = median * (0.08 + yr * 0.045) * (burnMultiple / 1.4);
    points.push({
      year: yr === 0 ? "Now" : `Y+${yr}`,
      p10: Math.max(15, Number((median - vol).toFixed(1))),
      p50: median,
      p90: Number((median + vol * 1.15).toFixed(1)),
    });
  }

  const terminalFcf = points[points.length - 1].p50;
  const impliedEvM = Number(
    ((terminalFcf * (1 + terminalGrowthPct / 100)) / (spread / 100) * 0.42).toFixed(1)
  );
  return { points, impliedEvM };
}

export interface RunwayScenarioResult {
  monthsRemaining: number;
  zeroCashLabel: string;
  monthlyNetBurnM: number;
  monthlyTimeline: Array<{ month: string; cashM: number }>;
}

export function computeRunwayStress(
  cashReserveM: number,
  grossBurnM: number,
  monthlyRevM: number,
  options: { hiringFreeze: boolean; cloudCostCut: boolean; bridgeFacility: boolean }
): RunwayScenarioResult {
  let effectiveCash = cashReserveM + (options.bridgeFacility ? 18 : 0);
  let effectiveBurn = grossBurnM;
  if (options.hiringFreeze) effectiveBurn *= 0.84;
  if (options.cloudCostCut) effectiveBurn *= 0.91;

  const monthlyNetBurnM = Number(Math.max(0.4, effectiveBurn - monthlyRevM).toFixed(2));
  const monthsRemaining = Math.min(60, Math.round(effectiveCash / monthlyNetBurnM));

  const timeline: Array<{ month: string; cashM: number }> = [];
  for (let m = 0; m <= 24; m += 3) {
    timeline.push({
      month: `M${m}`,
      cashM: Number(Math.max(0, effectiveCash - monthlyNetBurnM * m).toFixed(1)),
    });
  }

  const now = new Date("2026-11-13T00:00:00Z");
  now.setMonth(now.getMonth() + monthsRemaining);
  const zeroCashLabel =
    monthsRemaining >= 60
      ? "Cash-Flow Resilient (60+ mo)"
      : now.toLocaleDateString("en-US", { month: "short", year: "numeric" });

  return {
    monthsRemaining,
    zeroCashLabel,
    monthlyNetBurnM,
    monthlyTimeline: timeline,
  };
}
