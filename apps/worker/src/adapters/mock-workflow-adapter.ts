import type { WorkflowAdapter } from './workflow-adapter';
import type { WorkflowEvent, WorkflowSummary, EventType, Actor } from '@duo/contracts';

/**
 * Mock Workflow Adapter (cahier §12.3). Simule un cycle complet — démarrage, agents,
 * événements, reviews, tests, corrections, verdict, pause/reprise — SANS exécuter Claude
 * Code, Codex, Git ou des tests réels. Utilise les mêmes contrats que le futur Worker.
 *
 * NB : en V1 ce mock est piloté côté web par le service `workflow` (voir
 * apps/web/src/server/services/workflow). Cette classe documente le contrat et un
 * générateur d'événements déterministe réutilisable.
 */
export class MockWorkflowAdapter implements WorkflowAdapter {
  private runs = new Map<string, { summary: WorkflowSummary; events: WorkflowEvent[] }>();

  async start({ projectId, runId }: { projectId: string; runId: string }): Promise<WorkflowSummary> {
    const summary: WorkflowSummary = {
      id: runId,
      projectId,
      state: 'ANALYZING_REQUIREMENTS',
      cycleCount: 0,
      startedAt: 0,
      pausedAt: null,
      endedAt: null,
    };
    this.runs.set(runId, { summary, events: [] });
    this.emit(runId, 'workflow.started', 'orchestrator');
    return summary;
  }

  async pause(runId: string): Promise<WorkflowSummary> {
    const s = this.require(runId);
    s.summary.state = 'PAUSED';
    this.emit(runId, 'workflow.paused', 'owner');
    return s.summary;
  }

  async resume(runId: string): Promise<WorkflowSummary> {
    const s = this.require(runId);
    s.summary.state = 'BUILDING_PACKAGE';
    this.emit(runId, 'workflow.resumed', 'owner');
    return s.summary;
  }

  async cancel(runId: string): Promise<WorkflowSummary> {
    const s = this.require(runId);
    s.summary.state = 'CANCELLED';
    s.summary.endedAt = 0;
    this.emit(runId, 'workflow.failed', 'owner');
    return s.summary;
  }

  async get(runId: string): Promise<WorkflowSummary> {
    return this.require(runId).summary;
  }

  async events(runId: string, afterSeq: number): Promise<WorkflowEvent[]> {
    return this.require(runId).events.filter((e) => e.seq > afterSeq);
  }

  private require(runId: string) {
    const s = this.runs.get(runId);
    if (!s) throw new Error(`Run inconnu: ${runId}`);
    return s;
  }

  private emit(runId: string, type: EventType, actor: Actor) {
    const s = this.require(runId);
    const seq = s.events.length + 1;
    s.events.push({ id: `evt_${runId}_${seq}`, runId, type, actor, seq, payload: {}, createdAt: 0 });
  }
}
