import test from "node:test";
import assert from "node:assert/strict";
import {
  canGuestAnalyze,
  grantAdGateBonus,
  recordGuestAnalysis,
} from "./quotaAndAuthService";
import { ContributorProfile, GuestQuotaState } from "../types/platform";

const SAMPLE_PROFILE: ContributorProfile = {
  name: "Ada Lovelace",
  handle: "@ada",
  email: "ada@archive.edu",
  domain: "EDUCATION",
  organization: "Analytical Press",
  focusOrMandate: "Symbolic Computation",
  clearanceLevel: "Principal Investigator",
  signedInAt: "2026-11-13T10:00:00Z",
};

test("guest gets strictly 1 free analysis per day and is gated on the 2nd", () => {
  const fixedNow = new Date("2026-11-13T12:00:00Z");
  const fresh: GuestQuotaState = {
    dateISO: "2026-11-13",
    analysesUsedToday: 0,
    adBonusUnlockedToday: 0,
  };

  assert.equal(canGuestAnalyze(fresh, null, fixedNow), true);
  const afterFirst = recordGuestAnalysis(fresh, fixedNow);
  assert.equal(afterFirst.analysesUsedToday, 1);
  assert.equal(canGuestAnalyze(afterFirst, null, fixedNow), false);

  // Ad gate bonus unlocks 1 extra analysis
  const afterAd = grantAdGateBonus(afterFirst, fixedNow);
  assert.equal(canGuestAnalyze(afterAd, null, fixedNow), true);

  // New day resets allowance automatically
  const nextDay = new Date("2026-11-14T08:00:00Z");
  assert.equal(canGuestAnalyze(afterFirst, null, nextDay), true);
});

test("authenticated contributors bypass daily guest cap", () => {
  const fixedNow = new Date("2026-11-13T12:00:00Z");
  const exhausted: GuestQuotaState = {
    dateISO: "2026-11-13",
    analysesUsedToday: 5,
    adBonusUnlockedToday: 0,
  };
  assert.equal(canGuestAnalyze(exhausted, SAMPLE_PROFILE, fixedNow), true);
});
