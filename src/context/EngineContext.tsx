import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { meridianEngine } from '../engine/MeridianEngine';
import type {
  ActivityMetrics,
  AnalyticsSummary,
  EngineStateSnapshot,
  FilterState,
  KvSyncConfig,
  Permission,
  PublicationRecord,
  Role,
} from '../engine/types';

export type NavTab = 'story' | 'analytics' | 'data' | 'activity' | 'vault';
export type ThemeMode = 'light' | 'dark';

interface EngineContextValue {
  state: EngineStateSnapshot;
  summary: AnalyticsSummary;
  activityMetrics: ActivityMetrics;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  can: (permission: Permission) => boolean;
  setFilters: (partial: Partial<FilterState>) => void;
  resetFilters: () => void;
  addRecord: (input: Parameters<typeof meridianEngine.addRecord>[0]) => Promise<PublicationRecord>;
  updateRecord: (id: string, patch: Partial<Omit<PublicationRecord, 'id'>>) => Promise<PublicationRecord>;
  deleteRecord: (id: string) => Promise<void>;
  exportRecords: (format: 'csv' | 'json') => string;
  signIn: (email: string, password: string) => Promise<void>;
  registerUser: (input: { name: string; email: string; password: string; role: Role; title?: string }) => Promise<void>;
  switchDemoUser: (userId: string) => Promise<void>;
  updateUserRole: (userId: string, role: Role) => Promise<void>;
  signOut: () => void;
  syncNow: () => Promise<void>;
  pullRemote: () => Promise<{ status: string; message: string }>;
  setOfflineMode: (offline: boolean) => void;
  updateSyncConfig: (partial: Partial<KvSyncConfig>) => void;
  rotatePassphrase: (passphrase: string) => Promise<void>;
  logStoryChapter: (title: string) => void;
}

const EngineContext = createContext<EngineContextValue | null>(null);

function readInitialTheme(): ThemeMode {
  if (typeof document !== 'undefined') {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  }
  return 'light';
}

export const EngineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<EngineStateSnapshot>(() => meridianEngine.getSnapshot());
  const [activeTab, setActiveTab] = useState<NavTab>('story');
  const [theme, setThemeState] = useState<ThemeMode>(readInitialTheme);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = meridianEngine.subscribe((next) => {
      setState(next);
    });
    void meridianEngine.initialize();
    return unsubscribe;
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', mode === 'dark');
    }
    try {
      localStorage.setItem('meridian_theme', mode);
    } catch {
      // ignore storage errors
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const summary = useMemo(
    () => meridianEngine.getAnalyticsSummary(state.filters),
    [state.records, state.filters]
  );

  const activityMetrics = useMemo(
    () => meridianEngine.getActivityMetrics(),
    [state.activity]
  );

  const value = useMemo<EngineContextValue>(
    () => ({
      state,
      summary,
      activityMetrics,
      activeTab,
      setActiveTab,
      theme,
      toggleTheme,
      setTheme,
      authModalOpen,
      setAuthModalOpen,
      can: (perm) => meridianEngine.can(perm),
      setFilters: (partial) => meridianEngine.setFilters(partial),
      resetFilters: () => meridianEngine.resetFilters(),
      addRecord: (input) => meridianEngine.addRecord(input),
      updateRecord: (id, patch) => meridianEngine.updateRecord(id, patch),
      deleteRecord: (id) => meridianEngine.deleteRecord(id),
      exportRecords: (fmt) => meridianEngine.exportRecords(fmt),
      signIn: async (email, password) => {
        await meridianEngine.signIn(email, password);
      },
      registerUser: async (input) => {
        await meridianEngine.registerUser(input);
      },
      switchDemoUser: async (userId) => {
        await meridianEngine.switchDemoUser(userId);
      },
      updateUserRole: async (userId, role) => {
        await meridianEngine.updateUserRole(userId, role);
      },
      signOut: () => meridianEngine.signOut(),
      syncNow: async () => {
        await meridianEngine.syncNow();
      },
      pullRemote: () => meridianEngine.pullRemote(),
      setOfflineMode: (offline) => meridianEngine.setOfflineMode(offline),
      updateSyncConfig: (partial) => meridianEngine.updateSyncConfig(partial),
      rotatePassphrase: async (pass) => {
        await meridianEngine.rotatePassphrase(pass);
      },
      logStoryChapter: (title) => meridianEngine.logStoryChapter(title),
    }),
    [state, summary, activityMetrics, activeTab, theme, toggleTheme, setTheme, authModalOpen]
  );

  return <EngineContext.Provider value={value}>{children}</EngineContext.Provider>;
};

export function useEngine(): EngineContextValue {
  const ctx = useContext(EngineContext);
  if (!ctx) throw new Error('useEngine must be used inside EngineProvider');
  return ctx;
}
