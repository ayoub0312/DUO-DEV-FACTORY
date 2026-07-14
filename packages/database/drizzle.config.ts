import { defineConfig } from 'drizzle-kit';

// Migrations LOCALES uniquement (aucune migration distante en V1 — cahier §26).
export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'sqlite',
  driver: 'turso',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'file:./.data/duo.db',
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
});
