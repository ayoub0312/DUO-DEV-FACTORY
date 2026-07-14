import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * Base de données DÉDIÉE aux tests E2E — jamais celle du développement réel, pour ne
 * pas polluer les projets/seed de l'utilisateur avec des données de test (incident
 * constaté : des projets "E2E Projet …" étaient apparus dans le tableau de bord réel
 * car le serveur E2E partageait le même fichier .data/duo.db).
 */
const E2E_DB_PATH = path.resolve(__dirname, '.data', 'e2e-test.db').replace(/\\/g, '/');
const E2E_DATABASE_URL = `file:${E2E_DB_PATH}`;

/**
 * Configuration Playwright — parcours principal + accessibilité de base (cahier §11).
 * Démarre son propre serveur de dev sur un port dédié, sur une base isolée, pour ne
 * pas entrer en conflit avec une instance de développement déjà lancée manuellement.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list']],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev --workspace @duo/web -- -p 3100',
    url: 'http://127.0.0.1:3100/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    cwd: '../..',
    env: { DATABASE_URL: E2E_DATABASE_URL },
  },
});

export { E2E_DATABASE_URL };
