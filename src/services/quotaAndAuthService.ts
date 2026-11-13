import { ContributorProfile, GuestQuotaState } from "../types/platform";

const QUOTA_STORAGE_KEY = "morphos_guest_quota_v1";
const AUTH_STORAGE_KEY = "morphos_contributor_profile_v1";

export function getTodayISO(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function loadGuestQuota(now = new Date()): GuestQuotaState {
  const today = getTodayISO(now);
  try {
    const raw = localStorage.getItem(QUOTA_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GuestQuotaState;
      if (parsed.dateISO === today) {
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }
  return { dateISO: today, analysesUsedToday: 0, adBonusUnlockedToday: 0 };
}

export function saveGuestQuota(state: GuestQuotaState): void {
  try {
    localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function canGuestAnalyze(
  quota: GuestQuotaState,
  profile: ContributorProfile | null,
  now = new Date()
): boolean {
  if (profile) return true;
  const today = getTodayISO(now);
  if (quota.dateISO !== today) return true;
  const totalAllowance = 1 + quota.adBonusUnlockedToday;
  return quota.analysesUsedToday < totalAllowance;
}

export function recordGuestAnalysis(
  quota: GuestQuotaState,
  now = new Date()
): GuestQuotaState {
  const today = getTodayISO(now);
  const base =
    quota.dateISO === today
      ? quota
      : { dateISO: today, analysesUsedToday: 0, adBonusUnlockedToday: 0 };
  const next: GuestQuotaState = {
    ...base,
    analysesUsedToday: base.analysesUsedToday + 1,
  };
  saveGuestQuota(next);
  return next;
}

export function grantAdGateBonus(
  quota: GuestQuotaState,
  now = new Date()
): GuestQuotaState {
  const today = getTodayISO(now);
  const base =
    quota.dateISO === today
      ? quota
      : { dateISO: today, analysesUsedToday: 0, adBonusUnlockedToday: 0 };
  const next: GuestQuotaState = {
    ...base,
    adBonusUnlockedToday: base.adBonusUnlockedToday + 1,
  };
  saveGuestQuota(next);
  return next;
}

export function loadContributorProfile(): ContributorProfile | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ContributorProfile) : null;
  } catch {
    return null;
  }
}

export function saveContributorProfile(profile: ContributorProfile | null): void {
  try {
    if (profile) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}
