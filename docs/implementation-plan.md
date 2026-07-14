# Plan d'implémentation — DUO DEV FACTORY WEB

Statut : Phase A (référence). Séquence de livraison de la V1, par lots (WP), avec les
portes de qualité à chaque fin de lot. Aligné sur `docs/CAHIER…` §23.

## Principes de méthode

- Travailler **par lots**. Ne pas commencer un développement désordonné.
- Fin de **chaque** lot : `typecheck`, `lint`, tests concernés, correction des erreurs,
  documentation des choix importants.
- La V1 doit être utilisable **avec le Mock Workflow Adapter** avant toute connexion réelle.
- Aucune interdiction violée (voir `docs/CAHIER…` §26) : pas de push, pas de déploiement,
  pas de migration distante, pas de lecture de `.env.local`, pas de WSL requis, pas de
  script Bash obligatoire, pas de secret exposé.

## État d'avancement

| Lot | Sujet | Statut |
|---|---|---|
| Phase A | Docs d'architecture + structure | **Fait** |
| WP-01 | Fondations (monorepo, tokens, layout, thème, qualité, CI locale) | **Fait** |
| WP-02 | Auth + données (Drizzle, schéma, sessions, repository, seed) | **Fait** |
| WP-03 | Projets (liste, création, détail, archivage, paramètres) | **Fait** |
| WP-04 | Fichiers (upload, stockage, extraction, preview, manifeste, sécurité) | **Fait** |
| WP-05 | Chat (messages, composer, attachments, timeline, événements) | **Fait** |
| WP-06 | Workflow Engine (états, transitions, limites, checkpoints, Mock) | **Fait** |
| WP-07 | Lots & Reviews (work packages, findings, verdicts, résolutions) | **Fait** |
| WP-08 | Tests, Rapports (quality gates, agrégation, page Rapports) | **Fait** (rapports agrégés livrés ; diff/export non couverts) |
| WP-09 | Worker API (contrats, register, heartbeat, claim, events, artifacts) | Squelette V2 complet non activé (`apps/worker`) ; **pont léger V1.5** activé et testé (`external-events`, cf. `docs/worker-bridge-ubuntu.md`) pour connecter un workflow réel externe à l'affichage |
| WP-10 | Preview & finition (responsive, a11y, perf, E2E, docs, Vercel) | **Fait** : responsive, thèmes, palette de commandes, rate limiting API, navigation clavier (onglets + palette), suite E2E Playwright (9 tests) |

Voir [`docs/QA-REPORT.md`](./QA-REPORT.md) pour le détail des vérifications manuelles,
[`docs/SECURITY-REVIEW.md`](./SECURITY-REVIEW.md) pour la revue des contraintes de sécurité,
et [`docs/REAL-WORKFLOW-INTEGRATION-TODO.md`](./REAL-WORKFLOW-INTEGRATION-TODO.md) pour le
chemin vers le Worker réel (V2).

## WP-01 — Fondations

**Objectif :** un monorepo runnable, thémé, avec la CI locale et le layout à trois zones.

Livré dans le scaffold : npm workspaces, `packages/config` (tsconfig base, preset ESLint,
preset Tailwind, design tokens), squelettes `contracts` / `database` / `workflow-engine` /
`ui`, `apps/web` (Next.js App Router, Tailwind, thème clair/sombre persistant, layout
sidebar + zone principale + panneau contextuel), `apps/worker` (squelette + adapters
stubs), `.env.example`, `CLAUDE.md`, `AGENTS.md`, `README.md`, scripts de qualité.

Portes : `npm run typecheck`, `npm run lint`, `npm run build` (web), un premier test unitaire
de la machine à états.

Reste à compléter dans WP-01 lors d'une prochaine session : composants UI complets (Button,
Input, Dialog, Toast, Tabs accessibles), palette de commandes `Ctrl+K`, états vides/skeleton
réutilisables, configuration Vitest + Playwright de base.

## WP-02 — Authentification et données

- Fournisseur d'auth mature compatible Next.js ; compte **propriétaire** unique en V1.
- Session sécurisée, cookies HttpOnly/Secure en prod. Mode dev simulé **local uniquement**,
  **refusé en production**.
- Schéma Drizzle complet (25 tables, voir `docs/database-schema.md`), migrations locales,
  repository layer, transactions, index, contraintes.
- Seed de démonstration professionnel : projets *Restaurant Maison Azur*, *Plateforme Hôtel
  Palmes d'Or*, *CRM commercial*, *Application Gift Platform* — avec workflows, reviews,
  tests, fichiers, messages, lots, événements, verdicts. Données **clairement fictives**.
- Tests : permissions, propriété de projet, redaction, idempotence.

## WP-03 — Projets

- Liste (recherche, filtres, statut, technologie, date, grille/liste, archivage,
  duplication, suppression confirmée).
- Assistant de création multi-étapes (identité, type, description, technologies, fichiers,
  niveau d'autonomie, résumé, création).
- Espace projet avec onglets (Chat, Workflow, Fichiers, Lots, Reviews, Tests, Modifications,
  Prévisualisation, Rapports, Paramètres).
- Tests d'intégration : création, accès croisé refusé, archivage/suppression logique.

## WP-04 — Fichiers

- Drag & drop, sélection multiple, progression, preview, statut d'extraction, suppression,
  renommage logique, association à un message, filtre par type, classification.
- Pipeline : type → taille → empreinte SHA-256 → stockage original → extraction → aperçu →
  catégorisation → manifeste → statut READY/ERROR.
- Sécurité : MIME réel + signature, taille, extension/nom généré, quotas ; **ZIP** : zip slip,
  chemins absolus, symlinks dangereux, limite de nombre de fichiers, taille décompressée,
  refus d'exécutables, quarantaine ; **SVG** traité avec précaution.
- Formats : PDF, DOCX, TXT, MD, JSON, YAML, CSV, PNG, JPG/JPEG, WEBP, SVG, ZIP.
- Catégories : requirements, business_rules, brand_asset, design_reference, source_archive,
  technical_document, other.
- Tests : path traversal, archive malveillante, SVG dangereux, MIME falsifié.

## WP-05 — Chat

- Messages utilisateur / Claude / rapports Codex / événements système ; streaming visuel ;
  pièces jointes ; réponses liées à une étape ; édition d'un message non encore traité ;
  recherche, copie, export.
- Timeline reliant messages et événements sans re-render global.

## WP-06 — Workflow Engine

- Implémenter la machine à états (21 états, transitions valides uniquement), historique,
  acteur, horodatage, erreurs conservées, reprise depuis checkpoint, limites de cycles,
  idempotence, « Codex ne modifie pas pendant une review », « aucun passage au lot suivant
  sans approbation ».
- `MockWorkflowAdapter` : démarrage, agents, événements, rapports, reviews, tests,
  corrections, verdict, pause/reprise — **mêmes contrats** que le futur Worker.
- Tests : couverture des transitions, guards, limites de cycles, idempotence, reprise.

## WP-07 — Lots et Reviews

- Work packages : objectif, dépendances, agent principal, fichiers, critères d'acceptation,
  tests, review, verdict.
- Reviews : blockers, corrections obligatoires, sécurité, régressions, tests manquants,
  design, innovations, polish, verdict. Findings, verdicts, résolutions, filtres.

## WP-08 — Tests, Modifications, Rapports

- Quality gates : typecheck, lint, build, unitaires, intégration, E2E, accessibilité (durée,
  logs, relance).
- Modifications : Git status simulé/réel, créés/modifiés/supprimés, diff, agent, étape, lot.
- Rapports : vision, architecture, design system, schéma, sécurité, QA, handoffs, reviews,
  résultat final ; export Markdown/PDF.

## WP-09 — Worker API

- Contrats Zod partagés ; endpoints Worker (register, heartbeat, claim, events, artifacts,
  complete, fail). Auth Worker par **jeton haché**, heartbeat, révocation, permissions.
- `claim` **idempotent**, événements **append-only**, upload d'artefacts, erreurs
  structurées, request ID, audit. **Aucune** commande shell arbitraire depuis le navigateur.
- Tests : token invalide, replay, claim idempotent, publication d'événements.

## WP-10 — Preview et finition

- Prévisualisation (démarrer/arrêter, breakpoints 320/375/768/1440, refresh, ouvrir onglet,
  logs, URL locale, état serveur) — simulée ou réelle selon disponibilité.
- Responsive complet, accessibilité (clavier, focus, lecteurs d'écran, contraste AA, reduced
  motion), performance (Server Components, lazy, pagination, virtualisation).
- E2E du parcours principal ; documentation finale ; préparation Vercel (**sans déployer**).

## Portes de qualité (à chaque lot)

```
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e   # à partir de WP-10, ou tôt pour le parcours de connexion
```

## Livrables de fin de projet

`docs/FINAL-IMPLEMENTATION-REPORT.md`, `docs/SECURITY-REVIEW.md`, `docs/QA-REPORT.md`,
`docs/REAL-WORKFLOW-INTEGRATION-TODO.md`, plus `docs/deployment-vercel.md` et
`docs/worker-setup-windows.md`.
