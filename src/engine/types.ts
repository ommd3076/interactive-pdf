export type Region = 'North America' | 'Europe' | 'Asia-Pacific' | 'Latin America';
export type Channel = 'Web' | 'Mobile' | 'Newsletter' | 'Audio';
export type Timeframe = '12M' | '6M' | 'Q4';
export type Role = 'admin' | 'editor' | 'viewer';

export type Permission =
  | 'dataset:read'
  | 'dataset:write'
  | 'dataset:delete'
  | 'dataset:export'
  | 'story:edit'
  | 'sync:push'
  | 'sync:configure'
  | 'users:manage'
  | 'activity:audit';

export type VisualMode = 'area-trend' | 'dwell-bars' | 'regional-scatter' | 'channel-slope';

export interface MonthlyPoint {
  month: string; // e.g., "Jan" .. "Dec"
  monthIndex: number; // 0..11
  readers: number;
  dwellSeconds: number;
  returningPct: number;
  completions: number;
}

export interface PublicationRecord {
  id: string;
  title: string;
  section: string;
  author: string;
  region: Region;
  channel: Channel;
  publishedAt: string; // YYYY-MM-DD
  readers: number;
  dwellSeconds: number;
  returningPct: number;
  completionRate: number;
  engagementDelta: number; // YoY % change
  monthlyTrend: number[]; // 12 monthly reader multipliers or counts
  notes: string;
}

export interface StoryChapter {
  id: string;
  indexLabel: string;
  title: string;
  deck: string;
  body: string;
  pullQuote?: string;
  figureCaption: string;
  visualMode: VisualMode;
  highlightRegion?: Region | 'All';
  highlightChannel?: Channel | 'All';
}

export interface FilterState {
  region: Region | 'All';
  channel: Channel | 'All';
  timeframe: Timeframe;
  search: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  title: string;
  role: Role;
  avatarUrl: string;
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
  lastActiveAt: string;
}

export interface Session {
  userId: string;
  email: string;
  name: string;
  role: Role;
  title: string;
  avatarUrl: string;
  issuedAt: string;
  signature: string;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: Role;
  action:
    | 'auth.signin'
    | 'auth.register'
    | 'auth.role_change'
    | 'record.create'
    | 'record.update'
    | 'record.delete'
    | 'dataset.export'
    | 'filter.change'
    | 'story.chapter'
    | 'vault.sync'
    | 'vault.pull'
    | 'vault.rekey';
  summary: string;
  durationMs?: number;
  hourOfDay: number; // 0..23
  dayOfWeek: number; // 0..6 (Mon..Sun)
}

export interface EncryptedEnvelope {
  version: number;
  alg: 'AES-256-GCM';
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string; // base64
  iv: string; // base64
  ciphertext: string; // base64
  checksum: string; // sha-256 hex of plaintext
  updatedAt: string;
  updatedBy: string;
}

export type SyncTransportMode = 'local-edge' | 'cloudflare-worker' | 'offline-only';

export interface KvSyncConfig {
  mode: SyncTransportMode;
  endpointUrl: string; // e.g., "/api/kv" or "https://my-worker.workers.dev/api/kv"
  namespace: string;
  vaultKey: string;
  bearerToken: string;
  coalesceWindowMs: number;
  autoSync: boolean;
}

export interface KvQuotaMetrics {
  readsToday: number;
  writesToday: number;
  dailyWriteLimit: number;
  dailyReadLimit: number;
}

export interface KvSyncState {
  status: 'idle' | 'syncing' | 'synced' | 'offline' | 'error';
  dirty: boolean;
  pendingWrites: number;
  lastSyncedAt: string | null;
  lastEtag: string | null;
  lastByteSize: number;
  lastLatencyMs: number;
  errorMessage: string | null;
  quota: KvQuotaMetrics;
}

export interface EngineTelemetry {
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
  avgQueryMs: number;
  coalescedWritesSaved: number;
}

export interface VaultSnapshot {
  schemaVersion: number;
  updatedAt: string;
  records: PublicationRecord[];
  chapters: StoryChapter[];
  users: UserAccount[];
  activity: ActivityEvent[];
}

export interface AnalyticsSummary {
  totalReaders: number;
  readersDeltaPct: number;
  medianDwellSeconds: number;
  returningRatePct: number;
  avgCompletionPct: number;
  recordCount: number;
  monthlySeries: MonthlyPoint[];
  movingAverage: number[];
  channelBreakdown: Array<{
    channel: Channel;
    readers: number;
    sharePct: number;
    avgDwell: number;
    q1Readers: number;
    q4Readers: number;
  }>;
  regionalBreakdown: Array<{
    region: Region;
    readers: number;
    returningPct: number;
    dwellSeconds: number;
    completionRate: number;
    count: number;
  }>;
  dwellDistribution: Array<{
    bucket: string;
    mobile: number;
    web: number;
    newsletter: number;
    audio: number;
  }>;
}

export interface ActivityMetrics {
  totalEvents: number;
  writesCount: number;
  syncCount: number;
  activeContributors: number;
  dailySeries: Array<{ label: string; count: number; writes: number }>;
  hourlyGrid: number[][]; // 7 days x 6 four-hour blocks
  byRole: Array<{ role: Role; count: number; pct: number }>;
}

export type SortKey =
  | 'title'
  | 'region'
  | 'channel'
  | 'readers'
  | 'dwellSeconds'
  | 'returningPct'
  | 'completionRate'
  | 'engagementDelta'
  | 'publishedAt';

export type SortDir = 'asc' | 'desc';

export interface EngineStateSnapshot {
  initialized: boolean;
  session: Session | null;
  records: PublicationRecord[];
  chapters: StoryChapter[];
  users: Omit<UserAccount, 'passwordHash' | 'passwordSalt'>[];
  activity: ActivityEvent[];
  filters: FilterState;
  syncConfig: KvSyncConfig;
  syncState: KvSyncState;
  telemetry: EngineTelemetry;
  offlineSimulated: boolean;
  lastEnvelopePreview: EncryptedEnvelope | null;
}
