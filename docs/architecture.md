# Architecture — DUO DEV FACTORY WEB

Statut : Phase A (référence). Ce document décrit l'architecture cible de la V1.
Il complète le cahier des charges (`docs/CAHIER_DES_CHARGES_DUO_DEV_FACTORY_WEB_WINDOWS.md`)
sans le remplacer. En cas de contradiction, le cahier des charges prime.

## 1. Objectif architectural

Construire un **centre de commande de développement assisté par IA** dont la V1 est
pleinement utilisable avec un **Mock Workflow Adapter**, avant toute connexion à un
Worker réel. L'architecture doit rendre la connexion réelle possible **sans réécrire le
domaine** : seuls des adapters changent.

Trois exigences transverses guident chaque décision :

1. **Séparation Web / Worker.** L'application Web ne fait jamais tourner Claude Code,
   Codex, Git ou des tests. Elle orchestre, persiste, affiche. Le Worker (plus tard)
   exécute, via une connexion **sortante** uniquement.
2. **Refus par défaut.** Toute autorisation est vérifiée côté serveur. Aucun secret
   n'atteint le navigateur ni les agents. Le contenu uploadé est non fiable.
3. **Substituabilité.** Le stockage (Blob), le temps réel (polling → streaming) et
   l'exécution (mock → worker) sont derrière des interfaces. Le cœur métier ne connaît
   que des contrats (`packages/contracts`).

## 2. Vue d'ensemble

```
Navigateur (Windows)
      │  HTTPS, cookies HttpOnly/Secure
      ▼
┌─────────────────────────────────────────────────────────┐
│ Application Next.js (apps/web)                           │
│  • Server Components (rendu par défaut)                  │
│  • Route Handlers  → API de contrôle                    │
│  • Server Actions  → mutations sûres ciblées            │
│  • Auth propriétaire (session HttpOnly)                  │
│                                                          │
│  Couche domaine (services) ─────────────────────────┐   │
│   projects · files · chat · workflow · reports      │   │
│         │            │             │                 │   │
│         ▼            ▼             ▼                 │   │
│  packages/database  storage    workflow-engine       │   │
│  (Drizzle/libSQL)   adapter    (machine à états)     │   │
└─────────┼────────────┼──────────────┼───────────────┘   │
          ▼            ▼              ▼
     Turso/libSQL  Vercel Blob   WorkflowAdapter
       (données)   (fichiers)    ├─ MockWorkflowAdapter (V1)
                                 └─ RemoteWorkerAdapter (futur)
                                        ▲
                                        │ connexion SORTANTE
                                 ┌──────┴───────────────┐
                                 │ Worker local Windows │
                                 │ Claude Code · Codex  │
                                 │ Git · tests · preview│
                                 └──────────────────────┘
```

Point réseau critique de production : **Vercel n'appelle jamais `localhost`**. Le Worker
s'enregistre, envoie un heartbeat, réclame des jobs (`claim`), publie événements et
artefacts — toujours en initiant la connexion vers la plateforme.

## 3. Découpage monorepo

npm workspaces. Chaque package a une frontière claire et des dépendances dirigées vers
le bas (les apps dépendent des packages, jamais l'inverse).

| Espace | Rôle | Dépend de |
|---|---|---|
| `packages/config` | Presets partagés : tsconfig base, ESLint, Tailwind, tokens de design | — |
| `packages/contracts` | Schémas Zod + types partagés (API, événements, erreurs, états) | config |
| `packages/database` | Drizzle schema, client libSQL, migrations, repository layer | contracts, config |
| `packages/workflow-engine` | Machine à états pure : transitions, guards, checkpoints, limites de cycles | contracts, config |
| `packages/ui` | Composants maison accessibles, utilitaires (cn), primitives | config |
| `apps/web` | Next.js : UI, API de contrôle, services domaine, auth | tous les packages |
| `apps/worker` | Squelette Worker : adapters, executors (stubs), sécurité | contracts, config |

Règle de dépendances : `contracts` et `config` sont des feuilles (aucune dépendance
interne lourde). `workflow-engine` est **pur** (aucune I/O, aucune dépendance à
`database`) pour rester testable et déterministe.

## 4. Application Web (apps/web)

### 4.1 Rendu
- **Server Components par défaut.** Les Client Components sont réservés aux interactions
  (composer, drag & drop, panneau workflow live, thème).
- **Route Handlers** (`src/app/api/**/route.ts`) pour l'API de contrôle et l'API Worker.
- **Server Actions** uniquement pour des mutations dont la sécurité est évidente
  (ex. renommage logique d'un fichier), jamais pour des actions Worker.

### 4.2 Couche domaine (services)
Chaque domaine expose un service testable qui ne dépend que de `contracts`, du repository
`database` et des adapters. Les Route Handlers sont minces : ils valident (Zod), vérifient
l'autorisation (propriétaire du projet), délèguent au service, formatent la réponse.

```
src/
  app/                    # routes UI + api
  server/
    auth/                 # session, guard, currentUser()
    services/             # projects, files, chat, workflow, reports
    storage/              # StorageAdapter (local | blob)
    security/             # rate-limit, redaction, upload validation, zip-safe
    events/               # event bus (append-only) + polling feed
  components/             # composants app (layout, sidebar, panels)
  features/               # UI par domaine (projects, chat, files, workflow…)
  lib/                    # helpers client
```

### 4.3 Temps réel
V1 : **polling court** sur `GET /api/workflows/:id/events?after=<cursor>`. Les événements
sont **append-only** avec un curseur monotone. L'interface s'abonne via un hook
`useEventStream` isolé pour permettre de basculer vers SSE/streaming plus tard **sans
toucher au domaine**. Aucun re-render global du chat à chaque événement.

## 5. Worker (apps/worker) — squelette V1

En V1 : **pas d'exécution réelle**. On livre le squelette, les contrats et un Mock.

- `src/adapters/workflow-adapter.ts` — interface `WorkflowAdapter` commune.
- `src/adapters/mock-workflow-adapter.ts` — déroule un cycle complet simulé (démarrage,
  agents, événements, reviews, tests, corrections, verdict, pause/reprise). **Vit côté web
  pour la V1** (le mock n'a pas besoin d'un process séparé) mais implémente le même
  contrat que le futur worker.
- `src/adapters/remote-worker-adapter.ts` — stub : signature de la connexion sortante,
  register/heartbeat/claim/events/artifacts. Non actif tant que le Mock n'est pas validé.
- `src/executors/*` — stubs (claude, codex, git, tests, preview) documentés, non branchés.
- `src/security/*` — validation des jobs reçus, allowlist d'actions, jamais de commande
  shell arbitraire venant du navigateur.

## 6. Machine à états (packages/workflow-engine)

Cœur déterministe et pur. Voir `docs/CAHIER…` §12 pour les 21 états. L'engine fournit :
transitions valides uniquement, historique horodaté avec acteur, checkpoints, reprise,
limites de cycles (anti-boucle infinie de corrections), idempotence des transitions.

L'engine **ne connaît ni la base ni le réseau** : il reçoit un état + un événement et
retourne le nouvel état + les effets à persister. La persistance (workflow_runs,
workflow_stages, agent_events, checkpoints) est faite par le service `workflow` de
`apps/web`. Détails : `docs/implementation-plan.md` (WP-06) et le code commenté.

## 7. Données (packages/database)

Turso/libSQL + Drizzle. 25 tables (voir `docs/database-schema.md`). Principes :
identifiants opaques, clés étrangères, index sur (projet, statut, date), idempotency keys,
tables d'événements **append-only**, suppression **logique** pour les projets, audit
**immuable**, `secret_references` sans valeur brute. Migrations locales versionnées
(`packages/database/migrations`). Repository layer typé au-dessus de Drizzle.

## 8. Fichiers et stockage

`StorageAdapter` abstrait : `LocalStorageAdapter` (dev, système de fichiers Windows) et
`BlobStorageAdapter` (prod, Vercel Blob). Séparation stricte des variantes d'un fichier :
**original**, **extraction**, **aperçu**, **artefact**. Métadonnées + empreinte SHA-256 en
base, manifeste par projet. Pipeline d'upload et garde-fous sécurité : voir `implementation-plan.md`
(WP-04) et `docs/CAHIER…` §11 et §15.4.

## 9. Sécurité (transverse)

Autorisation côté serveur, refus par défaut, CSRF/Origin, rate limiting, validation Zod
partout. Secrets : jamais dans chat/rapports/logs/navigateur/Git ; seules des références en
base ; redaction automatique. Worker : jeton **haché**, rotation, révocation, permissions
par projet, allowlist d'actions. Uploads non fiables (MIME réel, signature, ZIP slip, path
traversal, SVG prudent). Prompt injection documentaire : une instruction dans un fichier ne
remplace jamais le prompt système, les règles de sécurité, les permissions ou une décision
utilisateur. Le mode auth mock est **refusé en production**. Détail complet livré en fin de
projet dans `docs/SECURITY-REVIEW.md`.

## 10. Observabilité

Request ID, workflow run ID, job ID propagés ; logs structurés avec redaction ; durée des
étapes ; statut et dernière activité du Worker ; page diagnostics réservée au propriétaire.

## 11. Décisions d'architecture (ADR résumés)

- **ADR-01 — Mock d'abord.** La V1 est complète avec `MockWorkflowAdapter`. Le réel se
  branche via `RemoteWorkerAdapter` sans réécriture. *Motif : dérisquer, tester le domaine
  isolément, respecter l'annexe du cahier.*
- **ADR-02 — Engine pur.** `workflow-engine` sans I/O. *Motif : déterminisme, tests
  exhaustifs de transitions.*
- **ADR-03 — Connexion sortante uniquement.** Vercel n'atteint jamais le poste. Le Worker
  tire les jobs. *Motif : sécurité réseau de production.*
- **ADR-04 — Polling curseur, remplaçable.** *Motif : simplicité fiable en V1, évolutif
  vers SSE/streaming sans impact domaine.*
- **ADR-05 — Adapters de stockage.** Local en dev, Blob en prod. *Motif : dev Windows sans
  dépendance cloud, prod serverless-compatible.*
- **ADR-06 — Refus par défaut + Zod partagé.** *Motif : une seule source de vérité des
  contrats entre web, worker et tests.*
