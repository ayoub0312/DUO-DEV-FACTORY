import { and, count, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../client';
import {
  projects,
  workflowRuns,
  workflowStages,
  workPackages,
  reviews,
  reviewFindings,
  agentEvents,
  projectFiles,
} from '../schema';

export interface ReportData {
  totalProjects: number;
  activeWorkflows: number;
  completedWorkflows: number;
  failedWorkflows: number;
  totalWorkPackages: number;
  totalReviews: number;
  totalFindings: number;
  blockerFindings: number;
  totalFiles: number;
  totalEvents: number;
  avgStageDurationMs: number | null;
  projectBreakdown: {
    id: string;
    name: string;
    runState: string | null;
    workPackageCount: number;
    findingCount: number;
    fileCount: number;
  }[];
}

export const reportsRepo = {
  async getSummary(ownerId: string): Promise<ReportData> {
    const ownerProjects = await db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(and(eq(projects.ownerId, ownerId), isNull(projects.deletedAt)));

    const projectIds = ownerProjects.map((p) => p.id);

    if (projectIds.length === 0) {
      return {
        totalProjects: 0,
        activeWorkflows: 0,
        completedWorkflows: 0,
        failedWorkflows: 0,
        totalWorkPackages: 0,
        totalReviews: 0,
        totalFindings: 0,
        blockerFindings: 0,
        totalFiles: 0,
        totalEvents: 0,
        avgStageDurationMs: null,
        projectBreakdown: [],
      };
    }

    const allRuns = await db.select().from(workflowRuns);
    const ownedRuns = allRuns.filter((r) => projectIds.includes(r.projectId));

    const activeWorkflows = ownedRuns.filter(
      (r) => !['APPROVED', 'CANCELLED', 'FAILED', 'DRAFT'].includes(r.state),
    ).length;
    const completedWorkflows = ownedRuns.filter((r) => r.state === 'APPROVED').length;
    const failedWorkflows = ownedRuns.filter((r) => r.state === 'FAILED').length;

    const runIds = ownedRuns.map((r) => r.id);

    let totalWP = 0;
    let totalReviewCount = 0;
    let totalFindingCount = 0;
    let blockerCount = 0;
    let totalEventCount = 0;
    const allStages: { durationMs: number | null }[] = [];

    for (const runId of runIds) {
      const wps = await db.select().from(workPackages).where(eq(workPackages.runId, runId));
      totalWP += wps.length;

      for (const wp of wps) {
        const revs = await db.select().from(reviews).where(eq(reviews.workPackageId, wp.id));
        totalReviewCount += revs.length;
        for (const rev of revs) {
          const findings = await db
            .select()
            .from(reviewFindings)
            .where(eq(reviewFindings.reviewId, rev.id));
          totalFindingCount += findings.length;
          blockerCount += findings.filter(
            (f) => f.category === 'blocker' || f.category === 'security',
          ).length;
        }
      }

      const stages = await db
        .select()
        .from(workflowStages)
        .where(eq(workflowStages.runId, runId));
      allStages.push(...stages);

      const evtCount = await db
        .select({ c: count() })
        .from(agentEvents)
        .where(eq(agentEvents.runId, runId));
      totalEventCount += evtCount[0]?.c ?? 0;
    }

    let totalFileCount = 0;
    for (const pid of projectIds) {
      const fc = await db
        .select({ c: count() })
        .from(projectFiles)
        .where(eq(projectFiles.projectId, pid));
      totalFileCount += fc[0]?.c ?? 0;
    }

    const durationsMs = allStages
      .filter((s) => s.durationMs != null)
      .map((s) => s.durationMs!);
    const avgStageDurationMs =
      durationsMs.length > 0
        ? Math.round(durationsMs.reduce((a, b) => a + b, 0) / durationsMs.length)
        : null;

    const projectBreakdown = await Promise.all(
      ownerProjects.map(async (p) => {
        const run = ownedRuns
          .filter((r) => r.projectId === p.id)
          .sort((a, b) => b.createdAt - a.createdAt)[0];
        let wpCount = 0;
        let fCount = 0;
        if (run) {
          const wps = await db
            .select()
            .from(workPackages)
            .where(eq(workPackages.runId, run.id));
          wpCount = wps.length;
          for (const wp of wps) {
            const revs = await db
              .select()
              .from(reviews)
              .where(eq(reviews.workPackageId, wp.id));
            for (const rev of revs) {
              const findings = await db
                .select({ c: count() })
                .from(reviewFindings)
                .where(eq(reviewFindings.reviewId, rev.id));
              fCount += findings[0]?.c ?? 0;
            }
          }
        }
        const fileCount = await db
          .select({ c: count() })
          .from(projectFiles)
          .where(eq(projectFiles.projectId, p.id));
        return {
          id: p.id,
          name: p.name,
          runState: run?.state ?? null,
          workPackageCount: wpCount,
          findingCount: fCount,
          fileCount: fileCount[0]?.c ?? 0,
        };
      }),
    );

    return {
      totalProjects: projectIds.length,
      activeWorkflows,
      completedWorkflows,
      failedWorkflows,
      totalWorkPackages: totalWP,
      totalReviews: totalReviewCount,
      totalFindings: totalFindingCount,
      blockerFindings: blockerCount,
      totalFiles: totalFileCount,
      totalEvents: totalEventCount,
      avgStageDurationMs,
      projectBreakdown,
    };
  },
};
