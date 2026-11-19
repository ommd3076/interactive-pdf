import React, { useState } from 'react';
import { Lock, LogOut, Shield, UserPlus, X } from 'lucide-react';
import { useEngine } from '../context/EngineContext';
import { ROLE_META } from '../engine/rbac';
import { DEMO_PASSWORDS } from '../engine/seedData';
import type { Role } from '../engine/types';

export const AuthModal: React.FC = () => {
  const { authModalOpen, setAuthModalOpen, state, signIn, registerUser, switchDemoUser, signOut } = useEngine();
  const [mode, setMode] = useState<'personas' | 'signin' | 'register'>('personas');
  const [email, setEmail] = useState('elena@meridianfolio.org');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('editor');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!authModalOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      setPassword('');
      setAuthModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await registerUser({ name, email, password, role });
      setName('');
      setPassword('');
      setAuthModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 dark:bg-black/75 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-lg rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#131821] shadow-xl">
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-800 px-6 py-4">
          <div>
            <h2 id="auth-modal-title" className="font-editorial text-xl font-semibold text-stone-950 dark:text-white">
              Workspace Identity & Access
            </h2>
            <p className="mt-0.5 text-xs text-stone-500 dark:text-slate-400">
              Client-side PBKDF2-SHA256 authentication with Role-Based Access Control
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAuthModalOpen(false)}
            aria-label="Close identity dialog"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-stone-500 hover:bg-stone-100 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-stone-200 dark:border-slate-800 px-6 gap-6">
          {(
            [
              { id: 'personas', label: 'Switch Role' },
              { id: 'signin', label: 'Sign In' },
              { id: 'register', label: 'Create Account' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setMode(tab.id);
                setError(null);
              }}
              className={`py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                mode === tab.id
                  ? 'border-blue-700 dark:border-blue-400 text-stone-950 dark:text-white'
                  : 'border-transparent text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-md border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 px-3.5 py-2.5 text-xs font-medium text-rose-800 dark:text-rose-200"
            >
              {error}
            </div>
          )}

          {mode === 'personas' && (
            <div className="space-y-4">
              <p className="text-xs leading-relaxed text-stone-600 dark:text-slate-400">
                Select an encrypted workspace persona to test Admin, Editor, and Viewer permissions across tables,
                exports, and Cloudflare KV synchronization.
              </p>

              <div className="divide-y divide-stone-200 dark:divide-slate-800 border border-stone-200 dark:border-slate-800 rounded-md">
                {state.users.map((user) => {
                  const isCurrent = state.session?.userId === user.id;
                  return (
                    <div key={user.id} className="flex items-center justify-between gap-4 p-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          referrerPolicy="no-referrer"
                          className="h-10 w-10 rounded-full object-cover border border-stone-200 dark:border-slate-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-stone-900 dark:text-slate-100 truncate">
                            {user.name}
                          </div>
                          <div className="text-xs text-stone-500 dark:text-slate-400 truncate">
                            {ROLE_META[user.role].label} · {user.title}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isCurrent}
                        onClick={async () => {
                          await switchDemoUser(user.id);
                          setAuthModalOpen(false);
                        }}
                        className={`h-9 px-3.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                          isCurrent
                            ? 'bg-stone-100 dark:bg-slate-800 text-stone-500 dark:text-slate-400 cursor-default'
                            : 'bg-stone-900 dark:bg-slate-100 text-white dark:text-slate-950 hover:bg-stone-700 dark:hover:bg-white cursor-pointer'
                        }`}
                      >
                        {isCurrent ? 'Active' : `Use ${ROLE_META[user.role].label}`}
                      </button>
                    </div>
                  );
                })}
              </div>

              {state.session && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-stone-500 dark:text-slate-400">
                    Signed in as <span className="font-mono">{state.session.email}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      signOut();
                      setMode('signin');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400 hover:underline cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}

          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label htmlFor="auth-email" className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 rounded-md border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0B0E14] px-3 text-sm text-stone-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label htmlFor="auth-password" className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1.5">
                  Password
                </label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password (min. 8 characters)"
                  className="w-full h-10 rounded-md border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0B0E14] px-3 text-sm text-stone-900 dark:text-slate-100"
                />
                <p className="mt-1.5 text-xs text-stone-500 dark:text-slate-400">
                  Demo Admin password: <span className="font-mono">{DEMO_PASSWORDS['elena@meridianfolio.org']}</span>
                </p>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-sm font-medium text-white transition-colors cursor-pointer"
              >
                <Lock className="h-4 w-4" />
                {submitting ? 'Verifying PBKDF2 hash…' : 'Sign In Locally'}
              </button>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label htmlFor="reg-name" className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1.5">
                  Full Name
                </label>
                <input
                  id="reg-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Nadia Okafor"
                  className="w-full h-10 rounded-md border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0B0E14] px-3 text-sm text-stone-900 dark:text-slate-100"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="reg-email" className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1.5">
                    Email
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nadia@meridianfolio.org"
                    className="w-full h-10 rounded-md border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0B0E14] px-3 text-sm text-stone-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label htmlFor="reg-role" className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1.5">
                    Assigned Role
                  </label>
                  <select
                    id="reg-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="w-full h-10 rounded-md border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0B0E14] px-3 text-sm text-stone-900 dark:text-slate-100"
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="reg-password" className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1.5">
                  Password (min. 8 characters)
                </label>
                <input
                  id="reg-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 rounded-md border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0B0E14] px-3 text-sm text-stone-900 dark:text-slate-100"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-sm font-medium text-white transition-colors cursor-pointer"
              >
                <UserPlus className="h-4 w-4" />
                {submitting ? 'Deriving salted hash…' : 'Create Encrypted Account'}
              </button>
              <p className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-slate-400">
                <Shield className="h-3.5 w-3.5 shrink-0" />
                Credentials are salted & hashed locally via Web Crypto PBKDF2 before vault encryption.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
