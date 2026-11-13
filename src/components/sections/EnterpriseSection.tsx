import React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
} from "lucide-react";
import { BotanicalSectionEmblem } from "../BotanicalFraming";
import {
  ContributorProfile,
  EnterpriseRule,
  PlatformDataset,
} from "../../types/platform";
import { evaluateRuleCondition } from "../../utils/safeRuleEvaluator";

interface EnterpriseSectionProps {
  dataset: PlatformDataset;
  profile: ContributorProfile | null;
  onToggleRule: (ruleId: string) => void;
  onUpdateRuleCondition: (ruleId: string, condition: string) => void;
  onResolveHitl: (itemId: string, decision: "APPROVED" | "REJECTED" | "ESCALATED") => void;
  onAddEnterpriseRule: (rule: EnterpriseRule) => void;
  onUpvoteRule: (ruleId: string) => void;
  onRebalancePods: () => void;
  onOpenAuth: () => void;
}

export function EnterpriseSection({
  dataset,
  profile,
  onToggleRule,
  onUpdateRuleCondition,
  onResolveHitl,
  onAddEnterpriseRule,
  onUpvoteRule,
  onRebalancePods,
  onOpenAuth,
}: EnterpriseSectionProps) {
  const [selectedRuleId, setSelectedRuleId] = useState(
    dataset.enterpriseRules[0]?.id || "ENT-01"
  );

  // #22 Live Rule Payload Test Lab variables
  const [testP99, setTestP99] = useState(48);
  const [testErrRate, setTestErrRate] = useState(1.2);
  const [testAutoApprove, setTestAutoApprove] = useState(false);
  const [testRegionTier, setTestRegionTier] = useState("TIER_0");

  // #23 Telemetry filter
  const [slaFilter, setSlaFilter] = useState<"ALL" | "BREACH" | "WARN">("ALL");

  // #26 Selected mesh node
  const [selectedMeshId, setSelectedMeshId] = useState(
    dataset.serviceMesh[2]?.id || "policy"
  );

  // #30 Rule PR Studio
  const [prName, setPrName] = useState("");
  const [prCondition, setPrCondition] = useState(
    "IF p99_latency >= 55 AND error_rate >= 1.5 THEN escalate_sre"
  );
  const [prOutcome, setPrOutcome] = useState("");
  const [prSeverity, setPrSeverity] = useState<"LOW" | "MEDIUM" | "CRITICAL">("MEDIUM");
  const [prFeedback, setPrFeedback] = useState("");

  const activeRule =
    dataset.enterpriseRules.find((r) => r.id === selectedRuleId) ||
    dataset.enterpriseRules[0];

  const payloadVars = useMemo(
    () => ({
      p99_latency: testP99,
      error_rate: testErrRate,
      auto_approve: testAutoApprove,
      region_tier: testRegionTier,
    }),
    [testP99, testErrRate, testAutoApprove, testRegionTier]
  );

  const ruleEvaluations = useMemo(
    () =>
      dataset.enterpriseRules.map((rule) => ({
        rule,
        evalResult: rule.enabled
          ? evaluateRuleCondition(rule.condition, payloadVars)
          : { matched: false },
      })),
    [dataset.enterpriseRules, payloadVars]
  );

  const filteredTelemetry = useMemo(
    () =>
      slaFilter === "ALL"
        ? dataset.slaTelemetry
        : dataset.slaTelemetry.filter((ev) => ev.severity === slaFilter),
    [dataset.slaTelemetry, slaFilter]
  );

  const prDryRun = useMemo(
    () => evaluateRuleCondition(prCondition, payloadVars),
    [prCondition, payloadVars]
  );

  const handlePublishRulePr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      onOpenAuth();
      return;
    }
    if (!prName.trim() || !prCondition.trim() || prDryRun.error) return;
    const nextId = `ENT-0${dataset.enterpriseRules.length + 1}`;
    onAddEnterpriseRule({
      id: nextId,
      name: prName.trim(),
      condition: prCondition.trim(),
      outcome: prOutcome.trim() || "Routes ticket to Tier-1 SRE escalation policy.",
      severity: prSeverity,
      enabled: true,
      version: "v4.3",
      votes: 1,
      authorHandle: profile.handle,
    });
    setSelectedRuleId(nextId);
    setPrName("");
    setPrOutcome("");
    setPrFeedback(`Merged ${nextId} into active policy bundle v4.3.`);
  };

  // #28 SLA Compliance Gauge math
  const slaCompliancePct = 99.94;
  const slaRadius = 42;
  const slaCirc = 2 * Math.PI * slaRadius;
  const slaOffset = slaCirc * (1 - slaCompliancePct / 100);

  return (
    <section id="enterprise" className="border-t border-[#EAE6DF] py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-3 flex justify-center">
            <BotanicalSectionEmblem variant="bee" />
          </div>
          <p className="font-mono-tabular text-[11px] uppercase tracking-[0.14em] text-[#78716C]">
            Section III · Components 21 – 30 · Enterprise & Workflow Governance
          </p>
          <h2 className="font-editorial mt-2 text-3xl sm:text-5xl text-[#1C1917] leading-tight">
            Automated work,{" "}
            <span className="italic block sm:inline text-[#1E3A2B]">
              human safety
            </span>
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#57534E]">
            Every deterministic rule runs with live payload sandboxing, human-in-the-loop
            approvals, and an immutable browser-persisted audit ledger.
          </p>
        </div>

        {/* Row 1: #21 Deterministic Rule Canvas Editor + #22 Live Rule Payload Test Lab */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Component #21: Deterministic IF/THEN Rule Canvas Editor */}
          <div className="editorial-card rounded-2xl p-6 lg:col-span-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#3F4E34]">
                  21 · Deterministic Rule Canvas
                </p>
                <h3 className="font-editorial text-xl text-[#1C1917] mt-0.5">
                  Production IF / THEN Guardrails
                </h3>
              </div>
              <span className="font-mono-tabular text-xs text-[#78716C]">
                {dataset.enterpriseRules.filter((r) => r.enabled).length} Active
              </span>
            </div>

            <div className="mt-4 space-y-2.5">
              {dataset.enterpriseRules.map((rule) => {
                const selected = rule.id === activeRule?.id;
                return (
                  <div
                    key={rule.id}
                    className={`rounded-xl border p-3.5 transition ${
                      selected
                        ? "border-[#3F4E34] bg-[#F5F2EB]"
                        : "border-[#EAE6DF] bg-[#FBF9F5]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedRuleId(rule.id)}
                        className="text-left text-xs font-semibold text-[#1C1917] hover:underline"
                      >
                        <span className="font-mono-tabular text-[#92400E] mr-1.5">
                          {rule.id}
                        </span>
                        {rule.name}
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onUpvoteRule(rule.id)}
                          aria-label={`Upvote ${rule.id}`}
                          className="inline-flex items-center gap-1 font-mono-tabular text-[11px] text-[#57534E] hover:text-[#1C1917]"
                        >
                          <ThumbsUp className="h-3 w-3" />
                          {rule.votes || 0}
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleRule(rule.id)}
                          className={`rounded px-2 py-0.5 font-mono-tabular text-[10px] font-medium ${
                            rule.enabled
                              ? "bg-[#1E3A2B] text-[#FBF9F5]"
                              : "bg-[#EAE6DF] text-[#57534E]"
                          }`}
                        >
                          {rule.enabled ? "ENABLED" : "PAUSED"}
                        </button>
                      </div>
                    </div>

                    {selected ? (
                      <div className="mt-2.5">
                        <label
                          htmlFor={`rule-cond-${rule.id}`}
                          className="sr-only"
                        >
                          Edit condition for {rule.id}
                        </label>
                        <input
                          id={`rule-cond-${rule.id}`}
                          type="text"
                          value={rule.condition}
                          onChange={(e) =>
                            onUpdateRuleCondition(rule.id, e.target.value)
                          }
                          className="w-full rounded-lg border border-[#D6D0C4] bg-[#FFFFFF] px-2.5 py-1.5 font-mono-tabular text-[11px] text-[#1C1917]"
                        />
                        <p className="mt-1.5 text-[11px] text-[#57534E]">
                          Outcome: {rule.outcome}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-1 font-mono-tabular text-[11px] text-[#78716C] truncate">
                        {rule.condition}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Component #22: Live Rule Payload Test Lab */}
          <div className="editorial-card rounded-2xl p-6 lg:col-span-6">
            <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#92400E]">
              22 · Live Rule Payload Test Lab
            </p>
            <h3 className="font-editorial text-xl text-[#1C1917] mt-0.5">
              Zero-Eval AST Policy Simulator
            </h3>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label htmlFor="lab-p99" className="block text-[11px] font-medium text-[#57534E] mb-1">
                  p99_latency (ms)
                </label>
                <input
                  id="lab-p99"
                  type="number"
                  value={testP99}
                  onChange={(e) => setTestP99(Number(e.target.value))}
                  className="w-full rounded-lg border border-[#EAE6DF] bg-[#FBF9F5] px-2.5 py-1.5 font-mono-tabular text-xs text-[#1C1917]"
                />
              </div>
              <div>
                <label htmlFor="lab-err" className="block text-[11px] font-medium text-[#57534E] mb-1">
                  error_rate (%)
                </label>
                <input
                  id="lab-err"
                  type="number"
                  step={0.1}
                  value={testErrRate}
                  onChange={(e) => setTestErrRate(Number(e.target.value))}
                  className="w-full rounded-lg border border-[#EAE6DF] bg-[#FBF9F5] px-2.5 py-1.5 font-mono-tabular text-xs text-[#1C1917]"
                />
              </div>
              <div>
                <label htmlFor="lab-tier" className="block text-[11px] font-medium text-[#57534E] mb-1">
                  region_tier
                </label>
                <select
                  id="lab-tier"
                  value={testRegionTier}
                  onChange={(e) => setTestRegionTier(e.target.value)}
                  className="w-full rounded-lg border border-[#EAE6DF] bg-[#FBF9F5] px-2 py-1.5 font-mono-tabular text-xs text-[#1C1917]"
                >
                  <option value="TIER_0">TIER_0</option>
                  <option value="TIER_1">TIER_1</option>
                  <option value="TIER_3">TIER_3</option>
                </select>
              </div>
              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2 rounded-lg border border-[#EAE6DF] bg-[#FBF9F5] px-2.5 py-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={testAutoApprove}
                    onChange={(e) => setTestAutoApprove(e.target.checked)}
                    className="h-3.5 w-3.5 accent-[#3F4E34]"
                  />
                  <span className="font-mono-tabular text-[11px]">auto_approve</span>
                </label>
              </div>
            </div>

            <div className="mt-4 space-y-2 border-t border-[#EAE6DF] pt-4">
              {ruleEvaluations.map(({ rule, evalResult }) => (
                <div
                  key={rule.id}
                  className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs ${
                    !rule.enabled
                      ? "border-[#EAE6DF] bg-[#FBF9F5] text-[#A8A29E]"
                      : evalResult.matched
                      ? "border-[#C2410C]/40 bg-[#FBF3F0] text-[#1C1917]"
                      : "border-[#EAE6DF] bg-[#FFFFFF] text-[#57534E]"
                  }`}
                >
                  <div>
                    <span className="font-mono-tabular font-semibold mr-2">
                      {rule.id}
                    </span>
                    <span>{rule.name}</span>
                  </div>
                  <span
                    className={`font-mono-tabular text-[11px] font-semibold ${
                      !rule.enabled
                        ? "text-[#A8A29E]"
                        : evalResult.matched
                        ? "text-[#C2410C]"
                        : "text-[#1E3A2B]"
                    }`}
                  >
                    {!rule.enabled
                      ? "PAUSED"
                      : evalResult.matched
                      ? "TRIGGERED"
                      : "CLEAR"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: #23 SLA Telemetry + #24 Team Capacity + #25 HITL Review Stack */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Component #23: SLA Breach & Bottleneck Telemetry Feed */}
          <div className="editorial-card rounded-2xl p-6 lg:col-span-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#C2410C]">
                  23 · SLA Telemetry Feed
                </p>
                <h3 className="font-editorial text-xl text-[#1C1917] mt-0.5">
                  Bottleneck Stream
                </h3>
              </div>
              <div className="flex gap-1 text-[11px] font-mono-tabular">
                {(["ALL", "BREACH", "WARN"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSlaFilter(tab)}
                    className={`rounded px-2 py-1 ${
                      slaFilter === tab
                        ? "bg-[#1C1917] text-[#FBF9F5]"
                        : "text-[#78716C] hover:bg-[#F5F2EB]"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              {filteredTelemetry.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-xl border border-[#EAE6DF] bg-[#FBF9F5] p-3 text-xs"
                >
                  <div className="flex items-center justify-between font-mono-tabular text-[10px]">
                    <span className="text-[#78716C]">
                      {ev.timestamp} · {ev.service}
                    </span>
                    <span
                      className={
                        ev.severity === "BREACH"
                          ? "font-semibold text-[#C2410C]"
                          : ev.severity === "WARN"
                          ? "font-semibold text-[#92400E]"
                          : "text-[#1E3A2B]"
                      }
                    >
                      {ev.metric}
                    </span>
                  </div>
                  <p className="mt-1 text-[#292524]">{ev.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Component #24: Team Capacity & Resource Allocation Grid */}
          <div className="editorial-card rounded-2xl p-6 lg:col-span-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#3F4E34]">
                  24 · Team Capacity Grid
                </p>
                <h3 className="font-editorial text-xl text-[#1C1917] mt-0.5">
                  Pod Bandwidth Balance
                </h3>
              </div>
              <button
                type="button"
                onClick={onRebalancePods}
                className="rounded-lg border border-[#EAE6DF] px-2.5 py-1 text-[11px] font-medium text-[#1C1917] hover:bg-[#F5F2EB]"
              >
                Rebalance
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {dataset.teamPods.map((pod) => {
                const barColor =
                  pod.utilizationPct >= 90
                    ? "bg-[#C2410C]"
                    : pod.utilizationPct >= 80
                    ? "bg-[#92400E]"
                    : "bg-[#3F4E34]";
                return (
                  <div key={pod.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#1C1917]">
                        {pod.podName}{" "}
                        <span className="text-[11px] font-normal text-[#78716C]">
                          ({pod.lead})
                        </span>
                      </span>
                      <span className="font-mono-tabular text-[11px] text-[#57534E]">
                        {pod.utilizationPct}% · {pod.activeTasks} tasks
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#EAE6DF]">
                      <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${Math.min(100, pod.utilizationPct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Component #25: Human-in-the-Loop (HITL) Review & Escalation Stack */}
          <div className="editorial-card rounded-2xl p-6 lg:col-span-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#92400E]">
                  25 · HITL Escalation Stack
                </p>
                <h3 className="font-editorial text-xl text-[#1C1917] mt-0.5">
                  Human Checkpoints
                </h3>
              </div>
              <span className="font-mono-tabular text-xs font-semibold text-[#C2410C]">
                {dataset.hitlQueue.length} Pending
              </span>
            </div>

            {dataset.hitlQueue.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-[#D6D0C4] bg-[#FBF9F5] p-6 text-center">
                <CheckCircle2 className="mx-auto h-5 w-5 text-[#1E3A2B]" />
                <p className="mt-2 text-xs font-medium text-[#1C1917]">
                  All checkpoints cleared.
                </p>
                <p className="mt-0.5 text-[11px] text-[#78716C]">
                  Decisions recorded in the Policy Audit Trail below.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {dataset.hitlQueue.slice(0, 2).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-[#EAE6DF] bg-[#FBF9F5] p-3.5"
                  >
                    <div className="flex items-center justify-between font-mono-tabular text-[10px] text-[#78716C]">
                      <span>{item.ruleTriggered}</span>
                      <span>Conf {(item.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-[#1C1917]">
                      {item.title}
                    </p>
                    <p className="mt-1 font-mono-tabular text-[10px] text-[#57534E]">
                      {item.payloadSummary}
                    </p>
                    <div className="mt-3 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onResolveHitl(item.id, "APPROVED")}
                        className="inline-flex items-center gap-1 rounded-md bg-[#1E3A2B] px-2.5 py-1 text-[11px] font-medium text-[#FBF9F5] hover:bg-[#2A4E3A]"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => onResolveHitl(item.id, "REJECTED")}
                        className="inline-flex items-center gap-1 rounded-md border border-[#EAE6DF] bg-[#FFFFFF] px-2.5 py-1 text-[11px] font-medium text-[#C2410C] hover:bg-[#FBF3F0]"
                      >
                        <XCircle className="h-3 w-3" />
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => onResolveHitl(item.id, "ESCALATED")}
                        className="inline-flex items-center gap-1 rounded-md border border-[#EAE6DF] bg-[#FFFFFF] px-2.5 py-1 text-[11px] font-medium text-[#92400E] hover:bg-[#F5F2EB]"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        Escalate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 3: #26 System Architecture Topology + #27 Policy Audit Trail + #28 SLA Gauge */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Component #26: System Architecture & Service Dependency Topology */}
          <div className="editorial-card rounded-2xl p-6 lg:col-span-5">
            <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#3F4E34]">
              26 · Service Mesh Topology
            </p>
            <h3 className="font-editorial text-xl text-[#1C1917] mt-0.5">
              Ingress to Audit Dependency
            </h3>

            <div className="mt-4 rounded-xl border border-[#EAE6DF] bg-[#FBF9F5] p-3">
              <svg viewBox="0 0 460 136" className="w-full h-32" role="img" aria-label="Service architecture topology">
                <line x1="68" y1="68" x2="180" y2="38" stroke="#D6D0C4" strokeWidth="1.6" />
                <line x1="68" y1="68" x2="280" y2="92" stroke="#D6D0C4" strokeWidth="1.6" />
                <line x1="180" y1="38" x2="280" y2="92" stroke="#D6D0C4" strokeWidth="1.6" />
                <line x1="280" y1="92" x2="394" y2="56" stroke="#D6D0C4" strokeWidth="1.6" />
                {dataset.serviceMesh.map((node, idx) => {
                  const coords = [
                    { x: 68, y: 68 },
                    { x: 180, y: 38 },
                    { x: 280, y: 92 },
                    { x: 394, y: 56 },
                  ][idx] || { x: 75 + idx * 100, y: 68 };
                  const active = node.id === selectedMeshId;
                  return (
                    <g
                      key={node.id}
                      onClick={() => setSelectedMeshId(node.id)}
                      tabIndex={0}
                      role="button"
                      aria-label={`Inspect service ${node.label}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedMeshId(node.id);
                        }
                      }}
                      className="cursor-pointer outline-none"
                    >
                      <rect
                        x={coords.x - 48}
                        y={coords.y - 20}
                        width="96"
                        height="40"
                        rx="8"
                        fill={active ? "#1C1917" : "#FFFFFF"}
                        stroke={node.loadPct >= 85 ? "#C2410C" : "#3F4E34"}
                        strokeWidth={active ? 2 : 1.4}
                      />
                      <text
                        x={coords.x}
                        y={coords.y - 2}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="600"
                        fill={active ? "#FBF9F5" : "#1C1917"}
                      >
                        {node.label}
                      </text>
                      <text
                        x={coords.x}
                        y={coords.y + 12}
                        textAnchor="middle"
                        fontSize="8.5"
                        fontFamily="JetBrains Mono, monospace"
                        fill={active ? "#A7C4A0" : "#78716C"}
                      >
                        {node.p99Ms}ms · {node.loadPct}%
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            {(() => {
              const node = dataset.serviceMesh.find((n) => n.id === selectedMeshId);
              return node ? (
                <p className="mt-2.5 font-mono-tabular text-[11px] text-[#57534E]">
                  {node.label}: {node.rps} req/s · P99 {node.p99Ms}ms · Load {node.loadPct}%
                </p>
              ) : null;
            })()}
          </div>

          {/* Component #27: Policy Audit Trail & Diff Log */}
          <div className="editorial-card rounded-2xl p-6 lg:col-span-4">
            <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#92400E]">
              27 · Policy Audit Trail
            </p>
            <h3 className="font-editorial text-xl text-[#1C1917] mt-0.5">
              Immutable Diff Log
            </h3>
            <div className="mt-4 max-h-48 overflow-y-auto space-y-2.5 pr-1">
              {dataset.auditTrail.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-[#EAE6DF] bg-[#FBF9F5] p-3 text-xs"
                >
                  <div className="flex items-center justify-between font-mono-tabular text-[10px] text-[#78716C]">
                    <span>
                      {entry.timestamp} · {entry.actor}
                    </span>
                    <span className="text-[#1E3A2B] font-semibold">
                      {entry.version} · {entry.action}
                    </span>
                  </div>
                  <p className="mt-1 text-[#292524]">{entry.diffSummary}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Component #28: Executive SLA Compliance Radial Gauge (Dark Slate Anchor) */}
          <div className="editorial-dark-card rounded-2xl p-6 lg:col-span-3 flex flex-col justify-between">
            <div>
              <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#A8A29E]">
                28 · Executive SLA Gauge
              </p>
              <h3 className="font-editorial text-xl text-[#FBF9F5] mt-0.5">
                Fleet Uptime
              </h3>
            </div>
            <div className="my-3 flex items-center justify-center">
              <div className="relative flex items-center justify-center">
                <svg width="110" height="110" viewBox="0 0 110 110" aria-hidden="true">
                  <circle
                    cx="55"
                    cy="55"
                    r={slaRadius}
                    fill="none"
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth="7"
                  />
                  <circle
                    cx="55"
                    cy="55"
                    r={slaRadius}
                    fill="none"
                    stroke="#A7C4A0"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={slaCirc}
                    strokeDashoffset={slaOffset}
                    transform="rotate(-90 55 55)"
                  />
                </svg>
                <span className="absolute font-mono-tabular text-sm font-semibold text-[#FBF9F5]">
                  {slaCompliancePct}%
                </span>
              </div>
            </div>
            <p className="font-mono-tabular text-[11px] text-[#D6D3D1] text-center">
              Error Budget Remaining: 26.4m / 30d
            </p>
          </div>
        </div>

        {/* Row 4: #29 Workspace Operator Role Gate + #30 Rule PR & Enterprise Policy Studio */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Component #29: Workspace Operator Role Gate */}
          <div className="editorial-card rounded-2xl p-6 lg:col-span-4 flex flex-col justify-between">
            <div>
              <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#3F4E34]">
                29 · Operator Clearance Gate
              </p>
              <h3 className="font-editorial text-xl text-[#1C1917] mt-0.5">
                {profile ? `Operator ${profile.handle}` : "Policy Governance Role"}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#57534E]">
                {profile
                  ? `Active credentials: ${profile.clearanceLevel} at ${profile.organization}.`
                  : "Sign in locally as an Operator to author deterministic IF/THEN rule PRs and merge policy diffs."}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#EAE6DF]">
              {profile ? (
                <span className="inline-flex items-center gap-1.5 font-mono-tabular text-xs text-[#1E3A2B]">
                  <ShieldCheck className="h-4 w-4" />
                  Governance Write Access
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#3F4E34] px-3 py-2 text-xs font-medium text-[#FBF9F5] hover:bg-[#1E3A2B]"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Sign In as Operator
                </button>
              )}
            </div>
          </div>

          {/* Component #30: Rule PR & Enterprise Policy Contribution Studio */}
          <div className="editorial-card rounded-2xl p-6 lg:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#1E3A2B]">
                  30 · Rule PR & Policy Studio
                </p>
                <h3 className="font-editorial text-xl text-[#1C1917] mt-0.5">
                  Author, Dry-Run & Merge Policy Rules
                </h3>
              </div>
              <span className="font-mono-tabular text-xs text-[#78716C]">
                Dry-run vs Lab:{" "}
                <span className={prDryRun.matched ? "text-[#C2410C]" : "text-[#1E3A2B]"}>
                  {prDryRun.error
                    ? "SYNTAX ERROR"
                    : prDryRun.matched
                    ? "WOULD TRIGGER"
                    : "WOULD PASS"}
                </span>
              </span>
            </div>

            {!profile ? (
              <div className="mt-4 rounded-xl border border-dashed border-[#D6D0C4] bg-[#FBF9F5] p-5 text-center">
                <p className="text-xs text-[#57534E]">
                  Rule PR creation requires an authenticated Operator Pass.
                </p>
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="mt-3 rounded-lg bg-[#3F4E34] px-4 py-2 text-xs font-medium text-[#FBF9F5]"
                >
                  Authenticate Operator Pass
                </button>
              </div>
            ) : (
              <form onSubmit={handlePublishRulePr} className="mt-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="pr-name" className="block text-[11px] font-medium text-[#57534E] mb-1">
                      Policy Rule Title
                    </label>
                    <input
                      id="pr-name"
                      type="text"
                      value={prName}
                      onChange={(e) => setPrName(e.target.value)}
                      placeholder="e.g. Regional P99 Circuit Breaker"
                      className="w-full rounded-lg border border-[#EAE6DF] bg-[#FBF9F5] px-3 py-1.5 text-xs text-[#1C1917]"
                    />
                  </div>
                  <div>
                    <label htmlFor="pr-sev" className="block text-[11px] font-medium text-[#57534E] mb-1">
                      Severity
                    </label>
                    <select
                      id="pr-sev"
                      value={prSeverity}
                      onChange={(e) =>
                        setPrSeverity(e.target.value as "LOW" | "MEDIUM" | "CRITICAL")
                      }
                      className="w-full rounded-lg border border-[#EAE6DF] bg-[#FBF9F5] px-2.5 py-1.5 text-xs text-[#1C1917]"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="pr-outcome" className="block text-[11px] font-medium text-[#57534E] mb-1">
                      Action Outcome
                    </label>
                    <input
                      id="pr-outcome"
                      type="text"
                      value={prOutcome}
                      onChange={(e) => setPrOutcome(e.target.value)}
                      placeholder="Pages on-call & isolates region"
                      className="w-full rounded-lg border border-[#EAE6DF] bg-[#FBF9F5] px-3 py-1.5 text-xs text-[#1C1917]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="pr-cond" className="block text-[11px] font-medium text-[#57534E] mb-1">
                    Deterministic IF / THEN Condition
                  </label>
                  <input
                    id="pr-cond"
                    type="text"
                    value={prCondition}
                    onChange={(e) => setPrCondition(e.target.value)}
                    className="w-full rounded-lg border border-[#EAE6DF] bg-[#FBF9F5] px-3 py-1.5 font-mono-tabular text-xs text-[#1C1917]"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="submit"
                    className="rounded-lg bg-[#3F4E34] px-4 py-1.5 text-xs font-medium text-[#FBF9F5] hover:bg-[#1E3A2B]"
                  >
                    Merge Rule PR into Active Canvas
                  </button>
                  {prFeedback && (
                    <span className="font-mono-tabular text-[11px] text-[#1E3A2B]">
                      {prFeedback}
                    </span>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
