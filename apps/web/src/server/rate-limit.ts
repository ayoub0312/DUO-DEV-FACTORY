import 'server-only';

/**
 * Rate limiting en mémoire (fenêtre glissante simple), suffisant pour la V1 mono-processus
 * mono-utilisateur. À remplacer par un store partagé (Redis, etc.) si le Worker/API est
 * un jour exposé à plusieurs instances ou utilisateurs (cf. docs/SECURITY-REVIEW.md).
 */

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000;

/** Nettoyage périodique pour éviter une fuite mémoire sur un process long-vivant. */
function prune(bucket: Bucket, now: number) {
  while (bucket.hits.length > 0 && bucket.hits[0]! <= now - WINDOW_MS) {
    bucket.hits.shift();
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Vérifie et enregistre une requête pour la clé donnée.
 * @param key Identifiant du bucket (ex. `${ownerId}:${route}`)
 * @param limit Nombre de requêtes autorisées par fenêtre de 60s
 */
export function checkRateLimit(key: string, limit: number): RateLimitResult {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { hits: [] };
    buckets.set(key, bucket);
  }
  prune(bucket, now);

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0]!;
    return { allowed: false, remaining: 0, retryAfterMs: oldest + WINDOW_MS - now };
  }

  bucket.hits.push(now);
  return { allowed: true, remaining: limit - bucket.hits.length, retryAfterMs: 0 };
}

/** Limites par catégorie de route (requêtes / 60s). */
export const RATE_LIMITS = {
  /** Lecture (GET) : généreux, l'UI poll toutes les 2-3s. */
  read: 120,
  /** Écriture (POST/PATCH/DELETE) : plus strict. */
  write: 30,
  /** Upload de fichiers : le plus strict. */
  upload: 10,
} as const;
