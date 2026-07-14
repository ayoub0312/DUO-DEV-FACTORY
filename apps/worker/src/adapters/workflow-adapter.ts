import type { WorkflowEvent, WorkflowSummary } from '@duo/contracts';

/**
 * Contrat commun à toutes les implémentations de workflow.
 * La V1 utilise `MockWorkflowAdapter`. Le futur `RemoteWorkerAdapter` implémente
 * EXACTEMENT le même contrat — d'où la substituabilité sans réécriture du domaine.
 */
export interface WorkflowAdapter {
  /** Démarre un run pour un projet prêt (READY) et retourne son état initial. */
  start(input: { projectId: string; runId: string }): Promise<WorkflowSummary>;
  pause(runId: string): Promise<WorkflowSummary>;
  resume(runId: string): Promise<WorkflowSummary>;
  cancel(runId: string): Promise<WorkflowSummary>;
  /** État courant d'un run. */
  get(runId: string): Promise<WorkflowSummary>;
  /** Événements depuis un curseur (polling append-only). */
  events(runId: string, afterSeq: number): Promise<WorkflowEvent[]>;
}
