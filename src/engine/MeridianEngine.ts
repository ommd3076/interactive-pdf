import {
  computeActivityMetrics,
  computeAnalyticsSummary,
  filterRecords,
  recordsToCsv,
  sortRecords,
} from './analytics';
import {
  decryptVaultPayload,
  encryptVaultPayload,
  hashPassword,
  sha256Hex,
  signSessionToken,
  verifyPassword,
} from './crypto';
import { DEFAULT_KV_CONFIG, HttpKvTransport, type KvTransport } from './kvSync';
import { assertPermission, getPermissionsForRole, hasPermission, validateCredentials } from './rbac';
import {
  createSeedUsers,
  DEFAULT_VAULT_PASSPHRASE,
  SEED_ACTIVITY,
  SEED_AVATARS,
  SEED_CHAPTERS,
  SEED_RECORDS,
} from './seedData';
import type {
  ActivityEvent,
  ActivityMetrics,
  AnalyticsSummary,
  EncryptedEnvelope,
  EngineStateSnapshot,
  EngineTelemetry,
  FilterState,
  KvSyncConfig,
  KvSyncState,
  Permission,
  PublicationRecord,
  Role,
  Session,
  SortDir,
  SortKey,
  StoryChapter,
  UserAccount,
  VaultSnapshot,
} from './types';

export interface KeyValueStorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

class MemoryStorageAdapter implements KeyValueStorageAdapter {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

const STORAGE_KEYS = {
  VAULT: 'meridian_encrypted_vault_v1',
  SESSION: 'meridian_session_v1',
  SYNC_CONFIG: 'meridian_kv_config_v1',
  SYNC_META: 'meridian_kv_meta_v1',
};

type EngineListener = (snapshot: EngineStateSnapshot) => void;

export interface EngineOptions {
  storage?: KeyValueStorageAdapter;
  transport?: KvTransport;
  passphrase?: string;
}

export class MeridianEngine {
  private storage: KeyValueStorageAdapter;
  private transport: KvTransport;
  private passphrase: string;
  private listeners = new Set<EngineListener>();

  private initialized = false;
  private records: PublicationRecord[] = [];
  private chapters: StoryChapter[] = [];
  private users: UserAccount[] = [];
  private activity: ActivityEvent[] = [];
  private session: Session | null = null;
  private filters: FilterState = {
    region: 'All',
    channel: 'All',
    timeframe: '12M',
    search: '',
  };

  private syncConfig: KvSyncConfig = { ...DEFAULT_KV_CONFIG };
  private syncState: KvSyncState = {
    status: 'idle',
    dirty: false,
    pendingWrites: 0,
    lastSyncedAt: null,
    lastEtag: null,
    lastByteSize: 0,
    lastLatencyMs: 0,
    errorMessage: null,
    quota: {
      readsToday: 0,
      writesToday: 0,
      dailyWriteLimit: 1000,
      dailyReadLimit: 100000,
    },
  };

  private offlineSimulated = false;
  private lastSyncedChecksum: string | null = null;
  private lastEnvelopePreview: EncryptedEnvelope | null = null;
  private coalesceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingSyncPromise: Promise<KvSyncState> | null = null;

  // Bounded LRU query cache for zero-latency analytics reads
  private queryCache = new Map<string, { value: unknown; version: number }>();
  private dataVersion = 1;
  private queryTimes: number[] = [];
  private telemetry: EngineTelemetry = {
    cacheHits: 0,
    cacheMisses: 0,
    cacheHitRate: 100,
    avgQueryMs: 0.4,
    coalescedWritesSaved: 0,
  };

  constructor(options: EngineOptions = {}) {
    if (options.storage) {
      this.storage = options.storage;
    } else if (typeof window !== 'undefined' && window.localStorage) {
      this.storage = window.localStorage;
    } else {
      this.storage = new MemoryStorageAdapter();
    }
    this.transport = options.transport ?? new HttpKvTransport();
    this.passphrase = options.passphrase ?? DEFAULT_VAULT_PASSPHRASE;
  }

  subscribe(listener: EngineListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    const snap = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snap);
    }
  }

  private bumpVersion(): void {
    this.dataVersion += 1;
    this.queryCache.clear();
  }

  private recordQueryMetric(durationMs: number, hit: boolean): void {
    if (hit) this.telemetry.cacheHits += 1;
    else this.telemetry.cacheMisses += 1;
    this.queryTimes.push(durationMs);
    if (this.queryTimes.length > 40) this.queryTimes.shift();
    const total = this.telemetry.cacheHits + this.telemetry.cacheMisses;
    this.telemetry.cacheHitRate = total > 0 ? Number(((this.telemetry.cacheHits / total) * 100).toFixed(1)) : 100;
    const avg = this.queryTimes.reduce((a, b) => a + b, 0) / Math.max(1, this.queryTimes.length);
    this.telemetry.avgQueryMs = Number(avg.toFixed(2));
  }

  getSnapshot(): EngineStateSnapshot {
    return {
      initialized: this.initialized,
      session: this.session ? { ...this.session } : null,
      records: this.records,
      chapters: this.chapters,
      users: this.users.map(({ passwordHash: _h, passwordSalt: _s, ...pub }) => pub),
      activity: this.activity,
      filters: { ...this.filters },
      syncConfig: { ...this.syncConfig },
      syncState: {
        ...this.syncState,
        quota: { ...this.syncState.quota },
      },
      telemetry: { ...this.telemetry },
      offlineSimulated: this.offlineSimulated,
      lastEnvelopePreview: this.lastEnvelopePreview ? { ...this.lastEnvelopePreview } : null,
    };
  }

  private buildVaultSnapshot(): VaultSnapshot {
    return {
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      records: this.records,
      chapters: this.chapters,
      users: this.users,
      activity: this.activity.slice(0, 120),
    };
  }

  private async persistLocalEncrypted(markDirty = true): Promise<EncryptedEnvelope> {
    const payload = this.buildVaultSnapshot();
    const actor = this.session?.email ?? 'system';
    const envelope = await encryptVaultPayload(payload, this.passphrase, actor);
    this.lastEnvelopePreview = envelope;
    this.storage.setItem(STORAGE_KEYS.VAULT, JSON.stringify(envelope));

    if (markDirty) {
      if (this.syncState.dirty && this.syncState.pendingWrites > 0) {
        this.telemetry.coalescedWritesSaved += 1;
      }
      this.syncState.dirty = true;
      this.syncState.pendingWrites += 1;
      this.syncState.lastByteSize = JSON.stringify(envelope).length;
      if (this.offlineSimulated || this.syncConfig.mode === 'offline-only') {
        this.syncState.status = 'offline';
      } else if (this.syncConfig.autoSync) {
        this.scheduleCoalescedSync();
      }
    }
    return envelope;
  }

  private scheduleCoalescedSync(): void {
    if (this.coalesceTimer) {
      clearTimeout(this.coalesceTimer);
    }
    if (this.offlineSimulated || this.syncConfig.mode === 'offline-only') {
      return;
    }
    if (!hasPermission(this.session?.role, 'sync:push')) {
      return;
    }
    this.coalesceTimer = setTimeout(() => {
      this.coalesceTimer = null;
      void this.syncNow({ silent: true });
    }, this.syncConfig.coalesceWindowMs);
  }

  async initialize(): Promise<EngineStateSnapshot> {
    if (this.initialized) return this.getSnapshot();

    // Load saved sync config if present
    const savedConfig = this.storage.getItem(STORAGE_KEYS.SYNC_CONFIG);
    if (savedConfig) {
      try {
        this.syncConfig = { ...DEFAULT_KV_CONFIG, ...JSON.parse(savedConfig) };
      } catch {
        this.syncConfig = { ...DEFAULT_KV_CONFIG };
      }
    }

    const savedMeta = this.storage.getItem(STORAGE_KEYS.SYNC_META);
    if (savedMeta) {
      try {
        const parsedMeta = JSON.parse(savedMeta);
        this.syncState.lastSyncedAt = parsedMeta.lastSyncedAt ?? null;
        this.syncState.lastEtag = parsedMeta.lastEtag ?? null;
        this.lastSyncedChecksum = parsedMeta.lastSyncedChecksum ?? null;
        if (parsedMeta.quota) {
          this.syncState.quota = { ...this.syncState.quota, ...parsedMeta.quota };
        }
      } catch {
        // ignore
      }
    }

    // Attempt to restore local encrypted vault
    const rawVault = this.storage.getItem(STORAGE_KEYS.VAULT);
    let restored = false;
    if (rawVault) {
      try {
        const envelope = JSON.parse(rawVault) as EncryptedEnvelope;
        const decrypted = await decryptVaultPayload<VaultSnapshot>(envelope, this.passphrase);
        if (Array.isArray(decrypted.records) && Array.isArray(decrypted.users) && decrypted.users.length > 0) {
          this.records = decrypted.records;
          this.chapters = decrypted.chapters?.length ? decrypted.chapters : [...SEED_CHAPTERS];
          this.users = decrypted.users;
          this.activity = decrypted.activity?.length ? decrypted.activity : [...SEED_ACTIVITY];
          this.lastEnvelopePreview = envelope;
          this.syncState.lastByteSize = rawVault.length;
          restored = true;
        }
      } catch {
        // Fallback to clean seed if corrupted
      }
    }

    if (!restored) {
      this.records = SEED_RECORDS.map((r) => ({ ...r, monthlyTrend: [...r.monthlyTrend] }));
      this.chapters = SEED_CHAPTERS.map((c) => ({ ...c }));
      this.users = await createSeedUsers();
      this.activity = SEED_ACTIVITY.map((a) => ({ ...a }));
    }

    // Restore session or default to Elena Vance (Admin) so first-load exploration works seamlessly
    const rawSession = this.storage.getItem(STORAGE_KEYS.SESSION);
    if (rawSession) {
      try {
        const parsed = JSON.parse(rawSession) as Session;
        const found = this.users.find((u) => u.id === parsed.userId);
        if (found) {
          this.session = {
            ...parsed,
            role: found.role,
            name: found.name,
            title: found.title,
            avatarUrl: found.avatarUrl,
          };
        }
      } catch {
        this.session = null;
      }
    }

    if (!this.session && this.users.length > 0) {
      const defaultUser = this.users[0];
      this.session = await this.createSignedSession(defaultUser);
      this.storage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(this.session));
    }

    if (!restored) {
      await this.persistLocalEncrypted(false);
    }

    this.initialized = true;
    this.bumpVersion();
    // Warm the default analytics summary so first UI render hits the in-memory LRU cache
    this.getAnalyticsSummary(this.filters);
    this.emit();
    return this.getSnapshot();
  }

  private async createSignedSession(user: UserAccount): Promise<Session> {
    const issuedAt = new Date().toISOString();
    const payload = `${user.id}:${user.email}:${user.role}:${issuedAt}`;
    const signature = await signSessionToken(payload, this.passphrase);
    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      title: user.title,
      avatarUrl: user.avatarUrl,
      issuedAt,
      signature,
    };
  }

  private appendActivity(
    action: ActivityEvent['action'],
    summary: string,
    durationMs?: number
  ): void {
    const now = new Date();
    const event: ActivityEvent = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: now.toISOString(),
      userId: this.session?.userId ?? 'anonymous',
      userName: this.session?.name ?? 'Guest',
      userRole: this.session?.role ?? 'viewer',
      action,
      summary,
      durationMs,
      hourOfDay: now.getHours(),
      dayOfWeek: (now.getDay() + 6) % 7,
    };
    this.activity = [event, ...this.activity].slice(0, 120);
  }

  // --- Authentication & RBAC ---

  can(permission: Permission): boolean {
    return hasPermission(this.session?.role, permission);
  }

  getPermissions(): Permission[] {
    if (!this.session) return [];
    return getPermissionsForRole(this.session.role);
  }

  async signIn(email: string, password: string): Promise<Session> {
    const validationError = validateCredentials(email, password);
    if (validationError) {
      throw new Error(validationError);
    }

    const normalized = email.trim().toLowerCase();
    const user = this.users.find((u) => u.email.toLowerCase() === normalized);
    if (!user) {
      throw new Error('No account found for that email address.');
    }

    const started = performance.now();
    const ok = await verifyPassword(password, user.passwordSalt, user.passwordHash);
    if (!ok) {
      throw new Error('Incorrect password. Please verify your credentials.');
    }

    user.lastActiveAt = new Date().toISOString();
    this.session = await this.createSignedSession(user);
    this.storage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(this.session));
    this.appendActivity(
      'auth.signin',
      `Authenticated ${user.name} (${user.role}) via PBKDF2-SHA256`,
      Math.max(1, Math.round(performance.now() - started))
    );
    await this.persistLocalEncrypted(false);
    this.emit();
    return this.session;
  }

  async registerUser(input: {
    name: string;
    email: string;
    password: string;
    role: Role;
    title?: string;
  }): Promise<Session> {
    const validationError = validateCredentials(input.email, input.password, input.name);
    if (validationError) {
      throw new Error(validationError);
    }
    const normalized = input.email.trim().toLowerCase();
    if (this.users.some((u) => u.email.toLowerCase() === normalized)) {
      throw new Error('An account with this email already exists in the local vault.');
    }

    const { salt, hash } = await hashPassword(input.password);
    const now = new Date().toISOString();
    const avatarPool = [SEED_AVATARS.elena, SEED_AVATARS.marcus, SEED_AVATARS.sora];
    const newUser: UserAccount = {
      id: `usr-${Date.now()}`,
      name: input.name.trim(),
      email: normalized,
      title: input.title?.trim() || (input.role === 'admin' ? 'Workspace Admin' : input.role === 'editor' ? 'Editorial Contributor' : 'Research Reader'),
      role: input.role,
      avatarUrl: avatarPool[this.users.length % avatarPool.length],
      passwordSalt: salt,
      passwordHash: hash,
      createdAt: now,
      lastActiveAt: now,
    };

    this.users = [...this.users, newUser];
    this.session = await this.createSignedSession(newUser);
    this.storage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(this.session));
    this.appendActivity('auth.register', `Registered encrypted account ${newUser.name} as ${newUser.role}`);
    await this.persistLocalEncrypted(true);
    this.emit();
    return this.session;
  }

  async switchDemoUser(userId: string): Promise<Session> {
    const target = this.users.find((u) => u.id === userId);
    if (!target) {
      throw new Error('User not found in encrypted vault.');
    }
    target.lastActiveAt = new Date().toISOString();
    this.session = await this.createSignedSession(target);
    this.storage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(this.session));
    this.appendActivity('auth.signin', `Switched active workspace persona to ${target.name} (${target.role})`);
    await this.persistLocalEncrypted(false);
    this.emit();
    return this.session;
  }

  async updateUserRole(targetUserId: string, newRole: Role): Promise<void> {
    assertPermission(this.session?.role, 'users:manage');
    const target = this.users.find((u) => u.id === targetUserId);
    if (!target) throw new Error('User not found.');
    if (target.id === this.session?.userId && newRole !== 'admin') {
      const otherAdmins = this.users.filter((u) => u.id !== target.id && u.role === 'admin');
      if (otherAdmins.length === 0) {
        throw new Error('At least one Admin must remain in the workspace.');
      }
    }
    const previous = target.role;
    target.role = newRole;
    if (this.session && this.session.userId === target.id) {
      this.session = await this.createSignedSession(target);
      this.storage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(this.session));
    }
    this.appendActivity('auth.role_change', `Changed ${target.name}'s role from ${previous} to ${newRole}`);
    await this.persistLocalEncrypted(true);
    this.emit();
  }

  signOut(): void {
    this.session = null;
    this.storage.removeItem(STORAGE_KEYS.SESSION);
    this.emit();
  }

  // --- Query & Filter API (LRU-Cached) ---

  setFilters(partial: Partial<FilterState>): FilterState {
    const next = { ...this.filters, ...partial };
    const changed =
      next.region !== this.filters.region ||
      next.channel !== this.filters.channel ||
      next.timeframe !== this.filters.timeframe ||
      next.search !== this.filters.search;
    this.filters = next;
    if (changed && !partial.search) {
      this.appendActivity(
        'filter.change',
        `Applied view filter: ${next.region} · ${next.channel} · ${next.timeframe}`,
        1
      );
    }
    this.emit();
    return { ...this.filters };
  }

  resetFilters(): FilterState {
    return this.setFilters({ region: 'All', channel: 'All', timeframe: '12M', search: '' });
  }

  getAnalyticsSummary(overrideFilters?: FilterState): AnalyticsSummary {
    const active = overrideFilters ?? this.filters;
    const cacheKey = `summary:${this.dataVersion}:${JSON.stringify(active)}`;
    const started = performance.now();
    const cached = this.queryCache.get(cacheKey);
    if (cached && cached.version === this.dataVersion) {
      this.recordQueryMetric(Math.max(0.05, performance.now() - started), true);
      return cached.value as AnalyticsSummary;
    }

    const summary = computeAnalyticsSummary(this.records, active);
    if (this.queryCache.size > 48) {
      const oldest = this.queryCache.keys().next().value;
      if (oldest) this.queryCache.delete(oldest);
    }
    this.queryCache.set(cacheKey, { value: summary, version: this.dataVersion });
    this.recordQueryMetric(Math.max(0.1, performance.now() - started), false);
    return summary;
  }

  queryRecords(options?: {
    filters?: FilterState;
    sortKey?: SortKey;
    sortDir?: SortDir;
  }): PublicationRecord[] {
    const active = options?.filters ?? this.filters;
    const sortKey = options?.sortKey ?? 'readers';
    const sortDir = options?.sortDir ?? 'desc';
    const cacheKey = `records:${this.dataVersion}:${JSON.stringify(active)}:${sortKey}:${sortDir}`;
    const started = performance.now();
    const cached = this.queryCache.get(cacheKey);
    if (cached && cached.version === this.dataVersion) {
      this.recordQueryMetric(Math.max(0.05, performance.now() - started), true);
      return cached.value as PublicationRecord[];
    }
    const filtered = filterRecords(this.records, active);
    const sorted = sortRecords(filtered, sortKey, sortDir);
    this.queryCache.set(cacheKey, { value: sorted, version: this.dataVersion });
    this.recordQueryMetric(Math.max(0.1, performance.now() - started), false);
    return sorted;
  }

  getActivityMetrics(): ActivityMetrics {
    return computeActivityMetrics(this.activity);
  }

  logStoryChapter(chapterTitle: string): void {
    this.appendActivity('story.chapter', `Focused editorial chapter: "${chapterTitle}"`, 1);
    this.emit();
  }

  // --- Dataset Mutations (RBAC-Protected + Encrypted) ---

  async addRecord(
    input: Omit<PublicationRecord, 'id' | 'monthlyTrend'> & { monthlyTrend?: number[] }
  ): Promise<PublicationRecord> {
    assertPermission(this.session?.role, 'dataset:write');
    if (!input.title.trim()) throw new Error('Title is required.');
    if (!input.section.trim()) throw new Error('Section is required.');
    if (!input.author.trim()) throw new Error('Author is required.');
    if (!Number.isFinite(input.readers) || input.readers <= 0) {
      throw new Error('Readers must be a positive number.');
    }

    const baseMonthly = Math.max(100, Math.round(input.readers / 12));
    const trend =
      input.monthlyTrend && input.monthlyTrend.length === 12
        ? input.monthlyTrend
        : Array.from({ length: 12 }, (_, i) => Math.round(baseMonthly * (0.82 + (i / 11) * 0.36)));

    const record: PublicationRecord = {
      ...input,
      id: `rec-${Date.now().toString(36)}`,
      title: input.title.trim(),
      section: input.section.trim(),
      author: input.author.trim(),
      notes: input.notes.trim(),
      monthlyTrend: trend,
    };

    const started = performance.now();
    this.records = [record, ...this.records];
    this.bumpVersion();
    this.appendActivity(
      'record.create',
      `Created dataset record "${record.title}" (${record.region} · ${record.channel})`,
      Math.max(1, Math.round(performance.now() - started))
    );
    await this.persistLocalEncrypted(true);
    this.emit();
    return record;
  }

  async updateRecord(
    id: string,
    patch: Partial<Omit<PublicationRecord, 'id'>>
  ): Promise<PublicationRecord> {
    assertPermission(this.session?.role, 'dataset:write');
    const idx = this.records.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`Record ${id} not found.`);

    const current = this.records[idx];
    const nextReaders = patch.readers !== undefined ? patch.readers : current.readers;
    let nextTrend = current.monthlyTrend;
    if (patch.readers !== undefined && current.readers > 0 && patch.readers !== current.readers) {
      const ratio = patch.readers / current.readers;
      nextTrend = current.monthlyTrend.map((v) => Math.max(10, Math.round(v * ratio)));
    }

    const updated: PublicationRecord = {
      ...current,
      ...patch,
      readers: nextReaders,
      monthlyTrend: patch.monthlyTrend ?? nextTrend,
    };

    this.records = this.records.map((r, i) => (i === idx ? updated : r));
    this.bumpVersion();
    this.appendActivity('record.update', `Updated record "${updated.title}"`);
    await this.persistLocalEncrypted(true);
    this.emit();
    return updated;
  }

  async deleteRecord(id: string): Promise<void> {
    assertPermission(this.session?.role, 'dataset:delete');
    const target = this.records.find((r) => r.id === id);
    if (!target) throw new Error(`Record ${id} not found.`);
    this.records = this.records.filter((r) => r.id !== id);
    this.bumpVersion();
    this.appendActivity('record.delete', `Deleted record "${target.title}" from encrypted vault`);
    await this.persistLocalEncrypted(true);
    this.emit();
  }

  exportRecords(format: 'csv' | 'json', overrideFilters?: FilterState): string {
    assertPermission(this.session?.role, 'dataset:export');
    const list = this.queryRecords({ filters: overrideFilters ?? this.filters });
    const output = format === 'csv' ? recordsToCsv(list) : JSON.stringify(list, null, 2);
    this.appendActivity('dataset.export', `Exported ${list.length} records as ${format.toUpperCase()}`);
    this.emit();
    return output;
  }

  // --- Cloudflare KV Sync & Encryption Controls ---

  setOfflineMode(offline: boolean): void {
    this.offlineSimulated = offline;
    if (offline) {
      if (this.coalesceTimer) {
        clearTimeout(this.coalesceTimer);
        this.coalesceTimer = null;
      }
      this.syncState.status = 'offline';
      this.syncState.errorMessage = null;
    } else if (this.syncState.dirty) {
      this.syncState.status = 'idle';
      if (this.syncConfig.autoSync) {
        this.scheduleCoalescedSync();
      }
    } else {
      this.syncState.status = 'synced';
    }
    this.emit();
  }

  updateSyncConfig(partial: Partial<KvSyncConfig>): KvSyncConfig {
    assertPermission(this.session?.role, 'sync:configure');
    this.syncConfig = { ...this.syncConfig, ...partial };
    this.storage.setItem(STORAGE_KEYS.SYNC_CONFIG, JSON.stringify(this.syncConfig));
    if (this.syncConfig.mode === 'offline-only') {
      this.syncState.status = 'offline';
    }
    this.emit();
    return { ...this.syncConfig };
  }

  async rotatePassphrase(newPassphrase: string): Promise<EncryptedEnvelope> {
    assertPermission(this.session?.role, 'sync:configure');
    if (!newPassphrase || newPassphrase.trim().length < 10) {
      throw new Error('Vault passphrase must be at least 10 characters.');
    }
    this.passphrase = newPassphrase.trim();
    this.lastSyncedChecksum = null;
    this.appendActivity('vault.rekey', 'Rotated local AES-256-GCM vault passphrase and re-encrypted snapshot');
    const env = await this.persistLocalEncrypted(true);
    this.emit();
    return env;
  }

  async syncNow(options: { silent?: boolean } = {}): Promise<KvSyncState> {
    if (!options.silent) {
      assertPermission(this.session?.role, 'sync:push');
    } else if (!hasPermission(this.session?.role, 'sync:push')) {
      return { ...this.syncState };
    }

    if (this.pendingSyncPromise) {
      return this.pendingSyncPromise;
    }

    if (this.offlineSimulated || this.syncConfig.mode === 'offline-only') {
      this.syncState.status = 'offline';
      this.syncState.errorMessage = 'Offline mode active — encrypted edits queued locally.';
      this.emit();
      return { ...this.syncState };
    }

    const run = async (): Promise<KvSyncState> => {
      this.syncState.status = 'syncing';
      this.syncState.errorMessage = null;
      this.emit();

      try {
        const snapshot = this.buildVaultSnapshot();
        const checksum = await sha256Hex(JSON.stringify({
          records: snapshot.records,
          chapters: snapshot.chapters,
          users: snapshot.users,
        }));

        // Client-side write deduplication to protect Cloudflare KV 1,000 writes/day free tier
        if (this.lastSyncedChecksum && this.lastSyncedChecksum === checksum && !this.syncState.dirty) {
          this.syncState.status = 'synced';
          this.syncState.pendingWrites = 0;
          this.telemetry.coalescedWritesSaved += 1;
          this.emit();
          return { ...this.syncState };
        }

        const envelope = await encryptVaultPayload(snapshot, this.passphrase, this.session?.email ?? 'system');
        this.lastEnvelopePreview = envelope;
        this.storage.setItem(STORAGE_KEYS.VAULT, JSON.stringify(envelope));

        const result = await this.transport.push(this.syncConfig, envelope);
        this.lastSyncedChecksum = checksum;
        this.syncState.status = 'synced';
        this.syncState.dirty = false;
        this.syncState.pendingWrites = 0;
        this.syncState.lastSyncedAt = result.updatedAt;
        this.syncState.lastEtag = result.etag;
        this.syncState.lastByteSize = result.byteSize;
        this.syncState.lastLatencyMs = result.latencyMs;
        if (result.quota) {
          this.syncState.quota = result.quota;
        } else if (!result.deduplicated) {
          this.syncState.quota.writesToday += 1;
        }

        this.storage.setItem(
          STORAGE_KEYS.SYNC_META,
          JSON.stringify({
            lastSyncedAt: this.syncState.lastSyncedAt,
            lastEtag: this.syncState.lastEtag,
            lastSyncedChecksum: this.lastSyncedChecksum,
            quota: this.syncState.quota,
          })
        );

        this.appendActivity(
          'vault.sync',
          result.deduplicated
            ? 'Verified encrypted vault matches Edge KV (0 KV writes consumed)'
            : `Synced encrypted AES-256-GCM vault (${(result.byteSize / 1024).toFixed(1)} KB) to Edge KV`,
          result.latencyMs
        );
        this.emit();
        return { ...this.syncState };
      } catch (err) {
        this.syncState.status = 'error';
        this.syncState.errorMessage = err instanceof Error ? err.message : 'Sync failed';
        this.emit();
        return { ...this.syncState };
      } finally {
        this.pendingSyncPromise = null;
      }
    };

    this.pendingSyncPromise = run();
    return this.pendingSyncPromise;
  }

  async pullRemote(): Promise<{ status: 'updated' | 'not-modified' | 'not-found' | 'offline'; message: string }> {
    if (this.offlineSimulated || this.syncConfig.mode === 'offline-only') {
      return { status: 'offline', message: 'Offline mode active — reading from local encrypted vault.' };
    }

    const res = await this.transport.pull(this.syncConfig, this.syncState.lastEtag);
    this.syncState.lastLatencyMs = res.latencyMs;
    if (res.quota) {
      this.syncState.quota = res.quota;
    } else {
      this.syncState.quota.readsToday += 1;
    }

    if (res.status === 'not-found') {
      this.emit();
      return { status: 'not-found', message: 'No remote vault exists yet. Push your encrypted snapshot first.' };
    }

    if (res.status === 'not-modified') {
      this.syncState.status = 'synced';
      this.appendActivity('vault.pull', 'Conditional Edge KV read returned 304 Not Modified', res.latencyMs);
      this.emit();
      return { status: 'not-modified', message: 'Local encrypted vault is already up to date (HTTP 304).' };
    }

    if (res.envelope) {
      const decrypted = await decryptVaultPayload<VaultSnapshot>(res.envelope, this.passphrase);
      this.records = decrypted.records;
      this.chapters = decrypted.chapters;
      this.users = decrypted.users;
      this.activity = decrypted.activity;
      this.lastEnvelopePreview = res.envelope;
      this.syncState.lastEtag = res.etag;
      this.syncState.lastSyncedAt = res.envelope.updatedAt;
      this.syncState.dirty = false;
      this.syncState.pendingWrites = 0;
      this.syncState.status = 'synced';
      this.storage.setItem(STORAGE_KEYS.VAULT, JSON.stringify(res.envelope));
      this.bumpVersion();
      this.appendActivity('vault.pull', 'Pulled and decrypted latest remote vault from Edge KV', res.latencyMs);
      this.emit();
      return { status: 'updated', message: 'Pulled and decrypted remote snapshot from Edge KV.' };
    }

    return { status: 'not-found', message: 'Remote response contained no envelope.' };
  }

  // Headless developer inspection API (callable without UI via window.MeridianAPI)
  getHeadlessApi() {
    return {
      version: '1.0.0',
      getState: () => this.getSnapshot(),
      getMetrics: (filters?: FilterState) => this.getAnalyticsSummary(filters),
      queryRecords: (opts?: { filters?: FilterState; sortKey?: SortKey; sortDir?: SortDir }) =>
        this.queryRecords(opts),
      setFilters: (f: Partial<FilterState>) => this.setFilters(f),
      addRecord: (input: Parameters<MeridianEngine['addRecord']>[0]) => this.addRecord(input),
      updateRecord: (id: string, patch: Partial<Omit<PublicationRecord, 'id'>>) =>
        this.updateRecord(id, patch),
      deleteRecord: (id: string) => this.deleteRecord(id),
      exportCsv: () => this.exportRecords('csv'),
      getPermissions: () => this.getPermissions(),
      getActivityMetrics: () => this.getActivityMetrics(),
      getEncryptedEnvelope: () => this.lastEnvelopePreview,
      syncNow: () => this.syncNow(),
      pullRemote: () => this.pullRemote(),
      setOfflineMode: (offline: boolean) => this.setOfflineMode(offline),
      subscribe: (fn: EngineListener) => this.subscribe(fn),
    };
  }
}

export const meridianEngine = new MeridianEngine();

declare global {
  interface Window {
    MeridianAPI?: ReturnType<MeridianEngine['getHeadlessApi']>;
  }
}

if (typeof window !== 'undefined') {
  window.MeridianAPI = meridianEngine.getHeadlessApi();
}
