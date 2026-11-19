import React from 'react';
import { Cloud, CloudOff, Moon, RefreshCw, RotateCcw, Sun } from 'lucide-react';
import { useEngine } from '../context/EngineContext';
import type { Channel, Region, Timeframe } from '../engine/types';

const REGIONS: ReadonlyArray<Region | 'All'> = ['All', 'North America', 'Europe', 'Asia-Pacific', 'Latin America'];
const CHANNELS: ReadonlyArray<Channel | 'All'> = ['All', 'Web', 'Mobile', 'Newsletter', 'Audio'];
const TIMEFRAMES: ReadonlyArray<Timeframe> = ['12M', '6M', 'Q4'];

export const FilterToolbar: React.FC = () => {
  const { state, setFilters, resetFilters, theme, toggleTheme, syncNow, can } = useEngine();
  const { filters, syncState, offlineSimulated } = state;

  const hasActiveFilter =
    filters.region !== 'All' || filters.channel !== 'All' || filters.timeframe !== '12M' || filters.search.trim() !== '';

  const syncLabel = offlineSimulated
    ? 'Offline vault'
    : syncState.status === 'syncing'
      ? 'Syncing…'
      : syncState.dirty
        ? `Sync (${syncState.pendingWrites} queued)`
        : syncState.lastSyncedAt
          ? 'Synced'
          : 'Sync Vault';

  return (
    <section
      aria-label="Dataset filters and workspace controls"
      className="border-b border-stone-200 dark:border-slate-800 bg-white dark:bg-[#131821]"
    >
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
          {/* Left: Live Region, Channel, Timeframe Controls */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <label
                htmlFor="filter-region"
                className="text-xs font-medium text-stone-500 dark:text-slate-400 whitespace-nowrap hidden sm:inline"
              >
                Region
              </label>
              <select
                id="filter-region"
                aria-label="Region"
                value={filters.region}
                onChange={(e) => setFilters({ region: e.target.value as Region | 'All' })}
                className="w-full sm:w-auto h-9 rounded-md border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0B0E14] px-2.5 text-xs font-medium text-stone-900 dark:text-slate-100 cursor-pointer"
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r === 'All' ? 'All Regions' : r}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 min-w-0">
              <label
                htmlFor="filter-channel"
                className="text-xs font-medium text-stone-500 dark:text-slate-400 whitespace-nowrap hidden sm:inline"
              >
                Channel
              </label>
              <select
                id="filter-channel"
                aria-label="Channel"
                value={filters.channel}
                onChange={(e) => setFilters({ channel: e.target.value as Channel | 'All' })}
                className="w-full sm:w-auto h-9 rounded-md border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0B0E14] px-2.5 text-xs font-medium text-stone-900 dark:text-slate-100 cursor-pointer"
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c === 'All' ? 'All Channels' : c}
                  </option>
                ))}
              </select>
            </div>

            <div
              role="group"
              aria-label="Timeframe"
              className="hidden sm:inline-flex items-center rounded-md border border-stone-200 dark:border-slate-700 bg-stone-100 dark:bg-[#0B0E14] p-0.5"
            >
              {TIMEFRAMES.map((tf) => {
                const active = filters.timeframe === tf;
                return (
                  <button
                    key={tf}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilters({ timeframe: tf })}
                    className={`h-8 px-2.5 text-xs font-mono font-medium rounded whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      active
                        ? 'bg-white dark:bg-[#1C2433] text-stone-950 dark:text-white shadow-xs'
                        : 'text-stone-600 dark:text-slate-400 hover:text-stone-950 dark:hover:text-slate-100'
                    }`}
                  >
                    {tf}
                  </button>
                );
              })}
            </div>

            {hasActiveFilter && (
              <button
                type="button"
                onClick={resetFilters}
                className="col-span-2 sm:col-span-1 inline-flex items-center justify-center sm:justify-start gap-1.5 h-8 sm:h-9 px-2.5 text-xs font-medium text-stone-600 dark:text-slate-400 hover:text-stone-950 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Reset filters
              </button>
            )}
          </div>

          {/* Right: Mobile Timeframe + Sync Trigger + Dark/Light Mode Switch */}
          <div className="flex items-center justify-between md:justify-end gap-2 shrink-0">
            <div
              role="group"
              aria-label="Mobile timeframe"
              className="inline-flex sm:hidden items-center rounded-md border border-stone-200 dark:border-slate-700 bg-stone-100 dark:bg-[#0B0E14] p-0.5"
            >
              {TIMEFRAMES.map((tf) => {
                const active = filters.timeframe === tf;
                return (
                  <button
                    key={tf}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilters({ timeframe: tf })}
                    className={`h-8 px-2 text-xs font-mono font-medium rounded whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      active
                        ? 'bg-white dark:bg-[#1C2433] text-stone-950 dark:text-white shadow-xs'
                        : 'text-stone-600 dark:text-slate-400'
                    }`}
                  >
                    {tf}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void syncNow()}
              disabled={!can('sync:push') || syncState.status === 'syncing'}
              title={
                can('sync:push')
                  ? 'Push AES-256-GCM encrypted snapshot to Edge KV'
                  : 'Viewer role is read-only; switch to Editor or Admin to push KV syncs'
              }
              className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                !can('sync:push')
                  ? 'border-stone-200 dark:border-slate-800 text-stone-400 dark:text-slate-500 cursor-not-allowed'
                  : syncState.dirty
                    ? 'border-blue-700 dark:border-blue-500 bg-blue-700 dark:bg-blue-600 text-white hover:bg-blue-800 dark:hover:bg-blue-500 cursor-pointer'
                    : 'border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0B0E14] text-stone-800 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer'
              }`}
            >
              {offlineSimulated ? (
                <CloudOff className="h-3.5 w-3.5" aria-hidden="true" />
              ) : syncState.status === 'syncing' ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Cloud className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{syncLabel}</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0B0E14] text-xs font-medium text-stone-800 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Dark</span>
                </>
              )}
            </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
