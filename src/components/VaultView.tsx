import React, { useState } from 'react';
import { Check, Cloud, CloudOff, KeyRound, Play, RefreshCw, Shield, Terminal, Wifi, WifiOff } from 'lucide-react';
import { useEngine } from '../context/EngineContext';
import { ALL_PERMISSIONS, hasPermission, ROLE_META } from '../engine/rbac';
import type { Role, SyncTransportMode } from '../engine/types';

type HeadlessCommand =
  | 'getMetrics'
  | 'queryRecords'
  | 'getPermissions'
  | 'getEncryptedEnvelope'
  | 'getActivityMetrics';

export const VaultView: React.FC = () => {
  const {
    state,
    can,
    syncNow,
    pullRemote,
    setOfflineMode,
    updateSyncConfig,
    rotatePassphrase,
    updateUserRole,
    switchDemoUser,
    setAuthModalOpen,
  } = useEngine();

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [newPassphrase, setNewPassphrase] = useState('');
  const [endpointDraft, setEndpointDraft] = useState(state.syncConfig.endpointUrl);
  const [namespaceDraft, setNamespaceDraft] = useState(state.syncConfig.namespace);
  const [vaultKeyDraft, setVaultKeyDraft] = useState(state.syncConfig.vaultKey);
  const [tokenDraft, setTokenDraft] = useState(state.syncConfig.bearerToken);
  const [selectedCmd, setSelectedCmd] = useState<HeadlessCommand>('getMetrics');
  const [cmdOutput, setCmdOutput] = useState<string>('');

  const canPush = can('sync:push');
  const canConfigure = can('sync:configure');
  const canManageUsers = can('users:manage');

  const writePct = Math.min(
    100,
    Number(((state.syncState.quota.writesToday / Math.max(1, state.syncState.quota.dailyWriteLimit)) * 100).toFixed(1))
  );

  const handleSync = async () => {
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await syncNow();
      setStatusMessage('Encrypted AES-256-GCM snapshot synchronized with Edge KV.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Sync failed.');
    }
  };

  const handlePull = async () => {
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const res = await pullRemote();
      setStatusMessage(res.message);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Pull failed.');
    }
  };

  const handleSaveSyncConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      updateSyncConfig({
        endpointUrl: endpointDraft.trim() || '/api/kv',
        namespace: namespaceDraft.trim() || 'meridian-prod',
        vaultKey: vaultKeyDraft.trim() || 'editorial-vault-v1',
        bearerToken: tokenDraft.trim(),
      });
      setStatusMessage('Updated Cloudflare KV transport settings.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to save KV configuration.');
    }
  };

  const handleModeSwitch = (mode: SyncTransportMode) => {
    setErrorMessage(null);
    try {
      const nextUrl =
        mode === 'local-edge'
          ? '/api/kv'
          : mode === 'cloudflare-worker' && endpointDraft === '/api/kv'
            ? 'https://meridian-kv-sync.your-subdomain.workers.dev/api/kv'
            : endpointDraft;
      setEndpointDraft(nextUrl);
      updateSyncConfig({ mode, endpointUrl: nextUrl });
      setStatusMessage(`Transport switched to ${mode}.`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Insufficient permissions to change transport.');
    }
  };

  const handleRekey = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await rotatePassphrase(newPassphrase);
      setNewPassphrase('');
      setStatusMessage('Derived new PBKDF2-SHA256 key and re-encrypted local vault.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Passphrase rotation failed.');
    }
  };

  const runHeadlessCommand = (cmd: HeadlessCommand) => {
    setSelectedCmd(cmd);
    const api = window.MeridianAPI;
    if (!api) {
      setCmdOutput('// window.MeridianAPI is not attached');
      return;
    }
    let result: unknown;
    if (cmd === 'getMetrics') result = api.getMetrics();
    else if (cmd === 'queryRecords') result = api.queryRecords({ sortKey: 'readers', sortDir: 'desc' }).slice(0, 3);
    else if (cmd === 'getPermissions') result = { role: state.session?.role ?? null, permissions: api.getPermissions() };
    else if (cmd === 'getEncryptedEnvelope') {
      const env = api.getEncryptedEnvelope();
      result = env
        ? {
            ...env,
            ciphertext: `${env.ciphertext.slice(0, 96)}… (${env.ciphertext.length} base64 chars)`,
          }
        : null;
    } else if (cmd === 'getActivityMetrics') {
      result = api.getActivityMetrics();
    }
    setCmdOutput(JSON.stringify(result, null, 2));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-stone-200 dark:border-slate-800">
        <div>
          <p className="text-xs text-stone-500 dark:text-slate-400">
            Browser-Side Backend · Web Crypto AES-256-GCM · Cloudflare KV Free-Tier Adapter
          </p>
          <h1 className="mt-1 font-editorial text-3xl sm:text-4xl font-medium text-stone-950 dark:text-white">
            Encrypted Vault, RBAC & Headless API
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setOfflineMode(!state.offlineSimulated)}
            className={`inline-flex items-center gap-1.5 h-10 px-3.5 rounded-md border text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
              state.offlineSimulated
                ? 'border-amber-600 dark:border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                : 'border-stone-300 dark:border-slate-700 bg-white dark:bg-[#131821] text-stone-800 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800'
            }`}
          >
            {state.offlineSimulated ? <WifiOff className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5" />}
            {state.offlineSimulated ? 'Offline Mode Active' : 'Simulate Offline'}
          </button>
          <button
            type="button"
            onClick={() => void handlePull()}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-md border border-stone-300 dark:border-slate-700 bg-white dark:bg-[#131821] text-xs font-medium text-stone-800 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Pull Remote (304)
          </button>
          <button
            type="button"
            disabled={!canPush || state.syncState.status === 'syncing'}
            onClick={() => void handleSync()}
            className={`inline-flex items-center gap-1.5 h-10 px-4 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              canPush
                ? 'bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white cursor-pointer'
                : 'bg-stone-200 dark:bg-slate-800 text-stone-500 dark:text-slate-400 cursor-not-allowed'
            }`}
          >
            {state.offlineSimulated ? <CloudOff className="h-3.5 w-3.5" /> : <Cloud className="h-3.5 w-3.5" />}
            Sync Encrypted Vault
          </button>
        </div>
      </div>

      {statusMessage && (
        <div role="status" className="rounded-md border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-xs font-medium text-emerald-900 dark:text-emerald-200">
          {statusMessage}
        </div>
      )}
      {errorMessage && (
        <div role="alert" className="rounded-md border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-xs font-medium text-rose-900 dark:text-rose-200">
          {errorMessage}
        </div>
      )}

      {/* Top Row: Cloudflare KV Free-Tier Budget & Live Ciphertext Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Cloudflare KV Sync Config & Free-Tier Quota */}
        <section className="lg:col-span-7 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-[#131821] p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-editorial text-xl font-medium text-stone-950 dark:text-white">
                Cloudflare KV Free-Tier Sync Engine
              </h2>
              <p className="text-xs text-stone-500 dark:text-slate-400">
                Packs workspace state into 1 encrypted blob with ETag dedupe & write coalescing.
              </p>
            </div>
            <span className="font-mono text-xs tabular-nums text-stone-600 dark:text-slate-300">
              {state.syncState.lastLatencyMs > 0 ? `Last RTT: ${state.syncState.lastLatencyMs}ms` : 'Ready'}
            </span>
          </div>

          {/* Quota Progress Bar */}
          <div className="p-4 rounded-md border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-[#0B0E14]">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
              <span className="font-medium text-stone-800 dark:text-slate-200">Daily Cloudflare KV Write Budget</span>
              <span className="font-mono tabular-nums text-stone-700 dark:text-slate-300">
                {state.syncState.quota.writesToday} / {state.syncState.quota.dailyWriteLimit} writes ({writePct}%)
              </span>
            </div>
            <div className="mt-2 h-2 w-full rounded-xs bg-stone-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-blue-700 dark:bg-blue-400 transition-all duration-200"
                style={{ width: `${Math.max(1, writePct)}%` }}
              />
            </div>
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-stone-500 dark:text-slate-400">
              <span>Reads today: {state.syncState.quota.readsToday} / 100,000</span>
              <span>Coalesced writes saved: {state.telemetry.coalescedWritesSaved}</span>
              <span>Blob: {(state.syncState.lastByteSize / 1024).toFixed(1)} KB</span>
            </div>
          </div>

          {/* Transport Mode Selector */}
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: 'local-edge', label: 'Local KV Edge (/api/kv)' },
                { id: 'cloudflare-worker', label: 'Cloudflare Worker URL' },
                { id: 'offline-only', label: 'Offline Local Only' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={!canConfigure}
                onClick={() => handleModeSwitch(opt.id)}
                className={`h-9 px-3 rounded-md border text-xs font-medium whitespace-nowrap transition-colors ${
                  state.syncConfig.mode === opt.id
                    ? 'border-blue-700 dark:border-blue-400 bg-blue-700/10 dark:bg-blue-400/15 text-blue-900 dark:text-blue-200'
                    : 'border-stone-200 dark:border-slate-700 text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-100'
                } ${canConfigure ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSaveSyncConfig} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="kv-endpoint" className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1">
                KV Endpoint URL
              </label>
              <input
                id="kv-endpoint"
                type="text"
                disabled={!canConfigure}
                value={endpointDraft}
                onChange={(e) => setEndpointDraft(e.target.value)}
                className="w-full h-9 rounded-md border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0B0E14] px-3 font-mono text-xs text-stone-900 dark:text-slate-100 disabled:opacity-60"
              />
            </div>
            <div>
              <label htmlFor="kv-namespace" className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1">
                KV Namespace
              </label>
              <input
                id="kv-namespace"
                type="text"
                disabled={!canConfigure}
                value={namespaceDraft}
                onChange={(e) => setNamespaceDraft(e.target.value)}
                className="w-full h-9 rounded-md border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0B0E14] px-3 font-mono text-xs text-stone-900 dark:text-slate-100 disabled:opacity-60"
              />
            </div>
            <div>
              <label htmlFor="kv-key" className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1">
                Vault Key
              </label>
              <input
                id="kv-key"
                type="text"
                disabled={!canConfigure}
                value={vaultKeyDraft}
                onChange={(e) => setVaultKeyDraft(e.target.value)}
                className="w-full h-9 rounded-md border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0B0E14] px-3 font-mono text-xs text-stone-900 dark:text-slate-100 disabled:opacity-60"
              />
            </div>
            <div className="sm:col-span-2 flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[180px]">
                <label htmlFor="kv-token" className="block text-xs font-medium text-stone-700 dark:text-slate-300 mb-1">
                  Worker Bearer Token (optional for local simulator)
                </label>
                <input
                  id="kv-token"
                  type="password"
                  disabled={!canConfigure}
                  value={tokenDraft}
                  onChange={(e) => setTokenDraft(e.target.value)}
                  placeholder="Optional Authorization header for Cloudflare Worker"
                  className="w-full h-9 rounded-md border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0B0E14] px-3 font-mono text-xs text-stone-900 dark:text-slate-100 disabled:opacity-60"
                />
              </div>
              <button
                type="submit"
                disabled={!canConfigure}
                className="h-9 px-4 rounded-md bg-stone-900 dark:bg-slate-100 text-white dark:text-slate-950 text-xs font-medium whitespace-nowrap disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                Save Endpoint
              </button>
            </div>
          </form>
        </section>

        {/* Live AES-256-GCM Ciphertext Inspector & Passphrase Rotation */}
        <section className="lg:col-span-5 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-[#131821] p-6 flex flex-col justify-between space-y-5">
          <div>
            <h2 className="font-editorial text-xl font-medium text-stone-950 dark:text-white">
              Client-Side AES-256-GCM Envelope
            </h2>
            <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
              All records are encrypted inside your browser via Web Crypto before touching storage or Cloudflare KV.
            </p>

            {state.lastEnvelopePreview && (
              <dl className="mt-4 space-y-2.5 text-xs border-t border-stone-200 dark:border-slate-800 pt-4">
                <div className="flex justify-between gap-3">
                  <dt className="text-stone-500 dark:text-slate-400">Cipher / KDF</dt>
                  <dd className="font-mono text-stone-900 dark:text-slate-100">
                    {state.lastEnvelopePreview.alg} · {state.lastEnvelopePreview.kdf}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-stone-500 dark:text-slate-400">PBKDF2 Rounds</dt>
                  <dd className="font-mono tabular-nums text-stone-900 dark:text-slate-100">
                    {state.lastEnvelopePreview.iterations.toLocaleString()}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-stone-500 dark:text-slate-400">96-bit Nonce (IV)</dt>
                  <dd className="font-mono text-stone-900 dark:text-slate-100 truncate max-w-[200px]">
                    {state.lastEnvelopePreview.iv}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-stone-500 dark:text-slate-400">SHA-256 Checksum</dt>
                  <dd className="font-mono text-stone-900 dark:text-slate-100 truncate max-w-[200px]">
                    {state.lastEnvelopePreview.checksum.slice(0, 20)}…
                  </dd>
                </div>
                <div>
                  <dt className="text-stone-500 dark:text-slate-400 mb-1">Opaque KV Ciphertext Preview</dt>
                  <dd className="p-2.5 rounded-md bg-stone-100 dark:bg-[#0B0E14] border border-stone-200 dark:border-slate-800 font-mono text-[11px] break-all text-stone-700 dark:text-slate-300 leading-relaxed">
                    {state.lastEnvelopePreview.ciphertext.slice(0, 156)}…
                  </dd>
                </div>
              </dl>
            )}
          </div>

          <form onSubmit={handleRekey} className="pt-4 border-t border-stone-200 dark:border-slate-800 space-y-2.5">
            <label htmlFor="vault-rekey" className="block text-xs font-medium text-stone-700 dark:text-slate-300">
              Rotate Local Encryption Passphrase (Admin Only)
            </label>
            <div className="flex gap-2">
              <input
                id="vault-rekey"
                type="password"
                disabled={!canConfigure}
                value={newPassphrase}
                onChange={(e) => setNewPassphrase(e.target.value)}
                placeholder="Min. 10 characters"
                className="flex-1 h-9 rounded-md border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0B0E14] px-3 text-xs text-stone-900 dark:text-slate-100 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!canConfigure}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0B0E14] text-xs font-medium text-stone-900 dark:text-slate-100 hover:bg-stone-100 dark:hover:bg-slate-800 disabled:opacity-40 whitespace-nowrap cursor-pointer disabled:cursor-not-allowed"
              >
                <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                Re-Key
              </button>
            </div>
          </form>
        </section>
      </div>

      {/* RBAC Team Governance & Permissions Matrix */}
      <section className="rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-[#131821] p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-editorial text-xl font-medium text-stone-950 dark:text-white">
              Role-Based Access Control (RBAC)
            </h2>
            <p className="text-xs text-stone-500 dark:text-slate-400">
              Active identity: <strong>{state.session?.name ?? 'Signed out'}</strong> ·{' '}
              {state.session ? ROLE_META[state.session.role].label : 'None'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-stone-300 dark:border-slate-700 text-xs font-medium text-stone-800 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            Switch Identity / Register
          </button>
        </div>

        {/* Team Role Assignments */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-200 dark:border-slate-800 text-stone-500 dark:text-slate-400">
                <th scope="col" className="py-2.5 pr-4 font-medium">Member</th>
                <th scope="col" className="py-2.5 px-4 font-medium">Email</th>
                <th scope="col" className="py-2.5 px-4 font-medium">Role Assignment</th>
                <th scope="col" className="py-2.5 pl-4 text-right font-medium">Session</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/70 dark:divide-slate-800">
              {state.users.map((u) => {
                const isMe = state.session?.userId === u.id;
                return (
                  <tr key={u.id}>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={u.avatarUrl}
                          alt={u.name}
                          referrerPolicy="no-referrer"
                          className="h-7 w-7 rounded-full object-cover border border-stone-200 dark:border-slate-700"
                        />
                        <div>
                          <div className="font-medium text-stone-900 dark:text-slate-100">{u.name}</div>
                          <div className="text-[11px] text-stone-500 dark:text-slate-400">{u.title}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-stone-600 dark:text-slate-300">{u.email}</td>
                    <td className="py-3 px-4">
                      {canManageUsers ? (
                        <select
                          aria-label={`Role for ${u.name}`}
                          value={u.role}
                          onChange={(e) => {
                            setErrorMessage(null);
                            void updateUserRole(u.id, e.target.value as Role).catch((err) =>
                              setErrorMessage(err instanceof Error ? err.message : 'Role update failed')
                            );
                          }}
                          className="h-8 rounded-md border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0B0E14] px-2 text-xs text-stone-900 dark:text-slate-100 cursor-pointer"
                        >
                          <option value="admin">Admin</option>
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      ) : (
                        <span className="font-medium text-stone-700 dark:text-slate-300">
                          {ROLE_META[u.role].label}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <button
                        type="button"
                        disabled={isMe}
                        onClick={() => void switchDemoUser(u.id)}
                        className={`h-8 px-3 rounded-md text-xs font-medium whitespace-nowrap ${
                          isMe
                            ? 'text-stone-400 dark:text-slate-500 cursor-default'
                            : 'border border-stone-300 dark:border-slate-700 text-stone-800 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer'
                        }`}
                      >
                        {isMe ? 'Current' : 'Impersonate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Granular Permission Matrix */}
        <div className="overflow-x-auto pt-2 border-t border-stone-200 dark:border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-200 dark:border-slate-800 text-stone-500 dark:text-slate-400">
                <th scope="col" className="py-2.5 pr-4 font-medium">Capability</th>
                <th scope="col" className="py-2.5 px-4 text-center font-medium">Admin</th>
                <th scope="col" className="py-2.5 px-4 text-center font-medium">Editor</th>
                <th scope="col" className="py-2.5 pl-4 text-center font-medium">Viewer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-slate-800/80">
              {ALL_PERMISSIONS.map((perm) => (
                <tr key={perm.key}>
                  <td className="py-2 pr-4">
                    <span className="font-medium text-stone-900 dark:text-slate-100">{perm.label}</span>
                    <span className="ml-2 text-stone-500 dark:text-slate-400 hidden sm:inline">
                      — {perm.description}
                    </span>
                  </td>
                  {(['admin', 'editor', 'viewer'] as const).map((r) => {
                    const allowed = hasPermission(r, perm.key);
                    return (
                      <td key={r} className="py-2 px-4 text-center">
                        {allowed ? (
                          <span className="inline-flex items-center justify-center text-emerald-700 dark:text-emerald-400" aria-label="Allowed">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        ) : (
                          <span className="text-stone-300 dark:text-slate-700" aria-label="Denied">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Headless Developer API Playground (window.MeridianAPI) */}
      <section className="rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-[#131821] p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-editorial text-xl font-medium text-stone-950 dark:text-white flex items-center gap-2">
              <Terminal className="h-4 w-4 text-blue-700 dark:text-blue-400" aria-hidden="true" />
              Headless Browser Engine Playground
            </h2>
            <p className="mt-0.5 text-xs text-stone-500 dark:text-slate-400">
              Run <code className="font-mono">window.MeridianAPI</code> directly without UI bindings — ideal for headless automation, custom frontends, or DevTools scripting.
            </p>
          </div>
          <button
            type="button"
            onClick={() => runHeadlessCommand(selectedCmd)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-stone-900 dark:bg-slate-100 text-white dark:text-slate-950 text-xs font-medium cursor-pointer"
          >
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
            Execute Query
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'getMetrics', label: 'MeridianAPI.getMetrics()' },
              { id: 'queryRecords', label: 'MeridianAPI.queryRecords()' },
              { id: 'getPermissions', label: 'MeridianAPI.getPermissions()' },
              { id: 'getEncryptedEnvelope', label: 'MeridianAPI.getEncryptedEnvelope()' },
              { id: 'getActivityMetrics', label: 'MeridianAPI.getActivityMetrics()' },
            ] as const
          ).map((cmd) => (
            <button
              key={cmd.id}
              type="button"
              onClick={() => runHeadlessCommand(cmd.id)}
              className={`h-8 px-3 rounded-md border font-mono text-xs transition-colors cursor-pointer ${
                selectedCmd === cmd.id
                  ? 'border-blue-700 dark:border-blue-400 bg-blue-700/10 dark:bg-blue-400/15 text-blue-900 dark:text-blue-200'
                  : 'border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
              }`}
            >
              {cmd.label}
            </button>
          ))}
        </div>

        <pre className="max-h-72 overflow-auto rounded-md border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-[#0B0E14] p-4 font-mono text-xs leading-relaxed text-stone-800 dark:text-slate-200">
          {cmdOutput || '// Select any headless API method above to inspect live JSON output from MeridianEngine'}
        </pre>

        <details className="pt-2 border-t border-stone-200 dark:border-slate-800 text-xs text-stone-600 dark:text-slate-400">
          <summary className="cursor-pointer font-medium text-stone-800 dark:text-slate-200 py-1">
            Deploy free-tier Cloudflare Worker + KV sync endpoint (60-second setup)
          </summary>
          <pre className="mt-2 overflow-x-auto rounded-md border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-[#0B0E14] p-3.5 font-mono text-[11px] leading-relaxed text-stone-800 dark:text-slate-200">
{`# 1. Create a free Cloudflare KV namespace
npx wrangler kv namespace create MERIDIAN_VAULT

# 2. Paste the returned namespace ID into cloudflare/wrangler.toml
# 3. Set an optional bearer secret and deploy
npx wrangler secret put SYNC_TOKEN --config cloudflare/wrangler.toml
npx wrangler deploy --config cloudflare/wrangler.toml

# 4. Select "Cloudflare Worker URL" above and enter https://<your-worker>.workers.dev/api/kv`}
          </pre>
        </details>
      </section>
    </div>
  );
};
