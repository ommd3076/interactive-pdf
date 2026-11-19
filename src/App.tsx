/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EngineProvider, useEngine } from './context/EngineContext';
import { TopBar } from './components/TopBar';
import { FilterToolbar } from './components/FilterToolbar';
import { StoryView } from './components/StoryView';
import { AnalyticsView } from './components/AnalyticsView';
import { DataTableView } from './components/DataTableView';
import { ActivityView } from './components/ActivityView';
import { VaultView } from './components/VaultView';
import { AuthModal } from './components/AuthModal';

const WorkspaceShell: React.FC = () => {
  const { activeTab, state } = useEngine();

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-[#0B0E14] text-stone-900 dark:text-slate-100 transition-colors duration-200">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-blue-700 focus:px-4 focus:py-2 focus:text-xs focus:font-medium focus:text-white"
      >
        Skip to main content
      </a>

      <TopBar />
      <FilterToolbar />

      <main id="main-content" className="flex-1 mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {!state.initialized ? (
          <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Decrypting local vault">
            <div className="h-10 w-2/3 rounded bg-stone-200 dark:bg-slate-800" />
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-lg bg-stone-200 dark:bg-slate-800" />
              ))}
            </div>
            <div className="h-80 rounded-lg bg-stone-200 dark:bg-slate-800" />
          </div>
        ) : (
          <div key={activeTab} className="meridian-enter">
            {activeTab === 'story' && <StoryView />}
            {activeTab === 'analytics' && <AnalyticsView />}
            {activeTab === 'data' && <DataTableView />}
            {activeTab === 'activity' && <ActivityView />}
            {activeTab === 'vault' && <VaultView />}
          </div>
        )}
      </main>

      <footer className="border-t border-stone-200 dark:border-slate-800 bg-white dark:bg-[#131821]">
        <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8 py-5 flex flex-wrap items-center justify-between gap-4 text-xs text-stone-500 dark:text-slate-400">
          <span>Meridian Folio · Editorial Data Visualization & Local-First Vault</span>
          <span>AES-256-GCM Client Encryption · Cloudflare KV Ready</span>
        </div>
      </footer>

      <AuthModal />
    </div>
  );
};

export default function App() {
  return (
    <EngineProvider>
      <WorkspaceShell />
    </EngineProvider>
  );
}
