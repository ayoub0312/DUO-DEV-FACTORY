import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

/**
 * Schéma Drizzle — 25 tables (cahier des charges §14, voir docs/database-schema.md).
 * Conventions : identifiants opaques (text), timestamps en ms (integer),
 * clés étrangères + index, tables append-only pour événements/audit, suppression
 * logique des projets, `secret_references` sans valeur brute.
 */

const now = sql`(unixepoch() * 1000)`;
const id = () => text('id').primaryKey();
const createdAt = () => integer('created_at').notNull().default(now);

// --- Identité & accès ---
export const users = sqliteTable('users', {
  id: id(),
  email: text('email').notNull().unique(),
  name: text('name').notNull().default(''),
  role: text('role').notNull().default('owner'),
  createdAt: createdAt(),
});

export const sessions = sqliteTable('sessions', {
  id: id(),
  userId: text('user_id').notNull().references(() => users.id),
  expiresAt: integer('expires_at').notNull(),
  revokedAt: integer('revoked_at'),
  createdAt: createdAt(),
});

export const projects = sqliteTable(
  'projects',
  {
    id: id(),
    ownerId: text('owner_id').notNull().references(() => users.id),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    type: text('type').notNull().default('web'),
    description: text('description').notNull().default(''),
    tech: text('tech', { mode: 'json' }).notNull().$type<string[]>().default(sql`'[]'`),
    autonomyLevel: text('autonomy_level').notNull().default('balanced'),
    status: text('status').notNull().default('active'),
    createdAt: createdAt(),
    updatedAt: integer('updated_at').notNull().default(now),
    archivedAt: integer('archived_at'),
    deletedAt: integer('deleted_at'), // suppression logique
  },
  (t) => ({ byOwnerStatus: index('idx_projects_owner_status').on(t.ownerId, t.status, t.updatedAt) }),
);

export const projectMembers = sqliteTable('project_members', {
  id: id(),
  projectId: text('project_id').notNull().references(() => projects.id),
  userId: text('user_id').notNull().references(() => users.id),
  role: text('role').notNull().default('reader'),
  createdAt: createdAt(),
});

// --- Fichiers ---
export const projectFiles = sqliteTable(
  'project_files',
  {
    id: id(),
    projectId: text('project_id').notNull().references(() => projects.id),
    name: text('name').notNull(),
    generatedName: text('generated_name').notNull(),
    mime: text('mime').notNull(),
    size: integer('size').notNull(),
    sha256: text('sha256').notNull(),
    category: text('category').notNull().default('other'),
    status: text('status').notNull().default('PROCESSING'),
    messageId: text('message_id'),
    createdAt: createdAt(),
  },
  (t) => ({ byProjectCategory: index('idx_files_project_category').on(t.projectId, t.category) }),
);

export const fileExtractions = sqliteTable('file_extractions', {
  id: id(),
  fileId: text('file_id').notNull().references(() => projectFiles.id),
  kind: text('kind').notNull(), // text | preview | manifest | artifact
  contentRef: text('content_ref'),
  meta: text('meta', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: createdAt(),
});

// --- Conversation ---
export const conversations = sqliteTable('conversations', {
  id: id(),
  projectId: text('project_id').notNull().references(() => projects.id),
  createdAt: createdAt(),
});

export const messages = sqliteTable(
  'messages',
  {
    id: id(),
    conversationId: text('conversation_id').notNull().references(() => conversations.id),
    role: text('role').notNull(), // user | claude | codex | system
    content: text('content').notNull().default(''),
    stageId: text('stage_id'),
    edited: integer('edited', { mode: 'boolean' }).notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => ({ byConversation: index('idx_messages_conversation').on(t.conversationId, t.createdAt) }),
);

// --- Workflow ---
export const workflowRuns = sqliteTable(
  'workflow_runs',
  {
    id: id(),
    projectId: text('project_id').notNull().references(() => projects.id),
    state: text('state').notNull().default('DRAFT'),
    cycleCount: integer('cycle_count').notNull().default(0),
    checkpointState: text('checkpoint_state'),
    lastIdempotencyKey: text('last_idempotency_key'),
    startedAt: integer('started_at'),
    pausedAt: integer('paused_at'),
    endedAt: integer('ended_at'),
    error: text('error', { mode: 'json' }).$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => ({ byProjectState: index('idx_runs_project_state').on(t.projectId, t.state) }),
);

export const workflowStages = sqliteTable('workflow_stages', {
  id: id(),
  runId: text('run_id').notNull().references(() => workflowRuns.id),
  name: text('name').notNull(),
  status: text('status').notNull().default('pending'),
  actor: text('actor'),
  startedAt: integer('started_at'),
  completedAt: integer('completed_at'),
  durationMs: integer('duration_ms'),
  error: text('error', { mode: 'json' }).$type<Record<string, unknown>>(),
});

export const workPackages = sqliteTable('work_packages', {
  id: id(),
  runId: text('run_id').notNull().references(() => workflowRuns.id),
  title: text('title').notNull(),
  objective: text('objective').notNull().default(''),
  deps: text('deps', { mode: 'json' }).$type<string[]>().default(sql`'[]'`),
  mainAgent: text('main_agent'),
  files: text('files', { mode: 'json' }).$type<string[]>().default(sql`'[]'`),
  acceptance: text('acceptance', { mode: 'json' }).$type<string[]>().default(sql`'[]'`),
  status: text('status').notNull().default('pending'),
  verdict: text('verdict'),
  createdAt: createdAt(),
});

export const agentSessions = sqliteTable('agent_sessions', {
  id: id(),
  runId: text('run_id').notNull().references(() => workflowRuns.id),
  agent: text('agent').notNull(), // builder | reviewer | orchestrator
  stageId: text('stage_id'),
  status: text('status').notNull().default('active'),
  startedAt: createdAt(),
  completedAt: integer('completed_at'),
});

// append-only, curseur monotone `seq`
export const agentEvents = sqliteTable(
  'agent_events',
  {
    id: id(),
    runId: text('run_id').notNull().references(() => workflowRuns.id),
    type: text('type').notNull(),
    actor: text('actor').notNull(),
    seq: integer('seq').notNull(),
    payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>().default(sql`'{}'`),
    createdAt: createdAt(),
  },
  (t) => ({ byRunSeq: index('idx_events_run_seq').on(t.runId, t.seq) }),
);

// append-only
export const checkpoints = sqliteTable('checkpoints', {
  id: id(),
  runId: text('run_id').notNull().references(() => workflowRuns.id),
  state: text('state').notNull(),
  snapshot: text('snapshot', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: createdAt(),
});

// --- Worker & jobs ---
export const workers = sqliteTable('workers', {
  id: id(),
  name: text('name').notNull(),
  tokenHash: text('token_hash').notNull(), // jeton HACHÉ, jamais en clair
  status: text('status').notNull().default('idle'),
  lastSeenAt: integer('last_seen_at'),
  revokedAt: integer('revoked_at'),
  createdAt: createdAt(),
});

export const workerHeartbeats = sqliteTable('worker_heartbeats', {
  id: id(),
  workerId: text('worker_id').notNull().references(() => workers.id),
  receivedAt: createdAt(),
  meta: text('meta', { mode: 'json' }).$type<Record<string, unknown>>(),
});

export const jobs = sqliteTable(
  'jobs',
  {
    id: id(),
    runId: text('run_id').notNull().references(() => workflowRuns.id),
    workerId: text('worker_id').references(() => workers.id),
    type: text('type').notNull(),
    status: text('status').notNull().default('queued'),
    idempotencyKey: text('idempotency_key'),
    claimedAt: integer('claimed_at'),
    createdAt: createdAt(),
  },
  (t) => ({ byStatusRun: index('idx_jobs_status_run').on(t.status, t.runId) }),
);

// --- Reviews & qualité ---
export const reviews = sqliteTable('reviews', {
  id: id(),
  workPackageId: text('work_package_id').notNull().references(() => workPackages.id),
  reviewer: text('reviewer').notNull().default('codex'),
  verdict: text('verdict'),
  summary: text('summary').notNull().default(''),
  createdAt: createdAt(),
});

export const reviewFindings = sqliteTable('review_findings', {
  id: id(),
  reviewId: text('review_id').notNull().references(() => reviews.id),
  category: text('category').notNull(), // blocker | required_fix | security | regression | missing_test | design | innovation | polish
  severity: text('severity').notNull().default('info'),
  message: text('message').notNull(),
  file: text('file'),
  resolved: integer('resolved', { mode: 'boolean' }).notNull().default(false),
});

export const qualityGateRuns = sqliteTable('quality_gate_runs', {
  id: id(),
  runId: text('run_id').notNull().references(() => workflowRuns.id),
  stageId: text('stage_id'),
  createdAt: createdAt(),
});

export const qualityGateResults = sqliteTable('quality_gate_results', {
  id: id(),
  gateRunId: text('gate_run_id').notNull().references(() => qualityGateRuns.id),
  gate: text('gate').notNull(), // typecheck | lint | build | unit | integration | e2e | a11y
  status: text('status').notNull(), // pass | fail
  durationMs: integer('duration_ms'),
  logRef: text('log_ref'),
});

// --- Artefacts, décisions, audit, secrets ---
export const artifacts = sqliteTable('artifacts', {
  id: id(),
  runId: text('run_id').notNull().references(() => workflowRuns.id),
  jobId: text('job_id').references(() => jobs.id),
  kind: text('kind').notNull(),
  storageRef: text('storage_ref').notNull(),
  sha256: text('sha256'),
  createdAt: createdAt(),
});

// append-only : aucun passage au lot suivant sans approbation
export const approvals = sqliteTable('approvals', {
  id: id(),
  runId: text('run_id').notNull().references(() => workflowRuns.id),
  stageId: text('stage_id'),
  actor: text('actor').notNull(),
  decision: text('decision').notNull(),
  createdAt: createdAt(),
});

// immuable
export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: id(),
    actor: text('actor').notNull(),
    action: text('action').notNull(),
    target: text('target'),
    requestId: text('request_id'),
    meta: text('meta', { mode: 'json' }).$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => ({ byCreated: index('idx_audit_created').on(t.createdAt) }),
);

// référence seule : JAMAIS de valeur brute
export const secretReferences = sqliteTable('secret_references', {
  id: id(),
  projectId: text('project_id').references(() => projects.id),
  name: text('name').notNull(),
  ref: text('ref').notNull(), // pointeur vers un coffre, pas la valeur
  createdAt: createdAt(),
});
