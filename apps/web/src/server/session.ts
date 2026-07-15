import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from './env';

/**
 * Sessions propriétaire sans état : jeton signé HMAC-SHA256, transporté par cookie
 * httpOnly. Implémenté avec `node:crypto` (runtime Node uniquement — plus de middleware
 * Edge). Aucun secret n'est exposé au client : seul le jeton signé circule.
 */

export const SESSION_COOKIE = 'duo_session';
export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 7; // 7 jours

function sign(payload: string): string {
  return createHmac('sha256', env.authSecret).update(payload).digest('base64url');
}

/** Crée un jeton de session signé pour le propriétaire donné. */
export function signSession(ownerId: string): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_S;
  const payload = Buffer.from(JSON.stringify({ sub: ownerId, exp })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

/** Vérifie un jeton de session. Retourne l'identifiant propriétaire ou null si invalide/expiré. */
export function verifySession(token: string | undefined | null): string | null {
  if (!token) return null;
  const dot = token.indexOf('.');
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  try {
    const expected = sign(payload);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof data.sub !== 'string' || typeof data.exp !== 'number') return null;
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return data.sub;
  } catch {
    return null;
  }
}
