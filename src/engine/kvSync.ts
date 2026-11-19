import type { EncryptedEnvelope, KvQuotaMetrics, KvSyncConfig } from './types';

export interface KvPushResult {
  deduplicated: boolean;
  etag: string | null;
  updatedAt: string;
  byteSize: number;
  latencyMs: number;
  quota?: KvQuotaMetrics;
}

export interface KvPullResult {
  status: 'updated' | 'not-modified' | 'not-found';
  envelope: EncryptedEnvelope | null;
  etag: string | null;
  latencyMs: number;
  quota?: KvQuotaMetrics;
}

export interface KvTransport {
  push(config: KvSyncConfig, envelope: EncryptedEnvelope): Promise<KvPushResult>;
  pull(config: KvSyncConfig, currentEtag: string | null): Promise<KvPullResult>;
}

function buildUrl(config: KvSyncConfig): string {
  const base = config.endpointUrl.replace(/\/+$/, '');
  return `${base}/${encodeURIComponent(config.namespace)}/${encodeURIComponent(config.vaultKey)}`;
}

function buildHeaders(config: KvSyncConfig, extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  };
  if (config.bearerToken.trim()) {
    headers.Authorization = `Bearer ${config.bearerToken.trim()}`;
  }
  return headers;
}

export class HttpKvTransport implements KvTransport {
  private fetchImpl: typeof fetch;

  constructor(fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis)) {
    this.fetchImpl = fetchImpl;
  }

  async push(config: KvSyncConfig, envelope: EncryptedEnvelope): Promise<KvPushResult> {
    const started = performance.now();
    const url = buildUrl(config);
    const res = await this.fetchImpl(url, {
      method: 'PUT',
      headers: buildHeaders(config),
      body: JSON.stringify({ envelope }),
    });
    const latencyMs = Math.max(1, Math.round(performance.now() - started));

    if (!res.ok) {
      let msg = `KV sync failed with HTTP ${res.status}`;
      try {
        const errBody = (await res.json()) as { error?: string };
        if (errBody?.error) msg = errBody.error;
      } catch {
        // Ignore parse failure
      }
      throw new Error(msg);
    }

    const data = (await res.json()) as {
      deduplicated?: boolean;
      etag?: string;
      updatedAt?: string;
      byteSize?: number;
      quota?: KvQuotaMetrics;
    };

    return {
      deduplicated: Boolean(data.deduplicated),
      etag: data.etag ?? res.headers.get('ETag'),
      updatedAt: data.updatedAt ?? new Date().toISOString(),
      byteSize: data.byteSize ?? JSON.stringify(envelope).length,
      latencyMs,
      quota: data.quota,
    };
  }

  async pull(config: KvSyncConfig, currentEtag: string | null): Promise<KvPullResult> {
    const started = performance.now();
    const url = buildUrl(config);
    const extra: Record<string, string> = {};
    if (currentEtag) {
      extra['If-None-Match'] = currentEtag;
    }

    const res = await this.fetchImpl(url, {
      method: 'GET',
      headers: buildHeaders(config, extra),
    });
    const latencyMs = Math.max(1, Math.round(performance.now() - started));

    if (res.status === 304) {
      return {
        status: 'not-modified',
        envelope: null,
        etag: res.headers.get('ETag') ?? currentEtag,
        latencyMs,
      };
    }

    if (res.status === 404) {
      return {
        status: 'not-found',
        envelope: null,
        etag: null,
        latencyMs,
      };
    }

    if (!res.ok) {
      throw new Error(`KV pull failed with HTTP ${res.status}`);
    }

    const data = (await res.json()) as {
      envelope?: EncryptedEnvelope;
      etag?: string;
      quota?: KvQuotaMetrics;
    };

    return {
      status: 'updated',
      envelope: data.envelope ?? null,
      etag: data.etag ?? res.headers.get('ETag'),
      latencyMs,
      quota: data.quota,
    };
  }
}

export const DEFAULT_KV_CONFIG: KvSyncConfig = {
  mode: 'local-edge',
  endpointUrl: '/api/kv',
  namespace: 'meridian-prod',
  vaultKey: 'editorial-vault-v1',
  bearerToken: '',
  coalesceWindowMs: 4500,
  autoSync: true,
};
