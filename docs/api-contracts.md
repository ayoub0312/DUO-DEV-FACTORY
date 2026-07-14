# Contrats d'API — DUO DEV FACTORY WEB

Statut : Phase A (référence). Tous les contrats sont définis en **Zod** dans
`packages/contracts` et partagés entre `apps/web`, `apps/worker` et les tests. Source :
`docs/CAHIER…` §13, §15, §16.

## 1. Principes

- **Zod partagé** : une seule source de vérité des schémas (requête, réponse, événements).
- **Refus par défaut** : autorisation vérifiée côté serveur, propriété du projet contrôlée.
- **Validation systématique** de toute entrée. Protection CSRF/Origin, rate limiting.
- **Request ID** propagé sur chaque requête et présent dans les erreurs.
- **Le Worker initie la connexion** vers la plateforme (jamais l'inverse).

## 2. Format d'erreur (uniforme)

```json
{
  "error": {
    "code": "WORKFLOW_NOT_READY",
    "message": "Le projet ne peut pas être démarré.",
    "requestId": "req_01H..."
  }
}
```

Codes indicatifs : `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`,
`RATE_LIMITED`, `WORKFLOW_NOT_READY`, `INVALID_TRANSITION`, `WORKER_TOKEN_INVALID`,
`IDEMPOTENCY_CONFLICT`, `UPLOAD_REJECTED`, `INTERNAL`.

## 3. Endpoints — Projets

| Méthode | Chemin | Rôle |
|---|---|---|
| `GET` | `/api/projects` | Liste des projets du propriétaire |
| `POST` | `/api/projects` | Création |
| `GET` | `/api/projects/:id` | Détail |
| `PATCH` | `/api/projects/:id` | Mise à jour (dont archivage) |
| `DELETE` | `/api/projects/:id` | Suppression **logique** (confirmée) |

## 4. Endpoints — Fichiers

| Méthode | Chemin | Rôle |
|---|---|---|
| `POST` | `/api/projects/:id/files` | Upload (multipart, pipeline sécurisé) |
| `GET` | `/api/projects/:id/files` | Liste + statut d'extraction |
| `GET` | `/api/files/:id` | Métadonnées + variantes (original/extraction/aperçu) |
| `DELETE` | `/api/files/:id` | Suppression |

Upload : MIME réel + signature, taille, extension, nom généré, quotas ; ZIP sécurisé
(zip slip, chemins absolus, symlinks, limites nombre/taille décompressée, refus
d'exécutables, quarantaine) ; SVG traité avec précaution. Statut final `READY` ou `ERROR`.

## 5. Endpoints — Chat

| Méthode | Chemin | Rôle |
|---|---|---|
| `GET` | `/api/projects/:id/messages` | Historique (paginé) |
| `POST` | `/api/projects/:id/messages` | Nouveau message utilisateur |

## 6. Endpoints — Workflow

| Méthode | Chemin | Rôle |
|---|---|---|
| `POST` | `/api/projects/:id/workflow/start` | Démarre un run (via l'adapter actif) |
| `POST` | `/api/workflows/:id/pause` | Pause |
| `POST` | `/api/workflows/:id/resume` | Reprise depuis checkpoint |
| `POST` | `/api/workflows/:id/cancel` | Annulation |
| `GET` | `/api/workflows/:id` | État courant + résumé |
| `GET` | `/api/workflows/:id/events?after=:seq` | Flux d'événements (polling curseur) |

`start` échoue avec `WORKFLOW_NOT_READY` si le projet n'est pas en état `READY`. Les
transitions passent par `packages/workflow-engine` (transitions valides uniquement).

## 7. Endpoints — Worker (connexion sortante)

| Méthode | Chemin | Rôle |
|---|---|---|
| `POST` | `/api/workers/register` | Enregistrement (retourne un jeton ; stocké **haché**) |
| `POST` | `/api/workers/heartbeat` | Signal de vie + statut |
| `POST` | `/api/workers/claim` | Réclame un job (**idempotent**) |
| `POST` | `/api/workers/jobs/:id/events` | Publie des événements (**append-only**) |
| `POST` | `/api/workers/jobs/:id/artifacts` | Dépose un artefact |
| `POST` | `/api/workers/jobs/:id/complete` | Termine un job |
| `POST` | `/api/workers/jobs/:id/fail` | Signale un échec |

Sécurité Worker : jeton **haché**, rotation, révocation, permissions par projet, allowlist
d'actions, limites de durée/taille, audit. **Aucune** commande shell arbitraire ne peut être
transmise par le navigateur. L'authentification Worker se fait par en-tête
`Authorization: Bearer <token>` comparé au **hash** stocké.

## 8. Événements (types minimum)

`workflow.started` · `workflow.paused` · `workflow.resumed` · `workflow.completed` ·
`workflow.failed` · `stage.started` · `stage.completed` · `agent.started` ·
`agent.message` · `agent.completed` · `file.created` · `file.modified` · `test.started` ·
`test.completed` · `review.completed` · `checkpoint.created`.

Chaque événement porte : `id, runId, type, actor, seq (curseur monotone), payload, createdAt`.
La V1 utilise un **polling court** sur le curseur `seq` ; l'architecture permet de basculer
vers SSE/streaming **sans changer les contrats**.

## 9. Organisation dans `packages/contracts`

```
src/
  index.ts          # ré-exports
  errors.ts         # ApiError, codes, helper de formatage
  common.ts         # id, pagination, timestamps
  projects.ts       # Project, CreateProject, UpdateProject
  files.ts          # FileMeta, UploadResult, catégories, formats acceptés
  chat.ts           # Message, roles
  workflow.ts       # WorkflowState (21), transitions, StartWorkflow
  events.ts         # EventType, WorkflowEvent
  worker.ts         # Register, Heartbeat, Claim, JobEvent, Artifact, Complete, Fail
```

Chaque fichier exporte les **schémas Zod** et les **types inférés** (`z.infer`). Les Route
Handlers importent ces schémas pour valider entrée/sortie ; les tests de contrats les
réutilisent tels quels.
