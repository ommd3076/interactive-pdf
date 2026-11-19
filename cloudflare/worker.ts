/**
 * Meridian Folio — Cloudflare Worker + KV Free-Tier Sync Endpoint
 *
 * Deploy with:
 *   wrangler kv namespace create MERIDIAN_VAULT
 *   wrangler secret put SYNC_TOKEN
 *   wrangler deploy
 *
 * Free-tier optimization:
 * - Stores one compact AES-256-GCM encrypted snapshot per workspace key
 * - Checks SHA-256 ETag before writing so identical payloads burn 0 KV writes
 * - Returns 304 Not Modified on matching If-None-Match reads
 */

export interface Env {
  MERIDIAN_VAULT: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: { metadata?: Record<string, unknown> }): Promise<void>;
    delete(key: string): Promise<void>;
  };
  SYNC_TOKEN?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, If-None-Match',
  'Access-Control-Expose-Headers': 'ETag',
};

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 24);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (env.SYNC_TOKEN) {
      const auth = request.headers.get('Authorization');
      if (auth !== `Bearer ${env.SYNC_TOKEN}`) {
        return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });
      }
    }

    const url = new URL(request.url);
    const match = url.pathname.match(/^\/api\/kv\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)$/);
    if (!match) {
      return Response.json({ error: 'Route not found' }, { status: 404, headers: CORS_HEADERS });
    }

    const [, namespace, key] = match;
    const kvKey = `${namespace}:${key}`;

    if (request.method === 'GET') {
      const raw = await env.MERIDIAN_VAULT.get(kvKey);
      if (!raw) {
        return Response.json({ error: 'Key not found' }, { status: 404, headers: CORS_HEADERS });
      }
      const parsed = JSON.parse(raw);
      const ifNoneMatch = request.headers.get('If-None-Match');
      if (ifNoneMatch && ifNoneMatch === parsed.etag) {
        return new Response(null, {
          status: 304,
          headers: { ...CORS_HEADERS, ETag: parsed.etag },
        });
      }
      return Response.json(parsed, {
        headers: { ...CORS_HEADERS, ETag: parsed.etag },
      });
    }

    if (request.method === 'PUT') {
      const body = (await request.json()) as { envelope?: { iv?: string; ciphertext?: string } };
      if (!body?.envelope?.iv || !body?.envelope?.ciphertext) {
        return Response.json({ error: 'Invalid encrypted envelope' }, { status: 400, headers: CORS_HEADERS });
      }
      const serialized = JSON.stringify(body.envelope);
      const etag = `"${await sha256Hex(serialized)}"`;
      const existingRaw = await env.MERIDIAN_VAULT.get(kvKey);
      if (existingRaw) {
        const existing = JSON.parse(existingRaw);
        if (existing.etag === etag) {
          return Response.json(
            { deduplicated: true, key, namespace, etag, updatedAt: existing.updatedAt },
            { headers: { ...CORS_HEADERS, ETag: etag } }
          );
        }
      }
      const updatedAt = new Date().toISOString();
      const record = {
        key,
        namespace,
        etag,
        updatedAt,
        byteSize: serialized.length,
        envelope: body.envelope,
      };
      await env.MERIDIAN_VAULT.put(kvKey, JSON.stringify(record));
      return Response.json(
        { deduplicated: false, key, namespace, etag, updatedAt, byteSize: serialized.length },
        { headers: { ...CORS_HEADERS, ETag: etag } }
      );
    }

    if (request.method === 'DELETE') {
      await env.MERIDIAN_VAULT.delete(kvKey);
      return Response.json({ deleted: true, key, namespace }, { headers: CORS_HEADERS });
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: CORS_HEADERS });
  },
};
