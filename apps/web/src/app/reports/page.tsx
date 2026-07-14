import Link from 'next/link';
import { AppShell } from '../../components/app-shell';
import { StatusDot } from '../../components/status-dot';
import { getReportSummary } from '../../server/services/reports';
import { listProjectsWithState } from '../../server/services/projects';
import { stateLabel, stateTone } from '../../lib/workflow-ui';

export const dynamic = 'force-dynamic';

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-sm text-text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-text-muted">{sub}</div>}
    </div>
  );
}

function formatDuration(ms: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

export default async function ReportsPage() {
  const [report, projects] = await Promise.all([getReportSummary(), listProjectsWithState()]);
  const recentProjects = projects.slice(0, 5).map((p) => ({ id: p.id, name: p.name }));

  return (
    <AppShell recentProjects={recentProjects}>
      <section className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-semibold tracking-tight">Rapports</h1>
        <p className="mt-1 text-sm text-text-muted">
          Vue d&apos;ensemble de l&apos;activité de développement
        </p>

        {/* KPI Cards */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Projets" value={report.totalProjects} />
          <StatCard
            label="Workflows"
            value={report.activeWorkflows + report.completedWorkflows + report.failedWorkflows}
            sub={`${report.completedWorkflows} terminés · ${report.activeWorkflows} en cours`}
          />
          <StatCard
            label="Lots de travail"
            value={report.totalWorkPackages}
            sub={`${report.totalReviews} reviews`}
          />
          <StatCard
            label="Findings"
            value={report.totalFindings}
            sub={report.blockerFindings > 0 ? `${report.blockerFindings} bloquants` : 'aucun bloquant'}
          />
        </div>

        {/* Secondary stats */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <StatCard label="Fichiers uploadés" value={report.totalFiles} />
          <StatCard label="Événements agents" value={report.totalEvents} />
          <StatCard
            label="Durée moy. par étape"
            value={formatDuration(report.avgStageDurationMs)}
          />
        </div>

        {/* Project breakdown */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold">Détail par projet</h2>
          {report.projectBreakdown.length === 0 ? (
            <p className="mt-3 text-sm text-text-muted">Aucun projet à afficher.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-text-muted">
                    <th className="pb-2 pr-4 font-medium">Projet</th>
                    <th className="pb-2 pr-4 font-medium">État</th>
                    <th className="pb-2 pr-4 text-right font-medium">Lots</th>
                    <th className="pb-2 pr-4 text-right font-medium">Findings</th>
                    <th className="pb-2 text-right font-medium">Fichiers</th>
                  </tr>
                </thead>
                <tbody>
                  {report.projectBreakdown.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="py-2.5 pr-4">
                        <Link
                          href={`/projects/${p.id}`}
                          className="font-medium transition-colors hover:text-accent-reviewer"
                        >
                          {p.name}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className="flex items-center gap-1.5">
                          <StatusDot tone={stateTone(p.runState ?? 'DRAFT')} />
                          {stateLabel(p.runState ?? 'DRAFT')}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-right">{p.workPackageCount}</td>
                      <td className="py-2.5 pr-4 text-right">{p.findingCount}</td>
                      <td className="py-2.5 text-right">{p.fileCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
