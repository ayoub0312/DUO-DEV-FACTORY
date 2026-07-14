/**
 * Lecture centralisée de l'environnement. Ne lit jamais `.env.local` directement :
 * s'appuie sur `process.env` chargé par Next. Aucun secret n'est exposé au client
 * (ce module est importé uniquement côté serveur).
 */
export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL ?? 'file:./.data/duo.db',
  ownerEmail: process.env.OWNER_EMAIL ?? 'owner@duo.local',
  authDevMode: (process.env.AUTH_DEV_MODE ?? 'true') !== 'false',
  rateLimitEnabled: (process.env.RATE_LIMIT_ENABLED ?? 'true') !== 'false',
  storageDir: process.env.STORAGE_LOCAL_DIR ?? '.data/storage',
  /** Pont Worker externe léger (ex. script bash orchestrant Claude+Codex hors plateforme). */
  workerBridgeEnabled: (process.env.WORKER_BRIDGE_ENABLED ?? 'false') === 'true',
  workerBridgeToken: process.env.WORKER_BRIDGE_TOKEN ?? '',
};

export const isProd = env.nodeEnv === 'production';

/**
 * Refuse le mode d'authentification simulé en production (cahier §7.4, §26).
 * À appeler dans tout point d'entrée authentifié.
 */
export function assertAuthConfig(): void {
  if (isProd && env.authDevMode) {
    throw new Error(
      'Configuration invalide : AUTH_DEV_MODE doit être false en production (auth mock interdite).',
    );
  }
}
