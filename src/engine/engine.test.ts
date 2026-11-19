import test from 'node:test';
import assert from 'node:assert/strict';
import { decryptVaultPayload, encryptVaultPayload, hashPassword, verifyPassword } from './crypto';
import { assertPermission, hasPermission, validateCredentials } from './rbac';
import { computeAnalyticsSummary, filterRecords, recordsToCsv, sortRecords } from './analytics';
import { MeridianEngine } from './MeridianEngine';
import { SEED_RECORDS } from './seedData';
import type { EncryptedEnvelope, KvSyncConfig } from './types';
import type { KvPullResult, KvPushResult, KvTransport } from './kvSync';

test('AES-256-GCM encryption roundtrip preserves payload and rejects wrong key or tamper', async () => {
  const payload = { secret: 'meridian-2026', count: 42, regions: ['Europe', 'Asia-Pacific'] };
  const envelope = await encryptVaultPayload(payload, 'correct-horse-battery', 'elena@meridianfolio.org');

  assert.equal(envelope.alg, 'AES-256-GCM');
  assert.ok(envelope.iv.length > 10);
  assert.ok(envelope.ciphertext.length > 10);

  const decrypted = await decryptVaultPayload<typeof payload>(envelope, 'correct-horse-battery');
  assert.deepEqual(decrypted, payload);

  await assert.rejects(() => decryptVaultPayload(envelope, 'wrong-passphrase'), /Decryption failed/);

  const tampered: EncryptedEnvelope = {
    ...envelope,
    ciphertext: envelope.ciphertext.slice(0, -4) + 'AAAA',
  };
  await assert.rejects(() => decryptVaultPayload(tampered, 'correct-horse-battery'), /Decryption failed/);
});

test('PBKDF2 password hashing verifies valid passwords and rejects invalid ones', async () => {
  const { salt, hash } = await hashPassword('EditorialPass2026!');
  assert.equal(await verifyPassword('EditorialPass2026!', salt, hash), true);
  assert.equal(await verifyPassword('WrongPassword!', salt, hash), false);
});

test('RBAC enforces granular permissions across admin, editor, and viewer roles', () => {
  assert.equal(hasPermission('admin', 'users:manage'), true);
  assert.equal(hasPermission('admin', 'dataset:delete'), true);
  assert.equal(hasPermission('editor', 'dataset:write'), true);
  assert.equal(hasPermission('editor', 'dataset:delete'), false);
  assert.equal(hasPermission('editor', 'users:manage'), false);
  assert.equal(hasPermission('viewer', 'dataset:read'), true);
  assert.equal(hasPermission('viewer', 'dataset:write'), false);
  assert.equal(hasPermission('viewer', 'sync:push'), false);

  assert.throws(() => assertPermission('viewer', 'dataset:write'), /Access denied/);
  assert.equal(validateCredentials('bad-email', '12345678'), 'Please enter a valid email address.');
  assert.equal(validateCredentials('ok@example.org', 'short'), 'Password must be at least 8 characters long.');
  assert.equal(validateCredentials('ok@example.org', 'ValidPass2026!'), null);
});

test('Analytics filtering, sorting, aggregation, and RFC-4180 CSV export are deterministic', () => {
  const europeOnly = filterRecords(SEED_RECORDS, {
    region: 'Europe',
    channel: 'All',
    timeframe: '12M',
    search: '',
  });
  assert.ok(europeOnly.length > 0);
  assert.ok(europeOnly.every((r) => r.region === 'Europe'));

  const sorted = sortRecords(europeOnly, 'readers', 'desc');
  for (let i = 1; i < sorted.length; i += 1) {
    assert.ok(sorted[i - 1].readers >= sorted[i].readers);
  }

  const summaryQ4 = computeAnalyticsSummary(SEED_RECORDS, {
    region: 'All',
    channel: 'Mobile',
    timeframe: 'Q4',
    search: '',
  });
  assert.equal(summaryQ4.monthlySeries.length, 3);
  assert.equal(summaryQ4.monthlySeries[0].month, 'Oct');
  assert.ok(summaryQ4.totalReaders > 0);

  const csv = recordsToCsv([
    {
      ...SEED_RECORDS[0],
      title: 'Title, with "quotes"',
    },
  ]);
  assert.ok(csv.includes('"Title, with ""quotes"""'));
});

test('Headless MeridianEngine supports CRUD, RBAC gating, LRU caching, offline queue, and KV write coalescing', async () => {
  let pushCalls = 0;
  let storedEnvelope: EncryptedEnvelope | null = null;

  const mockTransport: KvTransport = {
    async push(_config: KvSyncConfig, envelope: EncryptedEnvelope): Promise<KvPushResult> {
      pushCalls += 1;
      storedEnvelope = envelope;
      return {
        deduplicated: false,
        etag: `"etag-${pushCalls}"`,
        updatedAt: new Date().toISOString(),
        byteSize: JSON.stringify(envelope).length,
        latencyMs: 12,
      };
    },
    async pull(_config: KvSyncConfig, currentEtag: string | null): Promise<KvPullResult> {
      if (!storedEnvelope) return { status: 'not-found', envelope: null, etag: null, latencyMs: 5 };
      if (currentEtag === `"etag-${pushCalls}"`) {
        return { status: 'not-modified', envelope: null, etag: currentEtag, latencyMs: 4 };
      }
      return { status: 'updated', envelope: storedEnvelope, etag: `"etag-${pushCalls}"`, latencyMs: 9 };
    },
  };

  const engine = new MeridianEngine({ transport: mockTransport });
  const snap = await engine.initialize();
  assert.equal(snap.initialized, true);
  assert.equal(snap.session?.role, 'admin');
  assert.equal(snap.records.length, SEED_RECORDS.length);

  // Disable autoSync timer for deterministic manual sync test
  engine.updateSyncConfig({ autoSync: false });

  // Cache hit verification
  const m1 = engine.getAnalyticsSummary();
  const m2 = engine.getAnalyticsSummary();
  assert.equal(m1.totalReaders, m2.totalReaders);
  assert.ok(engine.getSnapshot().telemetry.cacheHits >= 1);

  // Offline edits coalesce into single push on reconnect
  engine.setOfflineMode(true);
  const created = await engine.addRecord({
    title: 'Headless Engine Validation Essay',
    section: 'Engineering',
    author: 'Elena Vance',
    region: 'Europe',
    channel: 'Web',
    publishedAt: '2026-11-19',
    readers: 54000,
    dwellSeconds: 410,
    returningPct: 72.5,
    completionRate: 80.0,
    engagementDelta: 19.2,
    notes: 'Created while offline to test encrypted queue.',
  });
  await engine.updateRecord(created.id, { readers: 62000 });
  assert.equal(engine.getSnapshot().syncState.status, 'offline');
  assert.equal(engine.getSnapshot().syncState.pendingWrites, 2);
  assert.equal(pushCalls, 0);

  // Reconnect and sync once
  engine.setOfflineMode(false);
  const sync1 = await engine.syncNow();
  assert.equal(sync1.status, 'synced');
  assert.equal(pushCalls, 1);

  // Second sync without changes burns 0 KV writes
  const sync2 = await engine.syncNow();
  assert.equal(sync2.status, 'synced');
  assert.equal(pushCalls, 1);

  // Conditional pull returns 304 not-modified
  const pullRes = await engine.pullRemote();
  assert.equal(pullRes.status, 'not-modified');

  // Switch to viewer and verify RBAC blocks mutations
  await engine.switchDemoUser('usr-sora');
  assert.equal(engine.getSnapshot().session?.role, 'viewer');
  await assert.rejects(() => engine.deleteRecord(created.id), /Access denied/);
});
