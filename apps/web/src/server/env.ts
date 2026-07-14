/**
 * Lecture centralisée de l'environnement. Ne lit jamais `.env.local` directement :
 * s'appuie sur `process.env` chargé par Next. Aucun secret n'est exposé au client
 * (ce module est importé uniquement côté serveur).
 */
export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL ?? 'file:./.data/duo.db',
  ownerEmail: process.env.OWNER_EMAIL ?? 'owner@duo.local',
  /** Secret de signature des sessions (HMAC). Obligatoire dès qu'une auth réelle est requise. */
  authSecret: process.env.AUTH_SECRET ?? '',
  /** Hash scrypt du mot de passe propriétaire (`sel:hash`). Vide = pas d'auth par mot de passe. */
  ownerPasswordHash: process.env.OWNER_PASSWORD_HASH ?? '',
  rateLimitEnabled: (process.env.RATE_LIMIT_ENABLED ?? 'true') !== 'false',
  storageDir: process.env.STORAGE_LOCAL_DIR ?? '.data/storage',
  /** Pont Worker externe léger (ex. script bash orchestrant Claude+Codex hors plateforme). */
  workerBridgeEnabled: (process.env.WORKER_BRIDGE_ENABLED ?? 'false') === 'true',
  workerBridgeToken: process.env.WORKER_BRIDGE_TOKEN ?? '',
};

export const isProd = env.nodeEnv === 'production';

/**
 * L'authentification réelle (mot de passe + session signée) est requise dès qu'on est en
 * production OU qu'un hash de mot de passe est configuré. En développement local sans
 * hash, un propriétaire simulé est auto-provisionné pour ne pas bloquer le travail.
 */
export const authRequired = isProd || env.ownerPasswordHash.length > 0;

/**
 * Vérifie que la configuration d'authentification est cohérente (cahier §26 : auth mock
 * interdite en production). Lève une erreur explicite si un secret indispensable manque,
 * plutôt que d'ouvrir un accès non sécurisé par défaut.
 */
export function assertAuthConfig(): void {
  if (!authRequired) return;
  if (env.authSecret.length < 16) {
    throw new Error(
      'Configuration invalide : AUTH_SECRET (≥16 caractères) est requis pour l’authentification.',
    );
  }
  if (isProd && env.ownerPasswordHash.length === 0) {
    throw new Error(
      'Configuration invalide : OWNER_PASSWORD_HASH est requis en production (auth mock interdite).',
    );
  }
}
