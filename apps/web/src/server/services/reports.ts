import 'server-only';
import { reportsRepo, type ReportData } from '@duo/database';
import { requireOwner } from '../auth';

export type { ReportData };

export async function getReportSummary(): Promise<ReportData> {
  const owner = await requireOwner();
  try {
    return await reportsRepo.getSummary(owner.id);
  } catch {
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
}
