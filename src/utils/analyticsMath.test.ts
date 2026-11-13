import test from "node:test";
import assert from "node:assert/strict";
import {
  computeStudyRetentionCurve,
  computeMonteCarloValuation,
  computeRunwayStress,
} from "./analyticsMath";

test("computeStudyRetentionCurve increases exam readiness with more weekly study hours", () => {
  const lowHours = computeStudyRetentionCurve(4, 7, 5);
  const highHours = computeStudyRetentionCurve(22, 7, 5);

  assert.equal(lowHours.curve.length, 15);
  assert.ok(highHours.examReadiness > lowHours.examReadiness);
  for (const pt of highHours.curve) {
    assert.ok(pt.retentionPct >= 18 && pt.retentionPct <= 99);
    assert.ok(pt.readinessPct >= 15 && pt.readinessPct <= 98);
  }
});

test("computeMonteCarloValuation maintains P10 <= P50 <= P90 across horizon", () => {
  const res = computeMonteCarloValuation(9.5, 3.2, 1.4);
  assert.equal(res.points.length, 6);
  assert.ok(res.impliedEvM > 0);
  for (const pt of res.points) {
    assert.ok(pt.p10 <= pt.p50);
    assert.ok(pt.p50 <= pt.p90);
  }
});

test("computeRunwayStress extends runway when cost cuts and bridge facility are enabled", () => {
  const baseline = computeRunwayStress(180, 15, 5, {
    hiringFreeze: false,
    cloudCostCut: false,
    bridgeFacility: false,
  });
  const stressed = computeRunwayStress(180, 15, 5, {
    hiringFreeze: true,
    cloudCostCut: true,
    bridgeFacility: true,
  });

  assert.ok(stressed.monthsRemaining > baseline.monthsRemaining);
  assert.ok(stressed.monthlyNetBurnM < baseline.monthlyNetBurnM);
});
