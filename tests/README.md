# tests/ — tests transverses

- Tests unitaires : au plus près du code, dans chaque package (`packages/*/src/**/*.test.ts`).
  Exemple déjà livré : `packages/workflow-engine/src/__tests__/machine.test.ts`.
- Tests d'intégration API : dans `apps/web` (WP-03+).
- Tests **E2E Playwright** : ce dossier accueillera le parcours principal (WP-10) —
  connexion → nouveau projet → dépôt cahier → chat → démarrage Mock → suivi → pause/reprise
  → review → résultat final → mobile.
- Accessibilité : axe-core sur les écrans clés (WP-10).

Portes de qualité : `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`,
`npm run test:e2e`.
