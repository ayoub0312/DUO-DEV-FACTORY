# Rapport final d'implémentation — DUO DEV FACTORY WEB V1

## Résumé

DUO DEV FACTORY WEB V1 est fonctionnelle, testée manuellement de bout en bout, et
utilise un Mock Workflow Adapter conformément aux contraintes du cahier des charges.
L'application couvre l'intégralité du parcours utilisateur décrit : créer un projet,
décrire un besoin par chat, déposer des fichiers, lancer un workflow simulé
(Claude Builder + Codex Reviewer), suivre les étapes/agents/tests/reviews, consulter les
rapports, et gérer les paramètres.

## Périmètre livré

### Architecture

- Monorepo npm workspaces : `apps/web`, `apps/worker`, `packages/{contracts,database,
  workflow-engine,ui,config}`.
- Next.js 14 App Router + TypeScript strict, Tailwind avec design tokens CSS variables,
  thème clair/sombre persistant.
- Turso/libSQL + Drizzle ORM, 25 tables, curseurs append-only pour les événements.
- Machine à états pure (21 états, 17 actions) sans I/O, testée indépendamment.

### Fonctionnalités utilisateur

- **Dashboard** (`/`) : KPI, projets récents.
- **Projets** (`/projects`, `/projects/:id`) : liste, création, détail à 4 onglets
  (Chat, Workflow, Fichiers, Lots & Reviews), archivage logique.
- **Chat** : messages persistés, auto-scroll, avatars par rôle.
- **Workflow** : démarrage/pause/reprise/arrêt, frise de progression à 6 étapes,
  polling temps réel des événements, activité agents animée.
- **Fichiers** : upload glisser-déposer avec barre de progression, catégorisation.
- **Lots & Reviews** : work packages, reviews Codex, findings classés par catégorie.
- **Rapports** (`/reports`) : agrégats globaux (projets, workflows, lots, findings,
  fichiers, événements, durée moyenne d'étape) + détail par projet.
- **Paramètres** (`/settings`) : thème, niveau d'autonomie par défaut, informations
  système.
- **Palette de commandes** (Ctrl+K) : navigation rapide, actions (thème, nouveau projet).
- **Responsive** : layout à trois zones sur desktop (sidebar/contenu/panneau workflow),
  tiroir mobile avec hamburger, testé à 375px.
- **Rate limiting API** : fenêtre glissante par propriétaire + catégorie de route
  (120/60s lecture, 30/60s écriture, 10/60s upload), `429` + `Retry-After`.
- **Pont Worker externe (V1.5)** : endpoint `POST /api/projects/:id/workflow/external-events`
  permettant à un workflow Duo réel externe (ex. script bash orchestrant Claude+Codex dans
  WSL/Ubuntu) de pousser des événements réels, traduits en transitions de la machine à
  états déjà existante. Authentifié par jeton partagé, communication strictement sortante
  (le script pousse, la plateforme ne déclenche jamais rien en retour). Voir
  [`docs/worker-bridge-ubuntu.md`](./worker-bridge-ubuntu.md) pour le guide de connexion
  et [`scripts/duo-web-bridge.sh`](../scripts/duo-web-bridge.sh) pour le script à copier
  côté Ubuntu. Testé de bout en bout par appels `curl` réels et vérifié dans l'UI.

### Tests automatisés

- `packages/workflow-engine` : 10 tests (transitions nominales et invalides, terminaisons,
  pause/reprise, limites de cycle, idempotence).
- `packages/contracts` : 5 tests (validation Zod des états, types d'événements, création
  de projet, structure d'erreur).
- `apps/web/e2e` (Playwright/Chromium) : 9 tests couvrant le parcours principal (création
  de projet → chat → démarrage du workflow Mock) et l'accessibilité essentielle (palette
  de commandes, navigation clavier des onglets, focus des dialogues).
- Typecheck `@duo/web` sans erreur.

Voir [`docs/QA-REPORT.md`](./QA-REPORT.md) pour le détail des vérifications manuelles
navigateur, et [`docs/SECURITY-REVIEW.md`](./SECURITY-REVIEW.md) pour la revue des
contraintes de sécurité.

## Anomalies rencontrées et résolues

Voir la section correspondante de `docs/QA-REPORT.md` — six anomalies identifiées et
corrigées durant l'implémentation (exports incohérents, validation trop stricte,
transition manquante dans le Mock Adapter, type nullable, dépendance mal placée,
synchronisation navigation/fermeture de la palette de commandes).

## Ce qui reste hors V1 (assumé et documenté)

- Protocole Worker complet V2 (register/heartbeat/claim multi-Workers, squelette présent
  dans `apps/worker`, non activé) — voir
  [`docs/REAL-WORKFLOW-INTEGRATION-TODO.md`](./REAL-WORKFLOW-INTEGRATION-TODO.md). Un
  pont léger V1.5 à jeton unique existe désormais pour un seul Worker/poste local (voir
  ci-dessus et `docs/worker-bridge-ubuntu.md`) — il ne remplace pas le protocole complet.
- Authentification réelle (V1 = mock mono-utilisateur, volontairement non-production).
- Tests d'intégration directs sur les routes API (au-delà de la couverture E2E indirecte).
- Audit d'accessibilité formel plus poussé (contraste avec un outil dédié, tests lecteurs
  d'écran réels) — navigation clavier déjà couverte et testée (onglets, palette de
  commandes, dialogues) ; contraste des tokens de couleur vérifié manuellement (≥ 5.3:1
  clair, ≥ 7.2:1 sombre pour le texte atténué, au-dessus du seuil AA 4.5:1).

## Conformité aux contraintes de sécurité

Aucune violation des interdictions explicites du cahier des charges n'a été constatée
(pas de push, pas de déploiement, pas de migration distante, pas de lecture de
`.env.local`, pas de dépendance WSL, pas de script Bash obligatoire, pas de suppression
destructive sans sauvegarde, pas d'API shell arbitraire). Détail complet dans
`docs/SECURITY-REVIEW.md`.

## Recommandation

La V1 est prête pour une utilisation locale de démonstration/développement avec le Mock
Adapter. Avant toute exposition réseau ou mise en production, prioriser dans l'ordre :
authentification réelle → rate limiting → activation progressive du Worker réel (cf.
feuille de route dédiée).
