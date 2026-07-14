# Rapport QA — DUO DEV FACTORY WEB (V1, Mock Adapter + pont Worker externe V1.5)

Statut : vérifications manuelles effectuées en environnement de développement local
(`npm run dev --workspace @duo/web`, port 3001). Complète les tests automatisés (voir
`packages/workflow-engine/src/__tests__` et `packages/contracts/src/__tests__`).

## Tests automatisés

| Suite | Fichier | Résultat |
|---|---|---|
| Workflow engine (transitions, pause/resume, cycle limits, idempotence) | `packages/workflow-engine/src/__tests__/machine.test.ts` | 10/10 ✅ |
| Contrats Zod (états, types d'événements, validation projet) | `packages/contracts/src/__tests__/contracts.test.ts` | 5/5 ✅ |
| Typecheck `@duo/web` | `tsc --noEmit` | 0 erreur ✅ |
| E2E Playwright (Chromium) | `apps/web/e2e/*.spec.ts` | 9/9 ✅ (voir détail ci-dessous) |

### Détail E2E (`npm run test:e2e --workspace @duo/web`)

Serveur de dev dédié sur le port 3100 (`playwright.config.ts`, `webServer`), navigateur
Chromium (~150 Mo, installé via `npx playwright install chromium`).

**Incident corrigé** : la première version de la suite E2E partageait le fichier de base
de données du développement réel (`apps/web/.data/duo.db`), ce qui a créé des projets de
test ("E2E Projet …") visibles dans le tableau de bord réel de l'utilisateur — repéré via
une capture d'écran de l'utilisateur. Corrigé par :
1. Nettoyage immédiat des projets de test parasites (soft-delete via l'API, non destructif).
2. Isolation complète : `playwright.config.ts` pointe désormais le serveur E2E vers un
   fichier dédié (`apps/web/.data/e2e-test.db`, chemin absolu pour éviter tout écart de
   résolution relative entre processus), migré automatiquement avant chaque run via
   `e2e/global-setup.ts`. Vérifié : après un run complet, la base réelle (port 3001,
   `.data/duo.db`) reste inchangée (6 projets, aucun ajout).

| Fichier | Scénario | Résultat |
|---|---|---|
| `dashboard.spec.ts` | Compteurs + navigation principale visibles | ✅ |
| `dashboard.spec.ts` | Navigation Projets → Rapports → Paramètres | ✅ |
| `dashboard.spec.ts` | Bascule thème clair/sombre | ✅ |
| `project-lifecycle.spec.ts` | Créer un projet → chat → démarrer le workflow Mock → sortie de l'état Brouillon | ✅ |
| `accessibility.spec.ts` | Palette de commandes : recherche, clic, navigation, fermeture | ✅ |
| `accessibility.spec.ts` | Palette de commandes : Échap ferme le dialogue | ✅ |
| `accessibility.spec.ts` | Onglets projet : navigation clavier flèches gauche/droite (WAI-ARIA Tabs) | ✅ |
| `accessibility.spec.ts` | Dialogue "Nouveau projet" : focus auto au premier champ, fermeture par Échap | ✅ |
| `accessibility.spec.ts` | Bouton de thème : `aria-label` explicite présent | ✅ |

Note : au tout premier lancement contre un serveur de dev à froid, certains tests peuvent
dépasser leur timeout le temps que Next.js compile les routes à la demande (observé lors du
développement de la suite). Une fois le cache de compilation chaud (2ᵉ lancement), la suite
est stable — confirmé par deux exécutions consécutives sans échec.

Manquant (non bloquant pour la V1) : tests d'intégration directs sur les routes API
(`apps/web/src/app/api/**`, au-delà de la couverture E2E qui les exerce indirectement).

## Vérifications manuelles (navigateur)

- **Dashboard** (`/`) : compteurs (actifs/en review/bloqués/approuvés), liste des projets
  récents, lien « Tout voir ». ✅
- **Projets** (`/projects`) : liste complète, cartes avec statut/stack, état vide géré. ✅
- **Création de projet** : dialogue « Nouveau projet » → `POST /api/projects` → apparition
  immédiate dans le tableau de bord et la liste. ✅
- **Détail projet** (`/projects/:id`) : 4 onglets (Chat, Workflow, Fichiers, Lots & Reviews)
  vérifiés individuellement. ✅
- **Chat** : envoi de message (`POST /messages`), persistance après rechargement,
  auto-scroll, avatars par rôle. ✅
- **Workflow (Mock Adapter)** : cycle complet observé de bout en bout —
  `DRAFT → INGESTING → READY → ANALYZING_REQUIREMENTS → PLANNING → REVIEWING_PLAN →
  PLAN_APPROVED → PREPARING_WORK_PACKAGES → BUILDING_PACKAGE → TESTING_PACKAGE →
  REVIEWING_PACKAGE → INTEGRATING → FINAL_TESTING → FINAL_REVIEW → APPROVED`.
  6 étapes, 3 lots de travail, reviews avec findings, ~37 événements générés. ✅
- **Pause / Reprise / Arrêt** : boutons fonctionnels sur le panneau workflow, polling
  toutes les 2s pendant l'exécution. ✅
- **Fichiers** : zone glisser-déposer, upload XHR avec barre de progression, cartes
  fichier (catégorie, taille, date). ✅
- **Lots & Reviews** : work packages avec objectifs, reviews Codex, findings classés par
  catégorie (blocker, security, required_fix, etc.). ✅
- **Rapports** (`/reports`) : KPI globaux (projets, workflows, lots, findings, fichiers,
  événements, durée moyenne d'étape) + tableau détaillé par projet. Vérifié avec 5 projets
  seedés (6 workflows, 11 lots, 14 findings). ✅
- **Paramètres** (`/settings`) : sélecteur de thème (clair/sombre/système) avec
  persistance `localStorage`, informations de configuration (Mock Adapter, stockage). ✅
- **Palette de commandes** (Ctrl+K) : recherche filtrée, navigation au clic, action
  « Nouveau projet » ouvrant le bon dialogue, fermeture sur changement de route. ✅
- **Thème clair/sombre** : bascule immédiate, cohérente sur toutes les pages testées. ✅
- **Responsive mobile** (375×812) : menu hamburger, tiroir de navigation, cartes
  empilées verticalement sur `/reports` et `/projects`. ✅
- **Navigation clavier des onglets** (`Chat`/`Workflow`/`Fichiers`/`Lots & Reviews`) :
  flèches gauche/droite avec roving tabindex, focus visible, contenu switché
  correctement. ✅
- **Rate limiting API** : rafale de 33 `POST /api/projects` → les 30 premières passent
  la validation (400 attendu, corps incomplet), les suivantes reçoivent `429` avec
  en-tête `Retry-After`. ✅
- **Pont Worker externe** (`POST /api/projects/:id/workflow/external-events`) : cycle
  complet testé par appels `curl` réels — `claude.started` → `PLANNING`,
  `claude.completed` → `REVIEWING_PLAN`, `codex.verdict CHANGES_REQUESTED` →
  `FIXING_PLAN` (cycle+1), nouveau `claude.completed` → `REVIEWING_PLAN`,
  `codex.verdict APPROVED` → `PLAN_APPROVED`. Vérifié dans l'UI (`get_page_text`) :
  l'onglet Workflow affiche « Plan approuvé · cycle 1 » et les 9 événements réels
  (`external.claude.*`, `external.codex.*`) dans la timeline, sans aucune modification
  du composant `WorkflowPanel` (réutilisation totale des tables/API existantes). Jeton
  invalide/absent correctement rejeté (401). ✅

## Anomalies corrigées durant cette session

1. Export `getLibsql` → `libsql` incohérent entre `client.ts` et `index.ts`.
2. `idempotencyKey` obligatoire côté contrat alors que le client ne l'envoie pas toujours.
3. Transition manquante (`package_approved`) dans la simulation Mock avant `final_approved`.
4. Type nullable non géré (`events[].payload`) transmis au composant `WorkflowPanel`.
5. Import direct de `drizzle-orm` dans `apps/web` (dépendance non déclarée) — déplacé
   dans `packages/database` via un nouveau `reportsRepo`.
6. Palette de commandes : la fermeture ne se synchronisait pas avec la navigation
   (`router.push`) — résolu en fermant le dialogue avant d'exécuter l'action différée.

## Limites connues (V1)

- Authentification mock uniquement (mono-utilisateur, pas de session réelle) — **interdite
  en production** telle quelle, conformément aux contraintes de sécurité.
- Pas de connexion à un Worker réel : toute la simulation de workflow est un mock
  in-process (`runMockSimulation`).
- Documents uploadés non scannés / non désinfectés au-delà de la validation de type et
  taille — à traiter avant toute exposition publique.
