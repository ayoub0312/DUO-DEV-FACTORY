import { and, asc, desc, eq, gt } from 'drizzle-orm';
import { db } from '../client';
import {
  workflowRuns,
  workflowStages,
  agentEvents,
  checkpoints,
  workPackages,
  reviews,
  reviewFindings,
} from '../schema';
import { newId, ID_PREFIX } from '../id';

export const workflowRepo = {
  async createRun(projectId: string) {
    const row = {
      id: newId(ID_PREFIX.run),
      projectId,
      state: 'DRAFT',
      cycleCount: 0,
      checkpointState: null as string | null,
      lastIdempotencyKey: null as string | null,
      startedAt: null as number | null,
      pausedAt: null as number | null,
      endedAt: null as number | null,
      error: null,
      createdAt: Date.now(),
    };
    await db.insert(workflowRuns).values(row);
    return row;
  },

  async getRun(id: string) {
    const rows = await db.select().from(workflowRuns).where(eq(workflowRuns.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async latestRunForProject(projectId: string) {
    const rows = await db
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.projectId, projectId))
      .orderBy(desc(workflowRuns.createdAt))
      .limit(1);
    return rows[0] ?? null;
  },

  async updateRun(
    id: string,
    patch: Partial<{
      state: string;
      cycleCount: number;
      checkpointState: string | null;
      lastIdempotencyKey: string | null;
      startedAt: number | null;
      pausedAt: number | null;
      endedAt: number | null;
    }>,
  ) {
    await db.update(workflowRuns).set(patch).where(eq(workflowRuns.id, id));
    return this.getRun(id);
  },

  async addStage(input: { runId: string; name: string; status?: string; actor?: string }) {
    const row = {
      id: newId(ID_PREFIX.stage),
      runId: input.runId,
      name: input.name,
      status: input.status ?? 'active',
      actor: input.actor ?? null,
      startedAt: Date.now(),
      completedAt: null as number | null,
      durationMs: null as number | null,
      error: null,
    };
    await db.insert(workflowStages).values(row);
    return row;
  },

  async listStages(runId: string) {
    return db
      .select()
      .from(workflowStages)
      .where(eq(workflowStages.runId, runId))
      .orderBy(asc(workflowStages.startedAt));
  },

  /** Prochain numéro de séquence (curseur monotone append-only). */
  async nextSeq(runId: string) {
    const rows = await db
      .select({ seq: agentEvents.seq })
      .from(agentEvents)
      .where(eq(agentEvents.runId, runId))
      .orderBy(desc(agentEvents.seq))
      .limit(1);
    return (rows[0]?.seq ?? 0) + 1;
  },

  async appendEvent(input: {
    runId: string;
    type: string;
    actor: string;
    payload?: Record<string, unknown>;
  }) {
    const seq = await this.nextSeq(input.runId);
    const row = {
      id: newId(ID_PREFIX.event),
      runId: input.runId,
      type: input.type,
      actor: input.actor,
      seq,
      payload: input.payload ?? {},
      createdAt: Date.now(),
    };
    await db.insert(agentEvents).values(row);
    return row;
  },

  async eventsAfter(runId: string, afterSeq: number, limit = 200) {
    return db
      .select()
      .from(agentEvents)
      .where(and(eq(agentEvents.runId, runId), gt(agentEvents.seq, afterSeq)))
      .orderBy(asc(agentEvents.seq))
      .limit(limit);
  },

  async addCheckpoint(runId: string, state: string, snapshot?: Record<string, unknown>) {
    const row = {
      id: newId(ID_PREFIX.checkpoint),
      runId,
      state,
      snapshot: snapshot ?? null,
      createdAt: Date.now(),
    };
    await db.insert(checkpoints).values(row);
    return row;
  },

  async addWorkPackage(input: {
    runId: string;
    title: string;
    objective?: string;
    mainAgent?: string;
    status?: string;
    verdict?: string;
  }) {
    const row = {
      id: newId(ID_PREFIX.workPackage),
      runId: input.runId,
      title: input.title,
      objective: input.objective ?? '',
      deps: [] as string[],
      mainAgent: input.mainAgent ?? null,
      files: [] as string[],
      acceptance: [] as string[],
      status: input.status ?? 'pending',
      verdict: input.verdict ?? null,
      createdAt: Date.now(),
    };
    await db.insert(workPackages).values(row);
    return row;
  },

  async listWorkPackages(runId: string) {
    return db.select().from(workPackages).where(eq(workPackages.runId, runId));
  },

  async addReview(workPackageId: string, verdict: string, summary: string) {
    const row = {
      id: newId(ID_PREFIX.review),
      workPackageId,
      reviewer: 'codex',
      verdict,
      summary,
      createdAt: Date.now(),
    };
    await db.insert(reviews).values(row);
    return row;
  },

  async addFinding(input: {
    reviewId: string;
    category: string;
    severity?: string;
    message: string;
    file?: string | null;
  }) {
    const row = {
      id: newId(ID_PREFIX.finding),
      reviewId: input.reviewId,
      category: input.category,
      severity: input.severity ?? 'info',
      message: input.message,
      file: input.file ?? null,
      resolved: false,
    };
    await db.insert(reviewFindings).values(row);
    return row;
  },

  async findingsFor(reviewId: string) {
    return db.select().from(reviewFindings).where(eq(reviewFindings.reviewId, reviewId));
  },

  async reviewsForWorkPackage(workPackageId: string) {
    const revs = await db
      .select()
      .from(reviews)
      .where(eq(reviews.workPackageId, workPackageId));
    return Promise.all(
      revs.map(async (r) => ({
        ...r,
        findings: await db
          .select()
          .from(reviewFindings)
          .where(eq(reviewFindings.reviewId, r.id)),
      })),
    );
  },
};
