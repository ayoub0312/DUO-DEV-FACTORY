# DUO DEV FACTORY WEB

Centre de commande de développement assisté par IA — **Claude Builder + Codex Reviewer**.
Application web premium : déposer un besoin et des fichiers, suivre un workflow simulé,
consulter tests et reviews, puis connecter plus tard un Worker réel par API.

> V1 : pleinement utilisable avec un **Mock Workflow Adapter**, sans exécution réelle.
> Spécification de référence : [`docs/CAHIER_DES_CHARGES_DUO_DEV_FACTORY_WEB_WINDOWS.md`](docs/CAHIER_DES_CHARGES_DUO_DEV_FACTORY_WEB_WINDOWS.md).

## Prérequis (Windows)

- Windows 10/11, **Node.js 20+** (Windows), **npm**.
- Aucune dépendance à WSL ou Docker pour lancer l'interface.
- Emplacement recommandé : `C:\Users\<user>\Projects\duo-dev-factory-web`.

## Démarrage

```powershell
npm install
Copy-Item .env.example .env.local   # puis renseigner les valeurs locales
npm run dev
```

L'application démarre sur http://localhost:3000.

## Scripts

| Script | Effet |
|---|---|
| `npm run dev` | Lance l'app web (Next.js) |
| `npm run build` | Build de production de l'app web |
| `npm run typecheck` | Vérification TypeScript de tous les workspaces |
| `npm run lint` | Lint de tous les workspaces |
| `npm run test` | Tests unitaires (Vitest) |
| `npm run test:e2e` | Tests E2E (Playwright) |
| `npm run db:generate` | Génère les migrations Drizzle |
| `npm run db:migrate` | Applique les migrations **locales** |
| `npm run db:seed` | Injecte les données de démonstration |
| `npm run ci` | typecheck + lint + test + build |

## Structure (monorepo npm workspaces)

```
apps/
  web/        Next.js App Router — UI, API de contrôle, services domaine, auth
  worker/     Squelette Worker + adapters (Mock / Remote) — pas d'exécution réelle en V1
packages/
  contracts/        Schémas Zod + types partagés (API, événements, états, erreurs)
  database/         Drizzle + libSQL, migrations locales, repository layer
  workflow-engine/  Machine à états pure (transitions, checkpoints, limites de cycles)
  ui/               Composants maison accessibles + tokens
  config/           Presets partagés (tsconfig, ESLint, Tailwind, design tokens)
docs/         Cahier des charges + documents d'architecture (Phase A)
tests/        Tests transverses / E2E
```

## Documentation

- [`docs/implementation-plan.md`](docs/implementation-plan.md) — plan par lots (WP-01→WP-10)
- [`docs/architecture.md`](docs/architecture.md) — architecture cible + ADR
- [`docs/design-system.md`](docs/design-system.md) — tokens, layout, composants, a11y
- [`docs/database-schema.md`](docs/database-schema.md) — 25 tables Drizzle
- [`docs/api-contracts.md`](docs/api-contracts.md) — endpoints + contrats Zod

## Sécurité

Ne jamais committer `.env.local` ni aucun secret. Autorisation côté serveur, refus par
défaut, validation Zod, uploads traités comme non fiables. Détails dans `CLAUDE.md`.

## Statut

Phase A (docs) + WP-01 (fondations) posés. Voir `docs/implementation-plan.md` pour la suite.
