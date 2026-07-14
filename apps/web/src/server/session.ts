/**
 * Sessions propriétaire sans état : jeton signé HMAC-SHA256, transporté par cookie
 * httpOnly. Implémenté avec la Web Crypto API pour fonctionner à la fois dans le
 * middleware (runtime Edge) et dans les Route Handlers / Server Components (Node).
 * Aucun secret n'est jamais exposé au client : seul le jeton signé circule.
 */
import { env } from './env';

export const SESSION_COOKIE = 'duo_session';
export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 7; // 7 jours

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hmac(payload: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(env.authSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return new Uint8Array(sig);
}

/** Comparaison à temps constant de deux tableaux d'octets. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

/** Crée un jeton de session signé pour le propriétaire donné. */
export async function signSession(ownerId: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_S;
  const payload = toBase64Url(encoder.encode(JSON.stringify({ sub: ownerId, exp })));
  const sig = toBase64Url(await hmac(payload));
  return `${payload}.${sig}`;
}

/** Vérifie un jeton de session. Retourne l'identifiant propriétaire ou null si invalide/expiré. */
export async function verifySession(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  const dot = token.indexOf('.');
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  try {
    const expected = toBase64Url(await hmac(payload));
    if (!timingSafeEqual(fromBase64Url(sig), fromBase64Url(expected))) return null;
    const data = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
    if (typeof data.sub !== 'string' || typeof data.exp !== 'number') return null;
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return data.sub;
  } catch {
    return null;
  }
}
