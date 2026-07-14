import path from 'node:path';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

/**
 * Prépare une base de données SQLite DÉDIÉE aux tests E2E (jamais celle du
 * développement réel — voir le commentaire dans playwright.config.ts) : applique les
 * migrations Drizzle sur un fichier isolé avant que le serveur de test ne démarre.
 */
export default async function globalSetup() {
  const dbPath = path.resolve(__dirname, '..', '.data', 'e2e-test.db').replace(/\\/g, '/');
  const databaseUrl = `file:${dbPath}`;
  const databaseDir = path.dirname(dbPath);
  fs.mkdirSync(databaseDir, { recursive: true });

  const packageDatabaseDir = path.resolve(__dirname, '..', '..', '..', 'packages', 'database');

  execSync('npx drizzle-kit migrate', {
    cwd: packageDatabaseDir,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}
