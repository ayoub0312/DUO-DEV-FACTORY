import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';

/**
 * Applique les migrations LOCALES (dossier `migrations/`) à la base libSQL.
 * Robuste pour une URL `file:` (dev) comme `libsql://` (prod). Aucune migration
 * distante automatique n'est déclenchée ailleurs (cahier §26).
 *
 * Exécution : `npm run db:migrate` (DATABASE_URL requis, défaut : file:./.data/duo.db).
 */
async function main() {
  const url = process.env.DATABASE_URL ?? 'file:./.data/duo.db';
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  const client = createClient({ url, authToken });
  const db = drizzle(client);
  // eslint-disable-next-line no-console
  console.warn(`[migrate] application des migrations sur ${url} ...`);
  await migrate(db, { migrationsFolder: './migrations' });
  // eslint-disable-next-line no-console
  console.warn('[migrate] terminé.');
  client.close();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[migrate] échec :', err);
  process.exit(1);
});
