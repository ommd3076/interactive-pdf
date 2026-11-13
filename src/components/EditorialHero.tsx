import React, { useRef, useState } from "react";
import { Upload, FileText, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { BotanicalLeftBranch, BotanicalRightBranch } from "./BotanicalFraming";
import { ContributorProfile, GuestQuotaState, PlatformDataset } from "../types/platform";

interface EditorialHeroProps {
  dataset: PlatformDataset;
  quota: GuestQuotaState;
  profile: ContributorProfile | null;
  isParsing: boolean;
  parseStatus: string;
  onSelectFile: (file: File) => void;
  onAnalyzeSample: (sampleKey: "research" | "finance" | "enterprise") => void;
}

export function EditorialHero({
  dataset,
  quota,
  profile,
  isParsing,
  parseStatus,
  onSelectFile,
  onAnalyzeSample,
}: EditorialHeroProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const remainingGuest = Math.max(
    0,
    1 + quota.adBonusUnlockedToday - quota.analysesUsedToday
  );

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onSelectFile(file);
  };

  return (
    <section id="workspace" className="relative overflow-hidden pt-10 pb-16 sm:pt-14 sm:pb-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        {/* Centered Editorial Parenthetical Headline */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 26 }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="font-mono-tabular text-[11px] tracking-[0.12em] uppercase text-[#78716C]">
            Component 01 · Browser-Native Editorial Intelligence · Zero Server
          </p>

          <h1 className="font-editorial mt-4 text-4xl sm:text-6xl tracking-tight text-[#1C1917] leading-[1.08]">
            <span className="font-light text-[#78716C] mr-3 sm:mr-5">(</span>
            The paper <span className="italic text-[#1E3A2B]">reads itself</span>
            <span className="font-light text-[#78716C] ml-3 sm:ml-5">)</span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-sm sm:text-base leading-relaxed text-[#57534E]">
            Morphos parses PDFs, CSV ledgers, and operational runbooks strictly inside
            your browser—transforming static manuscripts into thirty interactive
            scholarly, financial, and governance tools.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#education"
              className="inline-flex items-center gap-2 rounded-lg bg-[#3F4E34] px-5 py-2.5 text-sm font-medium text-[#FBF9F5] shadow-sm transition hover:bg-[#1E3A2B]"
            >
              Explore 30 Modules
              <ArrowRight className="h-4 w-4" />
            </a>
            <span className="font-mono-tabular text-xs text-[#78716C]">
              {profile
                ? `Unlimited Pass · Verified ${profile.handle}`
                : `${remainingGuest}/1 Free Guest Analysis Today`}
            </span>
          </div>
        </motion.div>

        {/* Framed Sky-Mist Window flanked by Botanical Greenery */}
        <div className="relative mt-10 sm:mt-12">
          <BotanicalLeftBranch className="pointer-events-none absolute -left-16 -top-10 z-10 hidden w-48 lg:block xl:-left-20 xl:w-56" />
          <BotanicalRightBranch className="pointer-events-none absolute -right-16 -top-6 z-10 hidden w-48 lg:block xl:-right-20 xl:w-56" />

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 24, delay: 0.08 }}
            className="editorial-sky-frame relative rounded-2xl p-4 sm:p-8 lg:px-14 lg:pt-10 lg:pb-7"
          >
            {/* Elevated White Workspace Card */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`editorial-card relative z-20 mx-auto max-w-4xl rounded-xl p-5 sm:p-7 transition-colors ${
                isDragging ? "border-[#3F4E34] bg-[#F5F2EB]" : ""
              }`}
            >
              {/* Mock Browser / Document Workspace Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAE6DF] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5F2EB] text-[#1E3A2B]">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-[#1C1917]">
                      {dataset.documentTitle}
                    </h2>
                    <p className="font-mono-tabular text-[11px] text-[#78716C]">
                      {dataset.sourceFileName} · {dataset.documentSubtitle}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 font-mono-tabular text-[11px] text-[#1E3A2B]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Client Memory Ready
                </span>
              </div>

              {/* Active Extraction Summary & Dropzone Prompt */}
              <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                <div className="md:col-span-7 space-y-2.5">
                  <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#92400E]">
                    Extracted Synthesis
                  </p>
                  <p className="text-sm leading-relaxed text-[#292524]">
                    {dataset.extractedSummary}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 font-mono-tabular text-[11px] text-[#78716C]">
                    <span>{dataset.conceptDag.length} DAG Theorems</span>
                    <span>·</span>
                    <span>{dataset.financeLedger.length} Ledger Rows</span>
                    <span>·</span>
                    <span>{dataset.enterpriseRules.length} Policy Rules</span>
                  </div>
                </div>

                <div className="md:col-span-5">
                  <div className="rounded-xl border border-dashed border-[#D6D0C4] bg-[#FBF9F5] p-4 text-center">
                    <Upload className="mx-auto h-5 w-5 text-[#3F4E34]" />
                    <p className="mt-2 text-xs font-medium text-[#1C1917]">
                      {isParsing
                        ? parseStatus || "Extracting document in Web Worker..."
                        : "Drop PDF, CSV ledger, or Markdown"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#78716C]">
                      Zero uploads · PDF.js + PapaParse
                    </p>
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".pdf,.csv,.tsv,.txt,.md"
                      aria-label="Upload local document for browser parsing"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onSelectFile(file);
                        e.target.value = "";
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Frame Callout Bar (matching reference layout) */}
            <div className="relative z-20 mx-auto mt-5 flex max-w-4xl flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
              <div>
                <p className="text-sm font-semibold text-[#1C1917]">
                  Want to test your own file?
                </p>
                <p className="text-xs text-[#57534E]">
                  Drop any paper, 10-K CSV, or SLA spec—or trigger a calibrated sample corpus.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => onAnalyzeSample("research")}
                  disabled={isParsing}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#3F4E34] px-4 py-2 text-xs font-medium text-[#FBF9F5] shadow-sm transition hover:bg-[#1E3A2B] disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Try with a sample
                </button>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={isParsing}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#D6D0C4] bg-[#FFFFFF] px-4 py-2 text-xs font-medium text-[#1C1917] shadow-sm transition hover:bg-[#F5F2EB] disabled:opacity-50"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload Document
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
