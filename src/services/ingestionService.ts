import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import Papa from "papaparse";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface IngestedDocumentResult {
  fileName: string;
  fileType: "PDF" | "CSV" | "TEXT";
  extractedText: string;
  pageOrRowCount: number;
  inferredColumns?: string[];
  rawRows?: Array<Record<string, string | number>>;
}

export async function ingestClientFile(
  file: File,
  onProgress?: (detail: string) => void
): Promise<IngestedDocumentResult> {
  const lower = file.name.toLowerCase();

  if (lower.endsWith(".pdf") || file.type === "application/pdf") {
    onProgress?.(`Booting PDF.js Web Worker (${pdfjsLib.version})...`);
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;
    const pagesToRead = Math.min(totalPages, 30);
    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= pagesToRead; pageNum++) {
      onProgress?.(`Extracting text layer: Page ${pageNum} of ${pagesToRead}...`);
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const strings = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .filter(Boolean);
      pageTexts.push(`[Page ${pageNum}]\n${strings.join(" ")}`);
    }

    return {
      fileName: file.name,
      fileType: "PDF",
      extractedText: pageTexts.join("\n\n").slice(0, 60000),
      pageOrRowCount: totalPages,
    };
  }

  if (lower.endsWith(".csv") || lower.endsWith(".tsv") || file.type.includes("csv")) {
    onProgress?.("Streaming CSV/TSV through PapaParse schema profiler...");
    const text = await file.text();
    const parsed = Papa.parse<Record<string, string | number>>(text, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
    });

    const columns = parsed.meta.fields || [];
    const rows = parsed.data.slice(0, 200);

    const numericProfiles = columns
      .map((col) => {
        const nums = rows
          .map((r) => r[col])
          .filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
        if (nums.length === 0) return null;
        const sum = nums.reduce((a, b) => a + b, 0);
        const min = Math.min(...nums);
        const max = Math.max(...nums);
        return `${col}: min=${min}, max=${max}, avg=${(sum / nums.length).toFixed(2)}`;
      })
      .filter(Boolean);

    const previewCsv = Papa.unparse(rows.slice(0, 40));

    return {
      fileName: file.name,
      fileType: "CSV",
      extractedText: [
        `FILE: ${file.name} (${parsed.data.length} total rows)`,
        `COLUMNS: ${columns.join(", ")}`,
        `NUMERIC_STATS:\n${numericProfiles.join("\n")}`,
        `SAMPLE_ROWS_CSV:\n${previewCsv}`,
      ].join("\n\n"),
      pageOrRowCount: parsed.data.length,
      inferredColumns: columns,
      rawRows: rows,
    };
  }

  onProgress?.("Reading structured text / Markdown stream...");
  const rawText = await file.text();
  return {
    fileName: file.name,
    fileType: "TEXT",
    extractedText: rawText.slice(0, 60000),
    pageOrRowCount: rawText.split(/\r?\n/).length,
  };
}
