import React, { useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Eye,
  Plus,
  Minus,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BotanicalSectionEmblem } from "../BotanicalFraming";
import {
  ContributorProfile,
  PlatformDataset,
  StudyFlashcard,
  MarginCritique,
} from "../../types/platform";
import { computeStudyRetentionCurve } from "../../utils/analyticsMath";

interface EducationSectionProps {
  dataset: PlatformDataset;
  profile: ContributorProfile | null;
  masteredIds: string[];
  flashcardConfidence: Record<string, number>;
  onToggleMastered: (id: string) => void;
  onRateFlashcard: (id: string, rating: number) => void;
  onAdjustErrorCount: (errorId: string, delta: number) => void;
  onAddFlashcard: (card: StudyFlashcard) => void;
  onAddMarginCritique: (critique: MarginCritique) => void;
  onOpenAuth: () => void;
}

const DAG_COORDS: Record<string, { x: number; y: number }> = {
  softmax_gate: { x: 88, y: 110 },
  load_balance: { x: 245, y: 66 },
  z_loss: { x: 405, y: 66 },
  iso_flop: { x: 295, y: 168 },
  bias_free: { x: 515, y: 118 },
};

export function EducationSection({
  dataset,
  profile,
  masteredIds,
  flashcardConfidence,
  onToggleMastered,
  onRateFlashcard,
  onAdjustErrorCount,
  onAddFlashcard,
  onAddMarginCritique,
  onOpenAuth,
}: EducationSectionProps) {
  const [selectedNodeId, setSelectedNodeId] = useState(
    dataset.conceptDag[0]?.id || "softmax_gate"
  );
  const [activeCardIdx, setActiveCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Study Pacing Simulator (#4)
  const [weeklyHours, setWeeklyHours] = useState(12);
  const [complexity, setComplexity] = useState(6);
  const [halflifeDays, setHalflifeDays] = useState(7);

  // Theorem Modal (#5)
  const [selectedTheoremId, setSelectedTheoremId] = useState(
    dataset.theorems[0]?.id || ""
  );
  const [proofOpen, setProofOpen] = useState(false);

  // Heatmap selection (#6)
  const [selectedHeatmapChapter, setSelectedHeatmapChapter] = useState<string | null>(
    null
  );

  // Contribution Studio (#10)
  const [contribMode, setContribMode] = useState<"FLASHCARD" | "CRITIQUE">("FLASHCARD");
  const [fcConcept, setFcConcept] = useState("");
  const [fcLatex, setFcLatex] = useState("");
  const [fcExplanation, setFcExplanation] = useState("");
  const [fcFailure, setFcFailure] = useState("");
  const [mcChapter, setMcChapter] = useState("Ch. 03 — Router Z-Loss");
  const [mcNote, setMcNote] = useState("");
  const [contribFeedback, setContribFeedback] = useState("");

  const selectedNode =
    dataset.conceptDag.find((n) => n.id === selectedNodeId) || dataset.conceptDag[0];

  const safeCardIdx =
    dataset.flashcards.length > 0 ? activeCardIdx % dataset.flashcards.length : 0;
  const activeCard = dataset.flashcards[safeCardIdx];

  const retentionResult = useMemo(
    () => computeStudyRetentionCurve(weeklyHours, complexity, halflifeDays),
    [weeklyHours, complexity, halflifeDays]
  );

  const retentionPolyline = useMemo(() => {
    const pts = retentionResult.curve;
    if (pts.length === 0) return "20,110 380,40";
    return pts
      .map((pt, i) => {
        const x = 22 + (i / Math.max(1, pts.length - 1)) * 356;
        const y = 122 - (pt.retentionPct / 100) * 96;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [retentionResult]);

  const readinessPolyline = useMemo(() => {
    const pts = retentionResult.curve;
    if (pts.length === 0) return "20,120 380,50";
    return pts
      .map((pt, i) => {
        const x = 22 + (i / Math.max(1, pts.length - 1)) * 356;
        const y = 122 - (pt.readinessPct / 100) * 96;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [retentionResult]);

  const activeTheorem =
    dataset.theorems.find((t) => t.id === selectedTheoremId) || dataset.theorems[0];

  const handleContributionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      onOpenAuth();
      return;
    }
    if (contribMode === "FLASHCARD") {
      if (!fcConcept.trim() || !fcExplanation.trim()) return;
      onAddFlashcard({
        id: `fc_user_${Date.now()}`,
        concept: fcConcept.trim(),
        latexFormula: fcLatex.trim() || "E[X] = ∑ x_i · P(X = x_i)",
        explanation: fcExplanation.trim(),
        failureMode:
          fcFailure.trim() || "Check boundary constraints before applying approximation.",
        authorHandle: profile.handle,
      });
      setFcConcept("");
      setFcLatex("");
      setFcExplanation("");
      setFcFailure("");
      setActiveCardIdx(0);
      setContribFeedback("Peer flashcard added to active deck & persisted locally.");
    } else {
      if (!mcNote.trim()) return;
      onAddMarginCritique({
        id: `mc_user_${Date.now()}`,
        chapterTitle: mcChapter.trim(),
        note: mcNote.trim(),
        authorHandle: profile.handle,
        createdAt: new Date().toISOString().slice(0, 10),
      });
      setMcNote("");
      setContribFeedback("Margin critique published to scholarly ledger.");
    }
  };

  return (
    <section
      id="education"
      className="border-t border-[#EAE6DF] py-16 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-3 flex justify-center">
            <BotanicalSectionEmblem variant="sprig" />
          </div>
          <p className="font-mono-tabular text-[11px] uppercase tracking-[0.14em] text-[#78716C]">
            Section I · Components 02 – 10 · Education & Scholarly Research
          </p>
          <h2 className="font-editorial mt-2 text-3xl sm:text-5xl text-[#1C1917] leading-tight">
            Hours of reading,{" "}
            <span className="italic block sm:inline text-[#1E3A2B]">
              structured in minutes
            </span>
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#57534E]">
            Concept graphs, active recall drills, spaced-repetition curves, and
            peer margin annotations synthesized directly from your study corpus.
          </p>
        </div>

        {/* Row 1: #2 Concept Dependency DAG + #3 Active Recall Flashcards */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Component #2: Prerequisite Concept Dependency DAG */}
          <div className="editorial-card rounded-2xl p-6 lg:col-span-7">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#92400E]">
                  02 · Concept Dependency DAG
                </p>
                <h3 className="font-editorial text-xl text-[#1C1917] mt-0.5">
                  Theorem Prerequisite Topology
                </h3>
              </div>
              <span className="font-mono-tabular text-xs text-[#78716C]">
                {dataset.conceptDag.length} Nodes
              </span>
            </div>

            <div className="mt-4 rounded-xl border border-[#EAE6DF] bg-[#FBF9F5] p-3">
              <svg
                viewBox="0 0 600 220"
                className="w-full h-52"
                role="img"
                aria-label="Concept prerequisite dependency graph"
              >
                <defs>
                  <marker
                    id="dag-arrow"
                    markerWidth="6"
                    markerHeight="6"
                    refX="5"
                    refY="3"
                    orient="auto"
                  >
                    <path d="M0,0 L6,3 L0,6 Z" fill="#A8A29E" />
                  </marker>
                </defs>
                {/* Edges */}
                {dataset.conceptDag.flatMap((node) =>
                  node.prerequisites.map((preId) => {
                    const from = DAG_COORDS[preId] || { x: 80, y: 110 };
                    const to = DAG_COORDS[node.id] || { x: 300, y: 110 };
                    const isHighlighted =
                      selectedNodeId === node.id || selectedNodeId === preId;
                    return (
                      <line
                        key={`${preId}->${node.id}`}
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        stroke={isHighlighted ? "#1E3A2B" : "#D6D0C4"}
                        strokeWidth={isHighlighted ? 2.2 : 1.4}
                        markerEnd="url(#dag-arrow)"
                      />
                    );
                  })
                )}
                {/* Interactive Nodes */}
                {dataset.conceptDag.map((node, idx) => {
                  const pos = DAG_COORDS[node.id] || {
                    x: 90 + idx * 110,
                    y: 110,
                  };
                  const active = node.id === selectedNodeId;
                  return (
                    <g
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedNodeId(node.id);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Inspect concept ${node.title}`}
                      className="cursor-pointer outline-none"
                    >
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={active ? 22 : 18}
                        fill={active ? "#1E3A2B" : "#FFFFFF"}
                        stroke={active ? "#1E3A2B" : "#C7C0B5"}
                        strokeWidth={active ? 2.5 : 1.5}
                      />
                      <text
                        x={pos.x}
                        y={pos.y + 4}
                        textAnchor="middle"
                        fontSize="10"
                        fontFamily="JetBrains Mono, monospace"
                        fill={active ? "#FBF9F5" : "#1C1917"}
                      >
                        {node.tier.slice(0, 3).toUpperCase()}
                      </text>
                      <text
                        x={pos.x}
                        y={pos.y + 34}
                        textAnchor="middle"
                        fontSize="10.5"
                        fontWeight={active ? "600" : "500"}
                        fill="#1C1917"
                      >
                        {node.title}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {selectedNode && (
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-[#F5F2EB] p-4">
                <div>
                  <p className="font-mono-tabular text-[11px] text-[#3F4E34]">
                    {selectedNode.tier} · Mastery Weight {selectedNode.masteryWeight}h
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-[#1C1917]">
                    {selectedNode.title}
                  </p>
                  <p className="mt-1 text-xs text-[#57534E]">{selectedNode.summary}</p>
                </div>
                <div className="shrink-0 font-mono-tabular text-[11px] text-[#78716C]">
                  Prereqs:{" "}
                  {selectedNode.prerequisites.length > 0
                    ? selectedNode.prerequisites.join(", ")
                    : "Root Axiom"}
                </div>
              </div>
            )}
          </div>

          {/* Component #3: Active Recall & Diagnostic Flashcard Matrix */}
          <div className="editorial-card rounded-2xl p-6 lg:col-span-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#C2410C]">
                    03 · Active Recall Matrix
                  </p>
                  <h3 className="font-editorial text-xl text-[#1C1917] mt-0.5">
                    Diagnostic Flashcard Deck
                  </h3>
                </div>
                <span className="font-mono-tabular text-xs text-[#1E3A2B]">
                  {masteredIds.length}/{dataset.flashcards.length} Mastered
                </span>
              </div>

              {activeCard && (
                <div className="mt-4 rounded-xl border border-[#EAE6DF] bg-[#FBF9F5] p-4">
                  <div className="flex items-center justify-between text-[11px] font-mono-tabular text-[#78716C]">
                    <span>
                      Card {safeCardIdx + 1} / {dataset.flashcards.length}
                    </span>
                    <span>{activeCard.authorHandle || "@corpus"}</span>
                  </div>

                  <h4 className="mt-2 text-base font-semibold text-[#1C1917]">
                    {activeCard.concept}
                  </h4>

                  <div className="mt-2.5 rounded-lg bg-[#FFFFFF] border border-[#EAE6DF] px-3 py-2 font-mono-tabular text-xs text-[#1E3A2B]">
                    {activeCard.latexFormula}
                  </div>

                  <AnimatePresence mode="wait">
                    {flipped ? (
                      <motion.div
                        key="back"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="mt-3 space-y-2 text-xs leading-relaxed"
                      >
                        <p className="text-[#292524]">{activeCard.explanation}</p>
                        <p className="text-[#C2410C]">
                          <span className="font-semibold">Failure mode: </span>
                          {activeCard.failureMode}
                        </p>
                      </motion.div>
                    ) : (
                      <motion.p
                        key="front"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="mt-3 text-xs italic text-[#78716C]"
                      >
                        Formulate the derivation and failure edge-case mentally before
                        revealing the diagnostic note.
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setFlipped((f) => !f)}
                      className="rounded-lg border border-[#EAE6DF] bg-[#FFFFFF] px-3 py-1.5 text-xs font-medium text-[#1C1917] hover:bg-[#F5F2EB]"
                    >
                      {flipped ? "Hide Answer" : "Reveal Diagnostic"}
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleMastered(activeCard.id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        masteredIds.includes(activeCard.id)
                          ? "bg-[#1E3A2B] text-[#FBF9F5]"
                          : "border border-[#EAE6DF] bg-[#FFFFFF] text-[#292524] hover:bg-[#F5F2EB]"
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {masteredIds.includes(activeCard.id) ? "Mastered" : "Mark Mastered"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {activeCard && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#EAE6DF] pt-3">
                <div className="flex items-center gap-1" role="group" aria-label="Rate confidence 1 to 5">
                  <span className="text-[11px] text-[#78716C] mr-1">Confidence:</span>
                  {[1, 2, 3, 4, 5].map((rating) => {
                    const active = (flashcardConfidence[activeCard.id] || 0) === rating;
                    return (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => onRateFlashcard(activeCard.id, rating)}
                        aria-label={`Confidence ${rating} of 5`}
                        className={`h-6 w-6 rounded text-[11px] font-mono-tabular transition ${
                          active
                            ? "bg-[#3F4E34] text-[#FBF9F5]"
                            : "border border-[#EAE6DF] text-[#57534E] hover:bg-[#F5F2EB]"
                        }`}
                      >
                        {rating}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setFlipped(false);
                      setActiveCardIdx(
                        (i) => (i - 1 + dataset.flashcards.length) % dataset.flashcards.length
                      );
                    }}
                    className="rounded-lg border border-[#EAE6DF] px-2.5 py-1 text-xs text-[#57534E] hover:bg-[#F5F2EB]"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFlipped(false);
                      setActiveCardIdx((i) => (i + 1) % dataset.flashcards.length);
                    }}
                    className="rounded-lg border border-[#EAE6DF] px-2.5 py-1 text-xs text-[#57534E] hover:bg-[#F5F2EB]"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: #4 Study Pacing Simulator + #5 Theorem Inspector + #6 Chapter Heatmap */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Component #4: Study Pacing & Retention Simulator */}
          <div className="editorial-card rounded-2xl p-6 lg:col-span-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#3F4E34]">
                  04 · Study Pacing Simulator
                </p>
                <h3 className="font-editorial text-xl text-[#1C1917] mt-0.5">
                  Ebbinghaus Retention Curve
                </h3>
              </div>
              <div className="text-right">
                <p className="font-mono-tabular text-lg font-semibold text-[#1E3A2B]">
                  {retentionResult.examReadiness}%
                </p>
                <p className="font-mono-tabular text-[10px] text-[#78716C]">
                  28d Readiness
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-[#EAE6DF] bg-[#FBF9F5] p-3">
              <svg
                viewBox="0 0 400 140"
                className="w-full h-36"
                role="img"
                aria-label="28-day study retention and exam readiness curve"
              >
                <line x1="22" y1="26" x2="378" y2="26" stroke="#EAE6DF" strokeDasharray="3 3" />
                <line x1="22" y1="74" x2="378" y2="74" stroke="#EAE6DF" strokeDasharray="3 3" />
                <line x1="22" y1="122" x2="378" y2="122" stroke="#D6D0C4" />
                <polyline
                  fill="none"
                  stroke="#92400E"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                  points={retentionPolyline}
                />
                <polyline
                  fill="none"
                  stroke="#1E3A2B"
                  strokeWidth="2.5"
                  points={readinessPolyline}
                />
                <text x="24" y="16" fontSize="9.5" fill="#1E3A2B" fontFamily="JetBrains Mono, monospace">
                  — Exam Readiness
                </text>
                <text x="148" y="16" fontSize="9.5" fill="#92400E" fontFamily="JetBrains Mono, monospace">
                  -- Recall Retention
                </text>
              </svg>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="flex justify-between text-xs">
                  <label htmlFor="study-hours-slider" className="text-[#292524] font-medium">
                    Weekly Study Hours
                  </label>
                  <span className="font-mono-tabular text-[#1C1917]">{weeklyHours} hrs/wk</span>
                </div>
                <input
                  id="study-hours-slider"
                  type="range"
                  min={2}
                  max={28}
                  value={weeklyHours}
                  onChange={(e) => setWeeklyHours(Number(e.target.value))}
                  className="editorial-slider w-full mt-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-xs">
                    <label htmlFor="complexity-slider" className="text-[#57534E]">
                      Concept Depth
                    </label>
                    <span className="font-mono-tabular">{complexity}/10</span>
                  </div>
                  <input
                    id="complexity-slider"
                    type="range"
                    min={1}
                    max={10}
                    value={complexity}
                    onChange={(e) => setComplexity(Number(e.target.value))}
                    className="editorial-slider w-full mt-1.5"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs">
                    <label htmlFor="halflife-slider" className="text-[#57534E]">
                      Memory Halflife
                    </label>
                    <span className="font-mono-tabular">{halflifeDays}d</span>
                  </div>
                  <input
                    id="halflife-slider"
                    type="range"
                    min={2}
                    max={14}
                    value={halflifeDays}
                    onChange={(e) => setHalflifeDays(Number(e.target.value))}
                    className="editorial-slider w-full mt-1.5"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Component #5: Theorem & Proof Inspector Panel */}
          <div className="editorial-card rounded-2xl p-6 lg:col-span-3 flex flex-col justify-between">
            <div>
              <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#92400E]">
                05 · Theorem & Proof Inspector
              </p>
              <h3 className="font-editorial text-xl text-[#1C1917] mt-0.5">
                Formal Derivations
              </h3>

              <div className="mt-3 space-y-2">
                {dataset.theorems.map((thm) => {
                  const active = thm.id === activeTheorem?.id;
                  return (
                    <button
                      key={thm.id}
                      type="button"
                      onClick={() => setSelectedTheoremId(thm.id)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        active
                          ? "border-[#3F4E34] bg-[#F5F2EB]"
                          : "border-[#EAE6DF] bg-[#FBF9F5] hover:bg-[#F5F2EB]"
                      }`}
                    >
                      <p className="text-xs font-semibold text-[#1C1917]">{thm.name}</p>
                      <p className="mt-1 font-mono-tabular text-[11px] text-[#1E3A2B] truncate">
                        {thm.latex}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {activeTheorem && (
              <div className="mt-4 border-t border-[#EAE6DF] pt-3">
                <p className="text-[11px] text-[#78716C] line-clamp-2">
                  {activeTheorem.boundaryCondition}
                </p>
                <button
                  type="button"
                  onClick={() => setProofOpen(true)}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#1C1917] px-3 py-2 text-xs font-medium text-[#FBF9F5] hover:bg-[#292524]"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Inspect Full Proof
                </button>
              </div>
            )}
          </div>

          {/* Component #6: Cognitive Load & Chapter Difficulty Heatmap */}
          <div className="editorial-card rounded-2xl p-6 lg:col-span-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#C2410C]">
                  06 · Cognitive Load Heatmap
                </p>
                <h3 className="font-editorial text-xl text-[#1C1917] mt-0.5">
                  Chapter Entropy & Passes
                </h3>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EAE6DF] font-mono-tabular text-[10px] uppercase text-[#78716C]">
                    <th className="py-2 pr-2 font-medium">Chapter</th>
                    <th className="py-2 px-1 text-center font-medium">P1</th>
                    <th className="py-2 px-1 text-center font-medium">P2</th>
                    <th className="py-2 px-1 text-center font-medium">P3</th>
                    <th className="py-2 px-1 text-center font-medium">P4</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE6DF] text-xs">
                  {dataset.chapterHeatmap.map((row) => (
                    <tr
                      key={row.chapter}
                      onClick={() => setSelectedHeatmapChapter(row.chapter)}
                      className="cursor-pointer hover:bg-[#F5F2EB]/60"
                    >
                      <td className="py-2 pr-2 font-medium text-[#1C1917]">
                        <div>{row.chapter}</div>
                        <span className="font-mono-tabular text-[10px] text-[#78716C]">
                          Entropy {row.entropy}
                        </span>
                      </td>
                      {row.passes.map((score, pIdx) => {
                        const bg =
                          score >= 85
                            ? "bg-[#1E3A2B] text-[#FBF9F5]"
                            : score >= 65
                            ? "bg-[#E7ECE5] text-[#1E3A2B]"
                            : score >= 45
                            ? "bg-[#F4E9D8] text-[#92400E]"
                            : "bg-[#F7E3DC] text-[#C2410C]";
                        return (
                          <td key={pIdx} className="py-2 px-1 text-center">
                            <span
                              className={`inline-block w-9 rounded py-1 font-mono-tabular text-[11px] font-medium ${bg}`}
                            >
                              {score}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selectedHeatmapChapter && (
              <p className="mt-2 font-mono-tabular text-[11px] text-[#3F4E34]">
                Focused chapter: {selectedHeatmapChapter}
              </p>
            )}
          </div>
        </div>

        {/* Row 3: #7 Citation Lineage + #8 Error Classification Grid */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Component #7: Citation & Conceptual Lineage Timeline */}
          <div className="editorial-card rounded-2xl p-6 lg:col-span-6">
            <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#3F4E34]">
              07 · Citation Lineage Timeline
            </p>
            <h3 className="font-editorial text-xl text-[#1C1917] mt-0.5">
              Scholarly Evolution & Counterarguments
            </h3>

            <ol className="mt-4 space-y-3 border-l border-[#EAE6DF] pl-4">
              {dataset.citationTimeline.map((cit) => (
                <li key={cit.id} className="relative">
                  <div className="flex flex-wrap items-center gap-2 font-mono-tabular text-[11px]">
                    <span className="font-semibold text-[#1C1917]">{cit.year}</span>
                    <span className="text-[#78716C]">·</span>
                    <span className="text-[#57534E]">{cit.authors}</span>
                    <span className="text-[#78716C]">·</span>
                    <span
                      className={
                        cit.stance === "Breakthrough"
                          ? "text-[#1E3A2B] font-medium"
                          : cit.stance === "Counterargument"
                          ? "text-[#C2410C] font-medium"
                          : "text-[#92400E] font-medium"
                      }
                    >
                      {cit.stance}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm font-semibold text-[#1C1917]">{cit.title}</p>
                  <p className="mt-0.5 text-xs text-[#57534E]">{cit.takeaway}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Component #8: Exam Error-Classification Diagnostic Grid */}
          <div className="editorial-card rounded-2xl p-6 lg:col-span-6">
            <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#C2410C]">
              08 · Exam Error Diagnostic Grid
            </p>
            <h3 className="font-editorial text-xl text-[#1C1917] mt-0.5">
              Failure Vector Tallies & Remediation
            </h3>

            <div className="mt-4 space-y-3">
              {dataset.errorVectors.map((err) => (
                <div
                  key={err.id}
                  className="rounded-xl border border-[#EAE6DF] bg-[#FBF9F5] p-3.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-tabular text-xs font-semibold text-[#1C1917]">
                      {err.category} Error
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onAdjustErrorCount(err.id, -1)}
                        aria-label={`Decrement ${err.category} error tally`}
                        className="rounded border border-[#EAE6DF] bg-[#FFFFFF] p-1 text-[#57534E] hover:bg-[#F5F2EB]"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-7 text-center font-mono-tabular text-xs font-semibold text-[#C2410C]">
                        {err.count}
                      </span>
                      <button
                        type="button"
                        onClick={() => onAdjustErrorCount(err.id, 1)}
                        aria-label={`Increment ${err.category} error tally`}
                        className="rounded border border-[#EAE6DF] bg-[#FFFFFF] p-1 text-[#57534E] hover:bg-[#F5F2EB]"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-[#292524]">{err.description}</p>
                  <p className="mt-1 font-mono-tabular text-[11px] text-[#1E3A2B]">
                    Rx: {err.remediation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Row 4: #9 Scholar Profile Gate + #10 Peer Flashcard & Margin-Critique Studio */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Component #9: Scholar Profile & Sign-In Gate (Dark Slate Contrast Anchor) */}
          <div className="editorial-dark-card rounded-2xl p-6 lg:col-span-5 flex flex-col justify-between">
            <div>
              <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#A8A29E]">
                09 · Scholar Contributor Gate
              </p>
              <h3 className="font-editorial text-2xl text-[#FBF9F5] mt-1">
                {profile ? (
                  <>
                    Verified Scholar{" "}
                    <span className="italic text-[#A7C4A0]">{profile.handle}</span>
                  </>
                ) : (
                  <>
                    Join the{" "}
                    <span className="italic text-[#A7C4A0]">peer review table</span>
                  </>
                )}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#D6D3D1]">
                {profile
                  ? `${profile.name} · ${profile.organization} · ${profile.clearanceLevel}. Scope: ${profile.focusOrMandate}.`
                  : "Sign in locally to unlock unlimited browser analyses and publish peer flashcards and chapter margin critiques."}
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
              {profile ? (
                <span className="inline-flex items-center gap-1.5 font-mono-tabular text-xs text-[#A7C4A0]">
                  <ShieldCheck className="h-4 w-4" />
                  Peer Publishing Active
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#3F4E34] px-4 py-2 text-xs font-medium text-[#FBF9F5] hover:bg-[#4F6242]"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Sign In as Scholar
                </button>
              )}
              <span className="font-mono-tabular text-[11px] text-[#A8A29E]">
                {dataset.marginCritiques.length} Critiques
              </span>
            </div>
          </div>

          {/* Component #10: Peer Flashcard & Margin-Critique Contribution Studio */}
          <div className="editorial-card rounded-2xl p-6 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#3F4E34]">
                  10 · Scholar Contribution Studio
                </p>
                <h3 className="font-editorial text-xl text-[#1C1917] mt-0.5">
                  Publish Peer Flashcard or Margin Critique
                </h3>
              </div>

              <div className="flex items-center gap-1 rounded-lg border border-[#EAE6DF] bg-[#FBF9F5] p-1">
                <button
                  type="button"
                  onClick={() => setContribMode("FLASHCARD")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    contribMode === "FLASHCARD"
                      ? "bg-[#FFFFFF] text-[#1C1917] shadow-xs"
                      : "text-[#78716C]"
                  }`}
                >
                  Flashcard
                </button>
                <button
                  type="button"
                  onClick={() => setContribMode("CRITIQUE")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    contribMode === "CRITIQUE"
                      ? "bg-[#FFFFFF] text-[#1C1917] shadow-xs"
                      : "text-[#78716C]"
                  }`}
                >
                  Margin Critique
                </button>
              </div>
            </div>

            {!profile ? (
              <div className="mt-4 rounded-xl border border-dashed border-[#D6D0C4] bg-[#FBF9F5] p-5 text-center">
                <BookOpen className="mx-auto h-5 w-5 text-[#78716C]" />
                <p className="mt-2 text-xs text-[#57534E]">
                  Publishing new flashcards and margin critiques requires a local Scholar
                  Contributor Pass.
                </p>
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="mt-3 rounded-lg bg-[#3F4E34] px-4 py-2 text-xs font-medium text-[#FBF9F5] hover:bg-[#1E3A2B]"
                >
                  Unlock Contribution Studio
                </button>
              </div>
            ) : (
              <form onSubmit={handleContributionSubmit} className="mt-4 space-y-3">
                {contribMode === "FLASHCARD" ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="fc-concept" className="block text-[11px] font-medium text-[#57534E] mb-1">
                          Concept Title
                        </label>
                        <input
                          id="fc-concept"
                          type="text"
                          value={fcConcept}
                          onChange={(e) => setFcConcept(e.target.value)}
                          placeholder="e.g. Sparse Expert Capacity Bound"
                          className="w-full rounded-lg border border-[#EAE6DF] bg-[#FBF9F5] px-3 py-1.5 text-xs text-[#1C1917]"
                        />
                      </div>
                      <div>
                        <label htmlFor="fc-latex" className="block text-[11px] font-medium text-[#57534E] mb-1">
                          Formula / LaTeX
                        </label>
                        <input
                          id="fc-latex"
                          type="text"
                          value={fcLatex}
                          onChange={(e) => setFcLatex(e.target.value)}
                          placeholder="H(p) = -∑ p_i log p_i"
                          className="w-full rounded-lg border border-[#EAE6DF] bg-[#FBF9F5] px-3 py-1.5 font-mono-tabular text-xs text-[#1C1917]"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="fc-expl" className="block text-[11px] font-medium text-[#57534E] mb-1">
                          Explanation
                        </label>
                        <input
                          id="fc-expl"
                          type="text"
                          value={fcExplanation}
                          onChange={(e) => setFcExplanation(e.target.value)}
                          placeholder="Why this theorem holds..."
                          className="w-full rounded-lg border border-[#EAE6DF] bg-[#FBF9F5] px-3 py-1.5 text-xs text-[#1C1917]"
                        />
                      </div>
                      <div>
                        <label htmlFor="fc-fail" className="block text-[11px] font-medium text-[#57534E] mb-1">
                          Failure Mode
                        </label>
                        <input
                          id="fc-fail"
                          type="text"
                          value={fcFailure}
                          onChange={(e) => setFcFailure(e.target.value)}
                          placeholder="Edge case where assumption breaks..."
                          className="w-full rounded-lg border border-[#EAE6DF] bg-[#FBF9F5] px-3 py-1.5 text-xs text-[#1C1917]"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="mc-chap" className="block text-[11px] font-medium text-[#57534E] mb-1">
                        Chapter Reference
                      </label>
                      <input
                        id="mc-chap"
                        type="text"
                        value={mcChapter}
                        onChange={(e) => setMcChapter(e.target.value)}
                        className="w-full rounded-lg border border-[#EAE6DF] bg-[#FBF9F5] px-3 py-1.5 text-xs text-[#1C1917]"
                      />
                    </div>
                    <div>
                      <label htmlFor="mc-note" className="block text-[11px] font-medium text-[#57534E] mb-1">
                        Margin Annotation
                      </label>
                      <input
                        id="mc-note"
                        type="text"
                        value={mcNote}
                        onChange={(e) => setMcNote(e.target.value)}
                        placeholder="Peer critique or derivation note..."
                        className="w-full rounded-lg border border-[#EAE6DF] bg-[#FBF9F5] px-3 py-1.5 text-xs text-[#1C1917]"
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="submit"
                    className="rounded-lg bg-[#3F4E34] px-4 py-1.5 text-xs font-medium text-[#FBF9F5] hover:bg-[#1E3A2B]"
                  >
                    Publish to Deck
                  </button>
                  {contribFeedback && (
                    <span className="font-mono-tabular text-[11px] text-[#1E3A2B]">
                      {contribFeedback}
                    </span>
                  )}
                </div>
              </form>
            )}

            {/* Recent Margin Critiques preview */}
            {dataset.marginCritiques.length > 0 && (
              <div className="mt-4 border-t border-[#EAE6DF] pt-3 space-y-2">
                {dataset.marginCritiques.slice(0, 2).map((mc) => (
                  <div key={mc.id} className="flex items-start justify-between gap-3 text-xs">
                    <div>
                      <span className="font-semibold text-[#1C1917]">{mc.chapterTitle}: </span>
                      <span className="text-[#57534E]">{mc.note}</span>
                    </div>
                    <span className="shrink-0 font-mono-tabular text-[11px] text-[#78716C]">
                      {mc.authorHandle}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Proof Modal for Component #5 */}
      <AnimatePresence>
        {proofOpen && activeTheorem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="proof-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1917]/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="editorial-card w-full max-w-lg rounded-2xl p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono-tabular text-[11px] text-[#92400E]">
                    Formal Proof Inspection
                  </p>
                  <h4 id="proof-modal-title" className="font-editorial text-2xl text-[#1C1917]">
                    {activeTheorem.name}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setProofOpen(false)}
                  aria-label="Close proof modal"
                  className="rounded-lg border border-[#EAE6DF] p-1.5 text-[#78716C] hover:bg-[#F5F2EB]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 rounded-lg bg-[#F5F2EB] p-3 font-mono-tabular text-xs text-[#1E3A2B]">
                {activeTheorem.latex}
              </div>
              <div className="mt-4 space-y-1.5">
                <p className="text-xs font-semibold text-[#1C1917]">Symbol Legend</p>
                {activeTheorem.variables.map((v) => (
                  <p key={v.symbol} className="text-xs text-[#57534E]">
                    <span className="font-mono-tabular font-semibold text-[#1C1917]">
                      {v.symbol}
                    </span>
                    {" — "}
                    {v.meaning}
                  </p>
                ))}
              </div>
              <div className="mt-4 space-y-1.5">
                <p className="text-xs font-semibold text-[#1C1917]">Derivation Steps</p>
                {activeTheorem.proofSteps.map((step, i) => (
                  <p key={i} className="text-xs leading-relaxed text-[#292524]">
                    {step}
                  </p>
                ))}
              </div>
              <p className="mt-4 border-t border-[#EAE6DF] pt-3 font-mono-tabular text-[11px] text-[#78716C]">
                Boundary: {activeTheorem.boundaryCondition}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
