# Schéma de base de données — DUO DEV FACTORY WEB

Statut : Phase A (référence). Turso/libSQL + Drizzle ORM. 25 tables minimum
(`docs/CAHIER…` §14). Implémentation dans `packages/database/src/schema.ts`.

## Conventions

- **Identifiants opaques** : `text` (ULID/UUID), jamais d'auto-increment exposé.
- **Horodatage** : `created_at` / `updated_at` en `integer` timestamp (ms) ou ISO `text`.
- **Clés étrangères** déclarées et indexées. **Index** sur (projet, statut, date).
- **Idempotency keys** sur les écritures rejouables (jobs, transitions, events entrants).
- **Append-only** : `agent_events`, `audit_logs`, `worker_heartbeats`, `approvals`,
  `checkpoints` — insertions uniquement, jamais d'update destructif.
- **Suppression logique** des projets (`deleted_at`), jamais de hard delete en V1.
- **Audit immuable**. `secret_references` : **aucune valeur brute**, uniquement un pointeur.

## Domaines et tables

### Identité & accès
- **users** — propriétaire (V1 mono-utilisateur), rôle futur. `id, email, name, role, created_at`.
- **sessions** — session sécurisée. `id, user_id→users, expires_at, created_at, revoked_at`.
- **project_members** — préparation multi-rôle (reader/developer/reviewer/admin).
  `id, project_id→projects, user_id→users, role, created_at`.

### Projets
- **projects** — `id, owner_id→users, name, slug, type, description, tech, autonomy_level,
  status, created_at, updated_at, archived_at, deleted_at`. Index `(owner_id, status, updated_at)`.

### Fichiers
- **project_files** — `id, project_id→projects, name, generated_name, mime, size,
  sha256, category, status(READY|ERROR|PROCESSING), message_id?, created_at`. Index `(project_id, category)`.
- **file_extractions** — `id, file_id→project_files, kind(text|preview|manifest),
  content_ref, meta_json, created_at`. Séparation original/extraction/aperçu/artefact.

### Conversation
- **conversations** — `id, project_id→projects, created_at`.
- **messages** — `id, conversation_id→conversations, role(user|claude|codex|system),
  content, stage_id?, edited(bool), created_at`. Index `(conversation_id, created_at)`.

### Workflow
- **workflow_runs** — `id, project_id→projects, state, cycle_count, started_at, paused_at,
  ended_at, error_json?, idempotency_key`. Index `(project_id, state)`.
- **workflow_stages** — `id, run_id→workflow_runs, name, status, actor, started_at,
  completed_at, duration_ms, error_json?`. Historique horodaté.
- **work_packages** — `id, run_id→workflow_runs, title, objective, deps_json, main_agent,
  files_json, acceptance_json, status, verdict, created_at`.
- **agent_sessions** — `id, run_id→workflow_runs, agent(builder|reviewer|orchestrator),
  stage_id?, started_at, completed_at, status`.
- **agent_events** *(append-only)* — `id, run_id→workflow_runs, type, actor, payload_json,
  seq (curseur monotone), created_at`. Index `(run_id, seq)`.
- **checkpoints** *(append-only)* — `id, run_id→workflow_runs, state, snapshot_json,
  created_at`. Reprise depuis checkpoint.

### Worker & jobs
- **workers** — `id, name, token_hash, status, last_seen_at, revoked_at, created_at`.
  Jeton **haché**, rotation/révocation.
- **worker_heartbeats** *(append-only)* — `id, worker_id→workers, received_at, meta_json`.
- **jobs** — `id, run_id→workflow_runs, worker_id?→workers, type, status(queued|claimed|
  running|done|failed), idempotency_key, claimed_at, created_at`. `claim` idempotent.

### Reviews & qualité
- **reviews** — `id, work_package_id→work_packages, reviewer, verdict, summary, created_at`.
- **review_findings** — `id, review_id→reviews, category(blocker|required_fix|security|
  regression|missing_test|design|innovation|polish), severity, message, file?, resolved(bool)`.
- **quality_gate_runs** — `id, run_id→workflow_runs, stage_id?, created_at`.
- **quality_gate_results** — `id, gate_run_id→quality_gate_runs, gate(typecheck|lint|build|
  unit|integration|e2e|a11y), status(pass|fail), duration_ms, log_ref`.

### Artefacts, décisions, audit, secrets
- **artifacts** — `id, run_id→workflow_runs, job_id?→jobs, kind, storage_ref, sha256,
  created_at`.
- **approvals** *(append-only)* — `id, run_id→workflow_runs, stage_id?, actor, decision,
  created_at`. « Aucun passage au lot suivant sans approbation. »
- **audit_logs** *(immuable)* — `id, actor, action, target, request_id, meta_json, created_at`.
- **secret_references** — `id, project_id?→projects, name, ref(pointeur coffre),
  created_at`. **Jamais** de valeur brute.

## Relations (résumé)

```
users 1─* projects 1─* project_files 1─* file_extractions
projects 1─1 conversations 1─* messages
projects 1─* workflow_runs 1─* workflow_stages
                       │        └─* agent_events (append-only, seq)
                       ├─* work_packages 1─* reviews 1─* review_findings
                       ├─* agent_sessions
                       ├─* checkpoints (append-only)
                       ├─* quality_gate_runs 1─* quality_gate_results
                       ├─* jobs *─1 workers 1─* worker_heartbeats
                       ├─* artifacts
                       ├─* approvals (append-only)
users/*  ─* audit_logs (immuable)
projects ─* secret_references (référence seule)
```

## Index prioritaires

`projects(owner_id, status, updated_at)` · `project_files(project_id, category)` ·
`messages(conversation_id, created_at)` · `workflow_runs(project_id, state)` ·
`agent_events(run_id, seq)` · `jobs(status, run_id)` · `audit_logs(created_at)`.

## Migrations

Migrations **locales versionnées** dans `packages/database/migrations` via drizzle-kit.
Aucune migration distante en V1 (interdiction §26).
