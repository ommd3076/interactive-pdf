import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';

interface StoredKvEntry {
  key: string;
  namespace: string;
  value: unknown;
  etag: string;
  updatedAt: string;
  byteSize: number;
}

interface KvStoreFile {
  dateKey: string;
  readsToday: number;
  writesToday: number;
  entries: Record<string, StoredKvEntry>;
}

const PORT = Number(process.env.PORT) || 3000;
const STORE_PATH = path.resolve(process.cwd(), '.meridian-kv-store.json');
const MAX_VALUE_BYTES = 256 * 1024; // 256KB per vault blob (well within CF KV 25MB limit & free-tier friendly)
const FREE_TIER_DAILY_WRITES = 1000;
const FREE_TIER_DAILY_READS = 100000;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadStore(): KvStoreFile {
  const today = todayKey();
  try {
    if (fs.existsSync(STORE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')) as KvStoreFile;
      if (parsed && typeof parsed === 'object' && parsed.entries) {
        if (parsed.dateKey !== today) {
          parsed.dateKey = today;
          parsed.readsToday = 0;
          parsed.writesToday = 0;
        }
        return parsed;
      }
    }
  } catch {
    // Fall back to fresh store
  }
  return {
    dateKey: today,
    readsToday: 0,
    writesToday: 0,
    entries: {},
  };
}

let kvStore: KvStoreFile = loadStore();

function persistStore(): void {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(kvStore, null, 2), 'utf8');
  } catch (err) {
    console.error('[meridian-kv] Failed to persist local KV store:', err);
  }
}

function computeEtag(serialized: string): string {
  return `"${crypto.createHash('sha256').update(serialized).digest('hex').slice(0, 24)}"`;
}

function sanitizeSegment(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 64);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '512kb' }));

  // Health & edge capability probe
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      mode: 'local-kv-compatible',
      freeTierLimits: {
        dailyWrites: FREE_TIER_DAILY_WRITES,
        dailyReads: FREE_TIER_DAILY_READS,
      },
      quota: {
        dateKey: kvStore.dateKey,
        readsToday: kvStore.readsToday,
        writesToday: kvStore.writesToday,
      },
    });
  });

  // Namespace metadata & free-tier quota status
  app.get('/api/kv/:namespace', (req, res) => {
    const namespace = sanitizeSegment(req.params.namespace);
    if (!namespace) {
      res.status(400).json({ error: 'Invalid namespace' });
      return;
    }

    if (kvStore.dateKey !== todayKey()) {
      kvStore.dateKey = todayKey();
      kvStore.readsToday = 0;
      kvStore.writesToday = 0;
    }

    const keys = Object.values(kvStore.entries)
      .filter((entry) => entry.namespace === namespace)
      .map((entry) => ({
        key: entry.key,
        etag: entry.etag,
        updatedAt: entry.updatedAt,
        byteSize: entry.byteSize,
      }));

    res.json({
      namespace,
      keys,
      quota: {
        dateKey: kvStore.dateKey,
        readsToday: kvStore.readsToday,
        writesToday: kvStore.writesToday,
        dailyWriteLimit: FREE_TIER_DAILY_WRITES,
        dailyReadLimit: FREE_TIER_DAILY_READS,
      },
    });
  });

  // Conditional GET for encrypted KV blob (supports ETag -> 304 Not Modified)
  app.get('/api/kv/:namespace/:key', (req, res) => {
    const namespace = sanitizeSegment(req.params.namespace);
    const key = sanitizeSegment(req.params.key);
    if (!namespace || !key) {
      res.status(400).json({ error: 'Invalid namespace or key' });
      return;
    }

    if (kvStore.dateKey !== todayKey()) {
      kvStore.dateKey = todayKey();
      kvStore.readsToday = 0;
      kvStore.writesToday = 0;
    }

    const composite = `${namespace}:${key}`;
    const entry = kvStore.entries[composite];
    kvStore.readsToday += 1;
    persistStore();

    if (!entry) {
      res.status(404).json({
        error: 'Key not found',
        quota: {
          readsToday: kvStore.readsToday,
          writesToday: kvStore.writesToday,
          dailyWriteLimit: FREE_TIER_DAILY_WRITES,
          dailyReadLimit: FREE_TIER_DAILY_READS,
        },
      });
      return;
    }

    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch && ifNoneMatch === entry.etag) {
      res.setHeader('ETag', entry.etag);
      res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
      res.status(304).end();
      return;
    }

    res.setHeader('ETag', entry.etag);
    res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
    res.json({
      key: entry.key,
      namespace: entry.namespace,
      etag: entry.etag,
      updatedAt: entry.updatedAt,
      byteSize: entry.byteSize,
      envelope: entry.value,
      quota: {
        readsToday: kvStore.readsToday,
        writesToday: kvStore.writesToday,
        dailyWriteLimit: FREE_TIER_DAILY_WRITES,
        dailyReadLimit: FREE_TIER_DAILY_READS,
      },
    });
  });

  // PUT encrypted KV blob with ETag dedupe (zero KV write cost if identical payload)
  app.put('/api/kv/:namespace/:key', (req, res) => {
    const namespace = sanitizeSegment(req.params.namespace);
    const key = sanitizeSegment(req.params.key);
    if (!namespace || !key) {
      res.status(400).json({ error: 'Invalid namespace or key' });
      return;
    }

    if (kvStore.dateKey !== todayKey()) {
      kvStore.dateKey = todayKey();
      kvStore.readsToday = 0;
      kvStore.writesToday = 0;
    }

    const envelope = req.body?.envelope;
    if (!envelope || typeof envelope !== 'object' || !envelope.ciphertext || !envelope.iv) {
      res.status(400).json({ error: 'Payload must contain an encrypted envelope with iv and ciphertext' });
      return;
    }

    const serialized = JSON.stringify(envelope);
    const byteSize = Buffer.byteLength(serialized, 'utf8');
    if (byteSize > MAX_VALUE_BYTES) {
      res.status(413).json({ error: `Encrypted vault exceeds ${MAX_VALUE_BYTES} byte budget` });
      return;
    }

    const etag = computeEtag(serialized);
    const composite = `${namespace}:${key}`;
    const existing = kvStore.entries[composite];

    if (existing && existing.etag === etag) {
      res.setHeader('ETag', existing.etag);
      res.json({
        deduplicated: true,
        key,
        namespace,
        etag: existing.etag,
        updatedAt: existing.updatedAt,
        byteSize: existing.byteSize,
        quota: {
          readsToday: kvStore.readsToday,
          writesToday: kvStore.writesToday,
          dailyWriteLimit: FREE_TIER_DAILY_WRITES,
          dailyReadLimit: FREE_TIER_DAILY_READS,
        },
      });
      return;
    }

    if (kvStore.writesToday >= FREE_TIER_DAILY_WRITES) {
      res.status(429).json({
        error: 'Cloudflare KV free-tier daily write budget reached (1,000/day). Edits remain encrypted locally.',
        quota: {
          readsToday: kvStore.readsToday,
          writesToday: kvStore.writesToday,
          dailyWriteLimit: FREE_TIER_DAILY_WRITES,
          dailyReadLimit: FREE_TIER_DAILY_READS,
        },
      });
      return;
    }

    const updatedAt = new Date().toISOString();
    kvStore.entries[composite] = {
      key,
      namespace,
      value: envelope,
      etag,
      updatedAt,
      byteSize,
    };
    kvStore.writesToday += 1;
    persistStore();

    res.setHeader('ETag', etag);
    res.status(200).json({
      deduplicated: false,
      key,
      namespace,
      etag,
      updatedAt,
      byteSize,
      quota: {
        readsToday: kvStore.readsToday,
        writesToday: kvStore.writesToday,
        dailyWriteLimit: FREE_TIER_DAILY_WRITES,
        dailyReadLimit: FREE_TIER_DAILY_READS,
      },
    });
  });

  app.delete('/api/kv/:namespace/:key', (req, res) => {
    const namespace = sanitizeSegment(req.params.namespace);
    const key = sanitizeSegment(req.params.key);
    const composite = `${namespace}:${key}`;
    const existed = Boolean(kvStore.entries[composite]);
    if (existed) {
      delete kvStore.entries[composite];
      persistStore();
    }
    res.json({ deleted: existed, key, namespace });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[meridian-folio] Server listening on http://localhost:${PORT}`);
  });
}

startServer();
