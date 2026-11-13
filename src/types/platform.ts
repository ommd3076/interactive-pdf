export type DisciplineDomain = "EDUCATION" | "FINANCE" | "ENTERPRISE";

export interface ContributorProfile {
  name: string;
  handle: string;
  email: string;
  domain: DisciplineDomain;
  organization: string;
  focusOrMandate: string;
  clearanceLevel: string;
  signedInAt: string;
}

export interface GuestQuotaState {
  dateISO: string; // YYYY-MM-DD
  analysesUsedToday: number;
  adBonusUnlockedToday: number;
}

export interface ConceptNode {
  id: string;
  title: string;
  tier: "Axiom" | "Lemma" | "Theorem" | "Frontier";
  prerequisites: string[];
  summary: string;
  masteryWeight: number;
}

export interface StudyFlashcard {
  id: string;
  concept: string;
  latexFormula: string;
  explanation: string;
  failureMode: string;
  authorHandle?: string;
}

export interface MarginCritique {
  id: string;
  chapterTitle: string;
  note: string;
  authorHandle: string;
  createdAt: string;
}

export interface TheoremSpec {
  id: string;
  name: string;
  latex: string;
  variables: Array<{ symbol: string; meaning: string }>;
  proofSteps: string[];
  boundaryCondition: string;
}

export interface ChapterHeatmapRow {
  chapter: string;
  entropy: number; // 0-100
  passes: number[]; // revision pass scores [Pass 1, Pass 2, Pass 3, Pass 4]
}

export interface CitationEvent {
  id: string;
  year: string;
  title: string;
  authors: string;
  stance: "Foundation" | "Counterargument" | "Breakthrough";
  takeaway: string;
}

export interface ErrorVector {
  id: string;
  category: "Conceptual" | "Mechanical" | "Time-Pressure";
  count: number;
  description: string;
  remediation: string;
}

export interface SankeyStream {
  id: string;
  source: string;
  target: string;
  amountM: number;
  category: "Inflow" | "Allocation";
}

export interface CashflowDotPoint {
  month: string;
  projectedM: number;
  actualM: number;
}

export interface FinanceLedgerRow {
  id: string;
  lineItem: string;
  department: string;
  budgetM: number;
  actualM: number;
  sigma: number;
  status: "NOMINAL" | "WATCH" | "OUTLIER_2SIGMA";
}

export interface CovarianceCell {
  rowAsset: string;
  colAsset: string;
  corr: number; // -1 to 1
}

export interface CohortCurvePoint {
  month: number;
  enterpriseLtvCac: number;
  midMarketLtvCac: number;
}

export interface AlphaScenario {
  id: string;
  title: string;
  wacc: number;
  terminalGrowth: number;
  burnMultiple: number;
  outlierNote: string;
  authorHandle: string;
  createdAt: string;
}

export interface EnterpriseRule {
  id: string;
  name: string;
  condition: string;
  outcome: string;
  severity: "LOW" | "MEDIUM" | "CRITICAL";
  enabled: boolean;
  version: string;
  votes?: number;
  authorHandle?: string;
}

export interface SlaTelemetryEvent {
  id: string;
  timestamp: string;
  service: string;
  metric: string;
  severity: "INFO" | "WARN" | "BREACH";
  detail: string;
}

export interface TeamPod {
  id: string;
  podName: string;
  lead: string;
  utilizationPct: number;
  activeTasks: number;
  status: "BALANCED" | "ELEVATED" | "OVERLOAD";
}

export interface HitlEscalationItem {
  id: string;
  title: string;
  ruleTriggered: string;
  confidence: number;
  payloadSummary: string;
  riskTag: string;
}

export interface ServiceMeshNode {
  id: string;
  label: string;
  rps: number;
  p99Ms: number;
  loadPct: number;
  dependencies: string[];
}

export interface AuditDiffEntry {
  id: string;
  timestamp: string;
  actor: string;
  version: string;
  action: string;
  diffSummary: string;
}

export interface PlatformDataset {
  documentTitle: string;
  documentSubtitle: string;
  sourceFileName: string;
  extractedSummary: string;
  // Education (#2-#10)
  conceptDag: ConceptNode[];
  flashcards: StudyFlashcard[];
  marginCritiques: MarginCritique[];
  theorems: TheoremSpec[];
  chapterHeatmap: ChapterHeatmapRow[];
  citationTimeline: CitationEvent[];
  errorVectors: ErrorVector[];
  // Finance (#11-#20)
  sankeyStreams: SankeyStream[];
  cashflowDots: CashflowDotPoint[];
  financeLedger: FinanceLedgerRow[];
  covarianceAssets: string[];
  covarianceMatrix: number[][];
  cohortCurves: CohortCurvePoint[];
  alphaScenarios: AlphaScenario[];
  // Enterprise (#21-#30)
  enterpriseRules: EnterpriseRule[];
  slaTelemetry: SlaTelemetryEvent[];
  teamPods: TeamPod[];
  hitlQueue: HitlEscalationItem[];
  serviceMesh: ServiceMeshNode[];
  auditTrail: AuditDiffEntry[];
}
