import React, { useEffect, useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, BookOpen } from 'lucide-react';
import { useEngine } from '../context/EngineContext';
import { formatCompactNumber, formatDwell } from '../engine/analytics';
import type { VisualMode } from '../engine/types';
import { EditorialSvgStage } from './charts/EditorialSvgStage';

export const StoryView: React.FC = () => {
  const { state, summary, setActiveTab, logStoryChapter } = useEngine();
  const chapters = state.chapters;
  const [activeChapterId, setActiveChapterId] = useState<string>(chapters[0]?.id ?? 'ch-01');
  const [manualMode, setManualMode] = useState<VisualMode | null>(null);
  const chapterRefs = useRef<Record<string, HTMLElement | null>>({});

  const activeChapter = chapters.find((c) => c.id === activeChapterId) ?? chapters[0];
  const activeVisualMode: VisualMode = manualMode ?? activeChapter?.visualMode ?? 'area-trend';

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-chapter-id');
            if (id) {
              setActiveChapterId(id);
              setManualMode(null);
            }
          }
        }
      },
      { rootMargin: '-30% 0px -45% 0px', threshold: 0.1 }
    );

    Object.values(chapterRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [chapters.length]);

  const handleSelectChapter = (chapterId: string, title: string) => {
    setActiveChapterId(chapterId);
    setManualMode(null);
    logStoryChapter(title);
    const el = chapterRefs.current[chapterId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="space-y-7">
      {/* Editorial Masthead */}
      <section className="pb-6 border-b border-stone-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-slate-400">
          <span>Issue 14</span>
          <span aria-hidden="true">·</span>
          <span>Global Audience Engagement Monograph</span>
          <span aria-hidden="true">·</span>
          <span>Q1–Q4 2026</span>
          <span aria-hidden="true">·</span>
          <span>Encrypted Local-First Edition</span>
        </div>

        <div className="mt-3 grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
          <div className="lg:col-span-8">
            <h1 className="font-editorial text-3xl sm:text-4xl lg:text-[2.65rem] font-medium tracking-tight leading-[1.08] text-stone-950 dark:text-white">
              How responsive storytelling and local-first speed reshaped digital reading
            </h1>
            <p className="mt-2.5 max-w-2xl text-sm sm:text-[15px] leading-relaxed text-stone-600 dark:text-slate-300">
              An interactive scrollytelling report examining eighteen flagship data features across four regions.
              Every chart below recalculates instantaneously in your browser from an AES-256-GCM encrypted vault.
            </p>
          </div>
          <div className="lg:col-span-4 flex flex-wrap lg:justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setActiveTab('data')}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-stone-900 dark:bg-slate-100 text-white dark:text-slate-950 text-xs font-medium hover:bg-stone-800 dark:hover:bg-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              Inspect Source Table
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('vault')}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-stone-300 dark:border-slate-700 bg-white dark:bg-[#131821] text-stone-800 dark:text-slate-200 text-xs font-medium hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Explore Headless API
            </button>
          </div>
        </div>
      </section>

      {/* 4-Column Quantitative KPI Strip */}
      <section aria-label="Key audience metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-stone-200 dark:bg-slate-800 border border-stone-200 dark:border-slate-800 rounded-lg overflow-hidden">
        <KpiCell
          label="Engaged Readers"
          value={formatCompactNumber(summary.totalReaders)}
          delta={`${summary.readersDeltaPct >= 0 ? '+' : ''}${summary.readersDeltaPct}% YoY`}
          positive={summary.readersDeltaPct >= 0}
          detail={`${state.filters.timeframe} window · ${summary.recordCount} editions`}
        />
        <KpiCell
          label="Median Dwell Time"
          value={formatDwell(summary.medianDwellSeconds)}
          delta="+1m 18s evening lift"
          positive
          detail={`${summary.avgCompletionPct}% average completion`}
        />
        <KpiCell
          label="Returning Subscribers"
          value={`${summary.returningRatePct}%`}
          delta="+6.4 pts vs Q1"
          positive
          detail="Weighted across filtered channels"
        />
        <KpiCell
          label="Local Query Engine"
          value={`${state.telemetry.avgQueryMs.toFixed(1)} ms`}
          delta={
            state.telemetry.cacheHits > 0
              ? `${state.telemetry.cacheHitRate}% cache hit`
              : 'LRU cache warm'
          }
          positive
          detail={`${state.syncState.quota.writesToday} / ${state.syncState.quota.dailyWriteLimit} daily KV writes`}
        />
      </section>

      {/* Chapter Quick Jump Rail */}
      <nav aria-label="Editorial chapters" className="flex items-center gap-2 overflow-x-auto pb-1">
        {chapters.map((chapter) => {
          const isActive = chapter.id === activeChapter?.id;
          return (
            <button
              key={chapter.id}
              type="button"
              aria-current={isActive ? 'step' : undefined}
              onClick={() => handleSelectChapter(chapter.id, chapter.title)}
              className={`h-9 px-3.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
                isActive
                  ? 'border-blue-700 dark:border-blue-400 bg-blue-700/10 dark:bg-blue-400/15 text-blue-800 dark:text-blue-200'
                  : 'border-stone-200 dark:border-slate-800 bg-white dark:bg-[#131821] text-stone-600 dark:text-slate-400 hover:text-stone-950 dark:hover:text-slate-100'
              }`}
            >
              {chapter.indexLabel}
            </button>
          );
        })}
      </nav>

      {/* Asymmetric Two-Column Scrollytelling Canvas */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Left: Scrollytelling Narrative Column (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {chapters.map((chapter, index) => {
            const isActive = chapter.id === activeChapter?.id;
            return (
              <article
                key={chapter.id}
                ref={(el) => {
                  chapterRefs.current[chapter.id] = el;
                }}
                data-chapter-id={chapter.id}
                onClick={() => {
                  setActiveChapterId(chapter.id);
                  setManualMode(null);
                  logStoryChapter(chapter.title);
                }}
                className={`rounded-lg border p-6 transition-colors cursor-pointer ${
                  isActive
                    ? 'border-stone-400 dark:border-slate-600 bg-white dark:bg-[#131821]'
                    : 'border-stone-200 dark:border-slate-800/80 bg-stone-50/70 dark:bg-[#0F131B] opacity-85 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs text-stone-500 dark:text-slate-400">
                  <span className="font-mono font-medium">{chapter.indexLabel}</span>
                  {isActive && (
                    <span className="text-blue-700 dark:text-blue-400 font-medium">Active Figure</span>
                  )}
                </div>

                <h2 className="mt-2.5 font-editorial text-2xl font-medium leading-snug text-stone-950 dark:text-white">
                  {chapter.title}
                </h2>
                <p className="mt-2 text-sm font-medium leading-relaxed text-stone-700 dark:text-slate-300">
                  {chapter.deck}
                </p>

                <p
                  className={`mt-4 text-sm leading-7 text-stone-600 dark:text-slate-400 ${
                    index === 0
                      ? 'first-letter:font-editorial first-letter:text-4xl first-letter:font-semibold first-letter:float-left first-letter:mr-2.5 first-letter:leading-none first-letter:text-stone-900 dark:first-letter:text-slate-100'
                      : ''
                  }`}
                >
                  {chapter.body}
                </p>

                {chapter.pullQuote && (
                  <blockquote className="my-5 py-4 border-y border-stone-200 dark:border-slate-800 font-editorial italic text-lg leading-relaxed text-stone-800 dark:text-slate-200">
                    “{chapter.pullQuote}”
                  </blockquote>
                )}

                <div className="mt-4 pt-3 border-t border-stone-200/80 dark:border-slate-800 flex items-center justify-between text-xs text-stone-500 dark:text-slate-400">
                  <span>Visual mode: {chapter.visualMode}</span>
                  <span className="font-medium text-blue-700 dark:text-blue-400">
                    {isActive ? 'Synced to chart →' : 'Focus chapter'}
                  </span>
                </div>
              </article>
            );
          })}
        </div>

        {/* Right: Sticky Responsive SVG Visualization Stage (7 cols) */}
        <div className="lg:col-span-7 lg:sticky lg:top-20 space-y-5">
          <EditorialSvgStage
            summary={summary}
            visualMode={activeVisualMode}
            onChangeMode={(mode) => setManualMode(mode)}
            caption={activeChapter?.figureCaption ?? 'Interactive SVG visualization synced to editorial chapter.'}
          />

          {/* Compact Regional Summary Table Below Stage */}
          <div className="rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-[#131821] p-5">
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-stone-200 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-stone-900 dark:text-slate-100">
                Regional Performance Snapshot
              </h3>
              <span className="text-xs text-stone-500 dark:text-slate-400">
                Live slice · {state.filters.channel} channel
              </span>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 dark:border-slate-800 text-xs text-stone-500 dark:text-slate-400">
                    <th scope="col" className="py-2 pr-3 font-medium">Region</th>
                    <th scope="col" className="py-2 px-3 font-medium text-right">Readers</th>
                    <th scope="col" className="py-2 px-3 font-medium text-right">Dwell</th>
                    <th scope="col" className="py-2 pl-3 font-medium text-right">Returning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-slate-800/80 text-xs">
                  {summary.regionalBreakdown.map((reg) => (
                    <tr key={reg.region} className="hover:bg-stone-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 pr-3 font-medium text-stone-900 dark:text-slate-100">
                        {reg.region}
                        <span className="ml-2 text-stone-400 dark:text-slate-500 font-normal">({reg.count})</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-stone-800 dark:text-slate-200">
                        {formatCompactNumber(reg.readers)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-stone-700 dark:text-slate-300">
                        {formatDwell(reg.dwellSeconds)}
                      </td>
                      <td className="py-2.5 pl-3 text-right font-mono tabular-nums text-stone-700 dark:text-slate-300">
                        {reg.returningPct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const KpiCell: React.FC<{
  label: string;
  value: string;
  delta: string;
  positive: boolean;
  detail: string;
}> = ({ label, value, delta, positive, detail }) => (
  <div className="bg-white dark:bg-[#131821] px-5 py-4">
    <p className="text-xs font-medium text-stone-500 dark:text-slate-400">{label}</p>
    <div className="mt-1.5 flex items-baseline justify-between gap-2">
      <p className="font-mono text-2xl font-semibold tracking-tight tabular-nums text-stone-950 dark:text-white">
        {value}
      </p>
      <span
        className={`inline-flex items-center gap-0.5 text-xs font-mono font-medium tabular-nums ${
          positive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
        }`}
      >
        {positive ? (
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {delta}
      </span>
    </div>
    <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">{detail}</p>
  </div>
);
