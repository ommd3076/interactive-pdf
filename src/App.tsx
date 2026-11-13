import React, { useEffect, useState } from "react";
import { LogOut, Sparkles } from "lucide-react";
import { PLATFORM_SEED_DATA } from "./data/platformSeedData";
import {
  AlphaScenario,
  ContributorProfile,
  DisciplineDomain,
  EnterpriseRule,
  GuestQuotaState,
  MarginCritique,
  PlatformDataset,
  StudyFlashcard,
} from "./types/platform";
import { ingestClientFile } from "./services/ingestionService";
import { synthesizePlatformDatasetFromFile } from "./services/clientAnalyzer";
import {
  canGuestAnalyze,
  grantAdGateBonus,
  loadContributorProfile,
  loadGuestQuota,
  recordGuestAnalysis,
  saveContributorProfile,
} from "./services/quotaAndAuthService";
import {
  loadWorkspaceState,
  saveWorkspaceState,
} from "./services/storageService";
import { EditorialHero } from "./components/EditorialHero";
import { EducationSection } from "./components/sections/EducationSection";
import { FinanceSection } from "./components/sections/FinanceSection";
import { EnterpriseSection } from "./components/sections/EnterpriseSection";
import { AdGateModal } from "./components/AdGateModal";
import { AuthGateModal } from "./components/AuthGateModal";

const SAMPLE_CORPUS_FILES: Record<"research" | "finance" | "enterprise", { name: string; content: string }> = {
  research: {
    name: "Sparse_MoE_Stability_Theorem_2026.md",
    content:
      "Theorem 5.1 proves auxiliary-loss-free dynamic bias updates preserve language model perplexity while stabilizing BF16 router logits across 128 experts. Experiment results across 40B active parameter checkpoints demonstrate 1.9% MMLU improvement under Iso-FLOP scaling laws.",
  },
  finance: {
    name: "FY26_Semiconductor_Capex_Ledger.csv",
    content:
      "LineItem,ActualM,BudgetM\nHBM4 CoWoS Interposer,2140,1480\nHigh-NA EUV Tooling,1310,1120\nOptical Transceiver Assy,1290,1210\nADAS SoC Wafer Run,790,760\nLegacy MCU Distribution,380,540\n",
  },
  enterprise: {
    name: "Edge_Gateway_SLA_Policy_v4.3.txt",
    content:
      "Production runbook for Anycast Edge POP failover and circuit-breaker policy rules. Incident latency SLA threshold is 42ms p99 with automated bot shedding and human-in-the-loop escalation.",
  },
};

type PendingAction =
  | { type: "FILE"; file: File }
  | { type: "SAMPLE"; sampleKey: "research" | "finance" | "enterprise" };

export default function App() {
  const [dataset, setDataset] = useState<PlatformDataset>(PLATFORM_SEED_DATA);
  const [masteredIds, setMasteredIds] = useState<string[]>(["fc_chinchilla"]);
  const [flashcardConfidence, setFlashcardConfidence] = useState<Record<string, number>>({
    fc_chinchilla: 5,
  });

  const [profile, setProfile] = useState<ContributorProfile | null>(() =>
    loadContributorProfile()
  );
  const [quota, setQuota] = useState<GuestQuotaState>(() => loadGuestQuota());

  const [isParsing, setIsParsing] = useState(false);
  const [parseStatus, setParseStatus] = useState("");

  const [adGateOpen, setAdGateOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authDefaultDomain, setAuthDefaultDomain] =
    useState<DisciplineDomain>("EDUCATION");

  const [hydrated, setHydrated] = useState(false);

  // Hydrate persisted workspace from IndexedDB / localStorage on mount
  useEffect(() => {
    let active = true;
    loadWorkspaceState().then((saved) => {
      if (!active) return;
      if (saved?.dataset) {
        setDataset(saved.dataset);
        setMasteredIds(saved.masteredFlashcardIds || []);
        setFlashcardConfidence(saved.flashcardConfidence || {});
      }
      setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Persist workspace mutations locally
  useEffect(() => {
    if (!hydrated) return;
    saveWorkspaceState({
      dataset,
      masteredFlashcardIds: masteredIds,
      flashcardConfidence,
      updatedAt: new Date().toISOString(),
    });
  }, [dataset, masteredIds, flashcardConfidence, hydrated]);

  const executePendingAction = async (action: PendingAction) => {
    setIsParsing(true);
    try {
      let fileToParse: File;
      if (action.type === "FILE") {
        fileToParse = action.file;
      } else {
        const sample = SAMPLE_CORPUS_FILES[action.sampleKey];
        fileToParse = new File([sample.content], sample.name, {
          type: sample.name.endsWith(".csv") ? "text/csv" : "text/plain",
        });
      }

      const ingested = await ingestClientFile(fileToParse, (detail) => {
        setParseStatus(detail);
      });

      const { dataset: nextDataset } = synthesizePlatformDatasetFromFile(
        ingested,
        dataset
      );
      setDataset(nextDataset);

      if (!profile) {
        setQuota((prev) => recordGuestAnalysis(prev));
      }
    } finally {
      setIsParsing(false);
      setParseStatus("");
    }
  };

  const requestGuardedAnalysis = (action: PendingAction) => {
    if (canGuestAnalyze(quota, profile)) {
      executePendingAction(action);
    } else {
      setPendingAction(action);
      setAdGateOpen(true);
    }
  };

  const handleUnlockFromAdCountdown = () => {
    const nextQuota = grantAdGateBonus(quota);
    setQuota(nextQuota);
    setAdGateOpen(false);
    if (pendingAction) {
      const action = pendingAction;
      setPendingAction(null);
      executePendingAction(action);
    }
  };

  const handleOpenAuth = (domain: DisciplineDomain = "EDUCATION") => {
    setAuthDefaultDomain(domain);
    setAuthModalOpen(true);
  };

  const handleAuthenticate = (newProfile: ContributorProfile) => {
    saveContributorProfile(newProfile);
    setProfile(newProfile);
    setAuthModalOpen(false);

    // If user clicked Sign In / Contributor Pass inside the Ad Gate, immediately fulfill pending analysis
    if (adGateOpen) {
      setAdGateOpen(false);
      if (pendingAction) {
        const action = pendingAction;
        setPendingAction(null);
        executePendingAction(action);
      }
    }
  };

  const handleSignOut = () => {
    saveContributorProfile(null);
    setProfile(null);
  };

  const pendingFileName =
    pendingAction?.type === "FILE"
      ? pendingAction.file.name
      : pendingAction?.type === "SAMPLE"
      ? SAMPLE_CORPUS_FILES[pendingAction.sampleKey].name
      : "Document";

  // Interactive mutations across Sections I, II, III
  const handleToggleMastered = (id: string) => {
    setMasteredIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleRateFlashcard = (id: string, rating: number) => {
    setFlashcardConfidence((prev) => ({ ...prev, [id]: rating }));
  };

  const handleAdjustErrorCount = (errorId: string, delta: number) => {
    setDataset((prev) => ({
      ...prev,
      errorVectors: prev.errorVectors.map((ev) =>
        ev.id === errorId ? { ...ev, count: Math.max(0, ev.count + delta) } : ev
      ),
    }));
  };

  const handleAddFlashcard = (card: StudyFlashcard) => {
    setDataset((prev) => ({
      ...prev,
      flashcards: [card, ...prev.flashcards],
    }));
  };

  const handleAddMarginCritique = (critique: MarginCritique) => {
    setDataset((prev) => ({
      ...prev,
      marginCritiques: [critique, ...prev.marginCritiques],
    }));
  };

  const handleAddAlphaScenario = (scenario: AlphaScenario) => {
    setDataset((prev) => ({
      ...prev,
      alphaScenarios: [scenario, ...prev.alphaScenarios],
    }));
  };

  const handleToggleRule = (ruleId: string) => {
    setDataset((prev) => ({
      ...prev,
      enterpriseRules: prev.enterpriseRules.map((r) =>
        r.id === ruleId ? { ...r, enabled: !r.enabled } : r
      ),
    }));
  };

  const handleUpdateRuleCondition = (ruleId: string, condition: string) => {
    setDataset((prev) => ({
      ...prev,
      enterpriseRules: prev.enterpriseRules.map((r) =>
        r.id === ruleId ? { ...r, condition } : r
      ),
    }));
  };

  const handleResolveHitl = (
    itemId: string,
    decision: "APPROVED" | "REJECTED" | "ESCALATED"
  ) => {
    const target = dataset.hitlQueue.find((h) => h.id === itemId);
    setDataset((prev) => ({
      ...prev,
      hitlQueue: prev.hitlQueue.filter((h) => h.id !== itemId),
      auditTrail: [
        {
          id: `aud_hitl_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          actor: profile?.handle || "@guest_operator",
          version: "v4.2",
          action: `HITL_${decision}`,
          diffSummary: target
            ? `${decision}: ${target.title} (${target.ruleTriggered})`
            : `Checkpoint ${decision}`,
        },
        ...prev.auditTrail,
      ],
    }));
  };

  const handleAddEnterpriseRule = (rule: EnterpriseRule) => {
    setDataset((prev) => ({
      ...prev,
      enterpriseRules: [...prev.enterpriseRules, rule],
      auditTrail: [
        {
          id: `aud_pr_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          actor: rule.authorHandle || "@operator",
          version: rule.version,
          action: "RULE_PR_MERGE",
          diffSummary: `Merged ${rule.id} (${rule.name}): ${rule.condition}`,
        },
        ...prev.auditTrail,
      ],
    }));
  };

  const handleUpvoteRule = (ruleId: string) => {
    setDataset((prev) => ({
      ...prev,
      enterpriseRules: prev.enterpriseRules.map((r) =>
        r.id === ruleId ? { ...r, votes: (r.votes || 0) + 1 } : r
      ),
    }));
  };

  const handleRebalancePods = () => {
    setDataset((prev) => ({
      ...prev,
      teamPods: prev.teamPods.map((p) => {
        const nextPct =
          p.utilizationPct >= 85
            ? Math.max(72, p.utilizationPct - 11)
            : Math.min(82, p.utilizationPct + 4);
        return {
          ...p,
          utilizationPct: nextPct,
          status:
            nextPct >= 90 ? "OVERLOAD" : nextPct >= 80 ? "ELEVATED" : "BALANCED",
        };
      }),
    }));
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#292524]">
      {/* 3-Zone Editorial Header */}
      <header className="sticky top-0 z-40 border-b border-[#EAE6DF]/90 bg-[#FBF9F5]/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-8">
          {/* Left Wordmark */}
          <a
            href="#workspace"
            className="flex items-center gap-2 font-editorial text-xl font-semibold tracking-tight text-[#1C1917]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 19 L12 4 L20 19 M7.5 14 H16.5"
                stroke="#1E3A2B"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Morphos
          </a>

          {/* Center Navigation Links */}
          <nav
            aria-label="Primary sections"
            className="hidden md:flex items-center gap-7 text-xs font-medium text-[#57534E]"
          >
            <a href="#education" className="transition hover:text-[#1C1917]">
              Education
            </a>
            <a href="#finance" className="transition hover:text-[#1C1917]">
              Finance
            </a>
            <a href="#enterprise" className="transition hover:text-[#1C1917]">
              Enterprise
            </a>
            <a href="#contributions" className="transition hover:text-[#1C1917]">
              Contributions
            </a>
          </nav>

          {/* Right Action / Contributor State */}
          <div className="flex items-center gap-2.5">
            {profile ? (
              <>
                <span className="font-mono-tabular text-xs font-medium text-[#1E3A2B]">
                  {profile.handle}
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  aria-label="Sign out contributor pass"
                  className="inline-flex items-center gap-1 rounded-lg border border-[#EAE6DF] bg-[#FFFFFF] px-2.5 py-1.5 text-xs text-[#57534E] hover:bg-[#F5F2EB]"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleOpenAuth("EDUCATION")}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#57534E] hover:text-[#1C1917]"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => requestGuardedAnalysis({ type: "SAMPLE", sampleKey: "finance" })}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#3F4E34] px-3.5 py-1.5 text-xs font-medium text-[#FBF9F5] transition hover:bg-[#1E3A2B]"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Run Sample
                </button>
              </>
            )}
          </div>
        </div>
        <nav
          aria-label="Mobile section navigation"
          className="flex md:hidden items-center justify-center gap-5 border-t border-[#EAE6DF]/70 py-2 text-[11px] font-medium text-[#57534E]"
        >
          <a href="#education" className="hover:text-[#1C1917]">
            Education
          </a>
          <a href="#finance" className="hover:text-[#1C1917]">
            Finance
          </a>
          <a href="#enterprise" className="hover:text-[#1C1917]">
            Enterprise
          </a>
        </nav>
      </header>

      <main>
        {/* Component #01: Editorial Dropzone & Hero Orchestrator */}
        <EditorialHero
          dataset={dataset}
          quota={quota}
          profile={profile}
          isParsing={isParsing}
          parseStatus={parseStatus}
          onSelectFile={(file) => requestGuardedAnalysis({ type: "FILE", file })}
          onAnalyzeSample={(sampleKey) =>
            requestGuardedAnalysis({ type: "SAMPLE", sampleKey })
          }
        />

        {/* Section I: Components #02 – #10 */}
        <EducationSection
          dataset={dataset}
          profile={profile}
          masteredIds={masteredIds}
          flashcardConfidence={flashcardConfidence}
          onToggleMastered={handleToggleMastered}
          onRateFlashcard={handleRateFlashcard}
          onAdjustErrorCount={handleAdjustErrorCount}
          onAddFlashcard={handleAddFlashcard}
          onAddMarginCritique={handleAddMarginCritique}
          onOpenAuth={() => handleOpenAuth("EDUCATION")}
        />

        {/* Section II: Components #11 – #20 */}
        <FinanceSection
          dataset={dataset}
          profile={profile}
          onAddAlphaScenario={handleAddAlphaScenario}
          onOpenAuth={() => handleOpenAuth("FINANCE")}
        />

        {/* Section III: Components #21 – #30 */}
        <EnterpriseSection
          dataset={dataset}
          profile={profile}
          onToggleRule={handleToggleRule}
          onUpdateRuleCondition={handleUpdateRuleCondition}
          onResolveHitl={handleResolveHitl}
          onAddEnterpriseRule={handleAddEnterpriseRule}
          onUpvoteRule={handleUpvoteRule}
          onRebalancePods={handleRebalancePods}
          onOpenAuth={() => handleOpenAuth("ENTERPRISE")}
        />
      </main>

      {/* Editorial Footer */}
      <footer
        id="contributions"
        className="border-t border-[#EAE6DF] bg-[#F5F2EB]/60 py-10"
      >
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-8 text-xs text-[#78716C]">
          <div>
            <span className="font-editorial text-base font-semibold text-[#1C1917]">
              Morphos
            </span>{" "}
            · 30 Interactive Modules · Browser-Native Client Compute
          </div>
          <div className="font-mono-tabular">
            IndexedDB &amp; localStorage persistence · Zero external backend
          </div>
        </div>
      </footer>

      {/* Compulsory 15-Second Sponsor Ad Gate */}
      <AdGateModal
        isOpen={adGateOpen}
        pendingFileName={pendingFileName}
        onUnlockAfterCountdown={handleUnlockFromAdCountdown}
        onOpenAuthPass={() => handleOpenAuth("EDUCATION")}
      />

      {/* Local Contributor Auth Modal */}
      <AuthGateModal
        isOpen={authModalOpen}
        defaultDomain={authDefaultDomain}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticate={handleAuthenticate}
      />
    </div>
  );
}
