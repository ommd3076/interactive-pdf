import test from "node:test";
import assert from "node:assert/strict";
import { evaluateRuleCondition } from "./safeRuleEvaluator";

test("evaluateRuleCondition evaluates boolean AND / OR / comparisons accurately", () => {
  const vars = { burn_rate: 135, revenue_growth: 15, inventory_days: 78 };

  assert.equal(
    evaluateRuleCondition("burn_rate > 120 AND revenue_growth < 18", vars).matched,
    true
  );
  assert.equal(
    evaluateRuleCondition("burn_rate > 120 AND revenue_growth >= 20", vars).matched,
    false
  );
  assert.equal(
    evaluateRuleCondition("inventory_days >= 95 OR burn_rate > 130", vars).matched,
    true
  );
});

test("evaluateRuleCondition handles arithmetic expressions and IF-THEN prefixes", () => {
  const vars = { study_hours: 6, exam_weeks: 8, prereq_mastery: 72 };
  assert.equal(
    evaluateRuleCondition("study_hours * exam_weeks < 55", vars).matched,
    true
  );
  assert.equal(
    evaluateRuleCondition(
      "IF study_hours * exam_weeks >= 48 AND prereq_mastery >= 70 THEN PASS",
      vars
    ).matched,
    true
  );
});

test("evaluateRuleCondition evaluates boolean flags and string equality", () => {
  const vars = {
    p99_latency: 48,
    auto_approve: false,
    region_tier: "TIER_0",
  };
  assert.equal(
    evaluateRuleCondition(
      'IF p99_latency >= 42 AND auto_approve == false AND region_tier == "TIER_0" THEN shed_tier3',
      vars
    ).matched,
    true
  );
  assert.equal(
    evaluateRuleCondition('region_tier != "TIER_0"', vars).matched,
    false
  );
});

test("evaluateRuleCondition is case-insensitive for parameter names and handles division by zero", () => {
  assert.equal(
    evaluateRuleCondition("BURN_RATE / 0 == 0", { burn_rate: 50 }).matched,
    true
  );
});
