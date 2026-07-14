import 'server-only';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { ZodError } from 'zod';
import { apiError, type ErrorCode } from '@duo/contracts';
import { AuthError, getOwner } from './auth';
import { checkRateLimit, RATE_LIMITS } from './rate-limit';

export function requestId(): string {
  return `req_${randomUUID().replace(/-/g, '')}`;
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(code: ErrorCode, message: string, status: number, reqId = requestId()) {
  return NextResponse.json(apiError(code, message, reqId), { status });
}

export type RateLimitCategory = keyof typeof RATE_LIMITS;

/**
 * Enveloppe un handler : génère un requestId, applique un rate limiting par
 * propriétaire + catégorie de route, puis mappe les erreurs connues vers des réponses
 * structurées (cahier §13.3). Refus par défaut sur erreur inconnue.
 */
export async function handle(
  fn: (reqId: string) => Promise<NextResponse>,
  category: RateLimitCategory = 'read',
): Promise<NextResponse> {
  const reqId = requestId();
  try {
    let ownerKey = 'anonymous';
    try {
      const owner = await getOwner();
      ownerKey = owner.id;
    } catch {
      // L'absence de propriétaire sera de toute façon rejetée plus bas par le handler
      // lui-même ; on continue avec une clé partagée pour ne pas bloquer le mapping d'erreur.
    }

    const limit = RATE_LIMITS[category];
    const result = checkRateLimit(`${ownerKey}:${category}`, limit);
    if (!result.allowed) {
      const res = fail('RATE_LIMITED', 'Trop de requêtes, réessayez plus tard.', 429, reqId);
      res.headers.set('Retry-After', Math.ceil(result.retryAfterMs / 1000).toString());
      return res;
    }

    return await fn(reqId);
  } catch (err) {
    if (err instanceof ZodError) {
      return fail('VALIDATION_ERROR', 'Données invalides.', 400, reqId);
    }
    if (err instanceof AuthError) {
      return fail('UNAUTHORIZED', err.message, 401, reqId);
    }
    // eslint-disable-next-line no-console
    console.error(`[api ${reqId}]`, err);
    return fail('INTERNAL', 'Erreur interne.', 500, reqId);
  }
}
