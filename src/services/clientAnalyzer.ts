import { IngestedDocumentResult } from "./ingestionService";
import { DisciplineDomain, PlatformDataset } from "../types/platform";

export function classifyTextDomain(text: string, fileName: string): DisciplineDomain {
  const sample = `${fileName} ${text.slice(0, 4000)}`.toLowerCase();
  const finHits = (
    sample.match(/revenue|margin|ebitda|wacc|cashflow|capex|balance|10-k|ledger|burn|irr/g) ||
    []
  ).length;
  const entHits = (
    sample.match(/sla|latency|p99|incident|runbook|failover|policy|rule|prd|pod|capacity/g) ||
    []
  ).length;
  const acadHits = (
    sample.match(/theorem|lemma|proof|hypothesis|citation|experiment|perplexity|epoch|syllabus/g) ||
    []
  ).length;

  if (finHits >= entHits && finHits >= acadHits && finHits > 0) return "FINANCE";
  if (entHits >= finHits && entHits >= acadHits && entHits > 0) return "ENTERPRISE";
  return "EDUCATION";
}

/**
 * Browser-native deterministic synthesizer: transforms client-extracted PDF/CSV/Text
 * into live interactive structures across Education, Finance, and Enterprise sections.
 */
export function synthesizePlatformDatasetFromFile(
  ingested: IngestedDocumentResult,
  baseDataset: PlatformDataset
): { domain: DisciplineDomain; dataset: PlatformDataset } {
  const domain = classifyTextDomain(ingested.extractedText, ingested.fileName);
  const sentences = ingested.extractedText
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.length > 28)
    .slice(0, 6);

  const summary =
    sentences.slice(0, 2).join(" ") ||
    `Parsed ${ingested.pageOrRowCount} ${
      ingested.fileType === "CSV" ? "tabular rows" : "document pages/lines"
    } strictly in browser memory.`;

  const next: PlatformDataset = {
    ...baseDataset,
    documentTitle: ingested.fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "),
    documentSubtitle: `Client-parsed ${ingested.fileType} (${ingested.pageOrRowCount} ${
      ingested.fileType === "CSV" ? "rows" : "sections"
    }) · Detected primary discipline: ${domain}`,
    sourceFileName: ingested.fileName,
    extractedSummary: summary,
  };

  // If CSV rows were parsed via PapaParse, hydrate Finance Ledger & Anomaly Grid dynamically
  if (ingested.fileType === "CSV" && ingested.rawRows && ingested.rawRows.length > 0) {
    const cols = ingested.inferredColumns || Object.keys(ingested.rawRows[0]);
    const labelCol = cols.find((c) => typeof ingested.rawRows?.[0]?.[c] === "string") || cols[0];
    const numCols = cols.filter((c) => typeof ingested.rawRows?.[0]?.[c] === "number");

    const mappedLedger = ingested.rawRows.slice(0, 10).map((r, i) => {
      const actual = numCols[0] ? Number(r[numCols[0]]) || 100 : 120 + i * 18;
      const budget = numCols[1] ? Number(r[numCols[1]]) || actual * 0.9 : actual * 0.92;
      const diffRatio = budget === 0 ? 0 : (actual - budget) / Math.abs(budget);
      const sigma = Number((diffRatio * 5.2).toFixed(2));
      return {
        id: `csv_${i}`,
        lineItem: String(r[labelCol] || `Record ${i + 1}`),
        department: numCols[0] || "Uploaded Ledger",
        budgetM: Number(budget.toFixed(2)),
        actualM: Number(actual.toFixed(2)),
        sigma,
        status:
          Math.abs(sigma) >= 2
            ? ("OUTLIER_2SIGMA" as const)
            : Math.abs(sigma) >= 1
            ? ("WATCH" as const)
            : ("NOMINAL" as const),
      };
    });

    if (mappedLedger.length > 0) {
      next.financeLedger = mappedLedger;
    }
  } else if (sentences.length > 0) {
    // Enrich Education flashcards & margin critiques from extracted PDF/Markdown text
    const extractedCard = {
      id: `doc_fc_${Date.now()}`,
      concept: `Key Synthesis: ${next.documentTitle.slice(0, 32)}`,
      latexFormula: "I(X; Y) = ∑ p(x,y) log(p(x,y) / p(x)p(y))",
      explanation: sentences[0],
      failureMode: sentences[1] || "Verify boundary assumptions against primary source footnotes.",
      authorHandle: "@local_parser",
    };
    next.flashcards = [extractedCard, ...baseDataset.flashcards.slice(0, 5)];
    next.auditTrail = [
      {
        id: `aud_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actor: "@browser_ingest",
        version: "v4.3",
        action: "CLIENT_PARSE",
        diffSummary: `Ingested ${ingested.fileName} (${ingested.fileType}) strictly in-memory.`,
      },
      ...baseDataset.auditTrail,
    ];
  }

  return { domain, dataset: next };
}
