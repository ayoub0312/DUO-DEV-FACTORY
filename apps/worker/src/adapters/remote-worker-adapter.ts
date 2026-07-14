import type { WorkflowAdapter } from './workflow-adapter';
import type { WorkflowSummary, WorkflowEvent } from '@duo/contracts';

/**
 * Remote Worker Adapter — STUB. Ne PAS activer avant validation du Mock (cahier §26).
 *
 * Principe (cahier §13.1) : le Worker local INITIE la connexion sortante vers la
 * plateforme (register → heartbeat → claim → events/artifacts → complete/fail). La
 * plateforme n'appelle jamais `localhost`. Cet adapter, côté plateforme, ne fait que
 * lire l'état persisté par les endpoints Worker ; il n'ouvre aucune connexion entrante
 * vers le poste de l'utilisateur.
 */
export class RemoteWorkerAdapter implements WorkflowAdapter {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async start(_input: { projectId: string; runId: string }): Promise<WorkflowSummary> {
    throw new Error('RemoteWorkerAdapter non implémenté en V1 (voir REAL-WORKFLOW-INTEGRATION-TODO).');
  }
  async pause(_runId: string): Promise<WorkflowSummary> {
    throw new Error('not-implemented');
  }
  async resume(_runId: string): Promise<WorkflowSummary> {
    throw new Error('not-implemented');
  }
  async cancel(_runId: string): Promise<WorkflowSummary> {
    throw new Error('not-implemented');
  }
  async get(_runId: string): Promise<WorkflowSummary> {
    throw new Error('not-implemented');
  }
  async events(_runId: string, _afterSeq: number): Promise<WorkflowEvent[]> {
    throw new Error('not-implemented');
  }
}
