import { z } from 'zod';
import { zId } from './common';

/** Les 21 états du workflow (cahier des charges §12.1). */
export const WorkflowState = z.enum([
  'DRAFT',
  'INGESTING',
  'READY',
  'ANALYZING_REQUIREMENTS',
  'PLANNING',
  'REVIEWING_PLAN',
  'FIXING_PLAN',
  'PLAN_APPROVED',
  'PREPARING_WORK_PACKAGES',
  'BUILDING_PACKAGE',
  'TESTING_PACKAGE',
  'REVIEWING_PACKAGE',
  'FIXING_PACKAGE',
  'INTEGRATING',
  'FINAL_TESTING',
  'FINAL_REVIEW',
  'APPROVED',
  'BLOCKED',
  'PAUSED',
  'CANCELLED',
  'FAILED',
]);
export type WorkflowState = z.infer<typeof WorkflowState>;

/** Acteur d'une transition (pour l'historique horodaté). */
export const Actor = z.enum(['owner', 'orchestrator', 'builder', 'reviewer', 'system']);
export type Actor = z.infer<typeof Actor>;

export const zStartWorkflow = z.object({
  projectId: zId,
  idempotencyKey: z.string().min(8).max(128).optional(),
});
export type StartWorkflow = z.infer<typeof zStartWorkflow>;

export const zWorkflowSummary = z.object({
  id: zId,
  projectId: zId,
  state: WorkflowState,
  cycleCount: z.number().int().nonnegative(),
  startedAt: z.number().int().nullable(),
  pausedAt: z.number().int().nullable(),
  endedAt: z.number().int().nullable(),
});
export type WorkflowSummary = z.infer<typeof zWorkflowSummary>;

/**
 * Événement poussé par un Worker externe réel (ex. script bash orchestrant
 * Claude Builder + Codex Reviewer hors plateforme). Traduit en transitions de la
 * machine à états existante par `ingestExternalEvent` (aucun état supplémentaire).
 *
 * `stage` identifie la phase du script externe (ex. `plan-0`, `build`, `code-1`,
 * `fix-2`) — le format exact dépend du script, `ingestExternalEvent` reconnaît les
 * préfixes `plan-`, `build`, `code-`, `fix-` (cf. docs/worker-bridge-ubuntu.md).
 */
export const zExternalWorkflowEvent = z.object({
  agent: z.enum(['claude', 'codex']),
  action: z.enum(['started', 'completed', 'verdict']),
  stage: z.string().min(1).max(80),
  verdict: z.enum(['APPROVED', 'CHANGES_REQUESTED', 'INVALID']).optional(),
  message: z.string().max(2000).optional(),
});
export type ExternalWorkflowEvent = z.infer<typeof zExternalWorkflowEvent>;
