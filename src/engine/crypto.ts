import type { EncryptedEnvelope } from './types';

const PBKDF2_ITERATIONS = 120_000;
const ENVELOPE_VERSION = 1;

function getSubtle(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c || !c.subtle) {
    throw new Error('Web Crypto API is unavailable in this environment');
  }
  return c.subtle;
}

export function randomBytes(length: number): Uint8Array {
  const out = new Uint8Array(length);
  globalThis.crypto.getRandomValues(out);
  return out;
}

export function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function fromBase64(b64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(b64, 'base64'));
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function sha256Hex(input: string): Promise<string> {
  const subtle = getSubtle();
  const data = new TextEncoder().encode(input);
  const digest = await subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function deriveAesKey(
  passphrase: string,
  salt: Uint8Array,
  iterations = PBKDF2_ITERATIONS
): Promise<CryptoKey> {
  const subtle = getSubtle();
  const keyMaterial = await subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function hashPassword(password: string, saltBase64?: string): Promise<{ salt: string; hash: string }> {
  const subtle = getSubtle();
  const saltBytes = saltBase64 ? fromBase64(saltBase64) : randomBytes(16);
  const keyMaterial = await subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derivedBits = await subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes as BufferSource,
      iterations: 60_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return {
    salt: toBase64(saltBytes),
    hash: toBase64(new Uint8Array(derivedBits)),
  };
}

export async function verifyPassword(password: string, salt: string, expectedHash: string): Promise<boolean> {
  const { hash } = await hashPassword(password, salt);
  return constantTimeEqual(hash, expectedHash);
}

export async function signSessionToken(payload: string, secret: string): Promise<string> {
  const subtle = getSubtle();
  const key = await subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return toBase64(new Uint8Array(sig));
}

export async function encryptVaultPayload<T>(
  data: T,
  passphrase: string,
  updatedBy: string
): Promise<EncryptedEnvelope> {
  const subtle = getSubtle();
  const plaintext = JSON.stringify(data);
  const checksum = await sha256Hex(plaintext);
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveAesKey(passphrase, salt, PBKDF2_ITERATIONS);

  const encryptedBuffer = await subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    new TextEncoder().encode(plaintext)
  );

  return {
    version: ENVELOPE_VERSION,
    alg: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations: PBKDF2_ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(encryptedBuffer)),
    checksum,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
}

export async function decryptVaultPayload<T>(
  envelope: EncryptedEnvelope,
  passphrase: string
): Promise<T> {
  if (!envelope || envelope.alg !== 'AES-256-GCM' || !envelope.iv || !envelope.salt || !envelope.ciphertext) {
    throw new Error('Malformed encrypted vault envelope');
  }

  const subtle = getSubtle();
  const salt = fromBase64(envelope.salt);
  const iv = fromBase64(envelope.iv);
  const ciphertext = fromBase64(envelope.ciphertext);
  const key = await deriveAesKey(passphrase, salt, envelope.iterations || PBKDF2_ITERATIONS);

  let decryptedBuffer: ArrayBuffer;
  try {
    decryptedBuffer = await subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      ciphertext as BufferSource
    );
  } catch {
    throw new Error('Decryption failed: invalid passphrase or tampered ciphertext');
  }

  const plaintext = new TextDecoder().decode(decryptedBuffer);
  if (envelope.checksum) {
    const computed = await sha256Hex(plaintext);
    if (!constantTimeEqual(computed, envelope.checksum)) {
      throw new Error('Integrity check failed: checksum mismatch');
    }
  }

  return JSON.parse(plaintext) as T;
}
