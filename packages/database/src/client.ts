import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

/**
 * Client base de données (Turso/libSQL + Drizzle).
 * En dev : URL de type `file:./.data/duo.db`. En prod : `libsql://…` + token.
 * Le token n'est JAMAIS codé en dur : il provient de l'environnement.
 */
const url = process.env.DATABASE_URL ?? 'file:./.data/duo.db';
const authToken = process.env.DATABASE_AUTH_TOKEN;

export const libsql = createClient({ url, authToken });
export const db = drizzle(libsql, { schema });
export type Database = typeof db;
export { schema };
