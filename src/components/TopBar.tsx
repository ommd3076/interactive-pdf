import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useEngine, type NavTab } from '../context/EngineContext';
import { ROLE_META } from '../engine/rbac';

const NAV_ITEMS: ReadonlyArray<{ id: NavTab; label: string }> = [
  { id: 'story', label: 'Story' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'data', label: 'Data' },
  { id: 'activity', label: 'Activity' },
  { id: 'vault', label: 'Vault' },
];

export const TopBar: React.FC = () => {
  const { activeTab, setActiveTab, state, setAuthModalOpen } = useEngine();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (id: NavTab) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 dark:border-slate-800 bg-stone-50/95 dark:bg-[#0B0E14]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-15 max-w-[1360px] items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleNavClick('story')}
          className="font-editorial text-xl font-semibold tracking-tight text-stone-900 dark:text-slate-100 whitespace-nowrap shrink-0 hover:opacity-80 transition-opacity cursor-pointer"
        >
          Meridian Folio
        </button>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-7">
          {NAV_ITEMS.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => handleNavClick(item.id)}
                className={`relative py-4 text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'text-stone-950 dark:text-white'
                    : 'text-stone-600 dark:text-slate-400 hover:text-stone-950 dark:hover:text-slate-100'
                }`}
              >
                {item.label}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-700 dark:bg-blue-400"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary Action (Account / Sign In) + Mobile Menu Trigger */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            aria-label={
              state.session
                ? `Open account and role menu for ${state.session.name}`
                : 'Sign in to encrypted vault'
            }
            className="inline-flex items-center gap-2.5 h-10 px-3.5 text-sm font-medium rounded-md border border-stone-300 dark:border-slate-700 bg-white dark:bg-[#131821] text-stone-900 dark:text-slate-100 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {state.session ? (
              <>
                <img
                  src={state.session.avatarUrl}
                  alt={state.session.name}
                  referrerPolicy="no-referrer"
                  className="h-6 w-6 rounded-full object-cover border border-stone-200 dark:border-slate-700"
                />
                <span className="hidden sm:inline max-w-[130px] truncate">{state.session.name}</span>
                <span className="text-xs text-stone-500 dark:text-slate-400 hidden lg:inline">
                  {ROLE_META[state.session.role].label}
                </span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden inline-flex items-center justify-center h-11 w-11 rounded-md text-stone-700 dark:text-slate-300 hover:bg-stone-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile navigation"
          className="md:hidden border-t border-stone-200 dark:border-slate-800 bg-white dark:bg-[#131821] px-4 py-3"
        >
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center justify-between h-11 px-3 rounded-md text-sm font-medium text-left transition-colors cursor-pointer ${
                    active
                      ? 'bg-blue-700/10 dark:bg-blue-400/15 text-blue-800 dark:text-blue-300'
                      : 'text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{item.label}</span>
                  {active && <span className="text-xs font-mono">Active</span>}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
};
