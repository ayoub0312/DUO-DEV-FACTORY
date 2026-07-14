import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '../../../components/app-shell';
import { StatusDot } from '../../../components/status-dot';
import { Tabs } from '../../../components/tabs';
import { ChatPanel } from '../../../components/chat-panel';
import { WorkflowPanel } from '../../../components/workflow-panel';
import { WorkflowSidebar } from '../../../components/workflow-sidebar';
import { FilesPanel } from '../../../components/files-panel';
import { getProjectDetail } from '../../../server/services/detail';
import { stateLabel, stateTone } from '../../../lib/workflow-ui';

export const dynamic = 'force-dynamic';

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const detail = await getProjectDetail(params.id);
  if (!detail) notFound();
  const { project, messages, files, run, stages, events, workPackages } = detail;
  const tech = (project.tech as string[]) ?? [];

  const chat = <ChatPanel projectId={project.id} initialMessages={messages} />;

  const workflow = (
    <WorkflowPanel
      projectId={project.id}
      initialRun={run}
      initialStages={stages}
      initialEvents={events.map((e) => ({ ...e, payload: e.payload ?? {} }))}
    />
  );

  const filesPanel = <FilesPanel projectId={project.id} initialFiles={files} />;

  const packagesPanel = (
    <div className="space-y-3">
      {workPackages.length === 0 && <p className="text-sm text-text-muted">Aucun lot.</p>}
      {workPackages.map((wp) => (
        <div key={wp.id} className="rounded-lg border border-border bg-surface p-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">{wp.title}</span>
            <span className="text-xs text-text-muted">{wp.status}{wp.verdict ? ` · ${wp.verdict}` : ''}</span>
          </div>
          <p className="mt-1 text-sm text-text-muted">{wp.objective}</p>
          {wp.reviews.map((r) => (
            <div key={r.id} className="mt-2 border-t border-border pt-2">
              <div className="text-xs text-text-muted">Review Codex — {r.verdict ?? 'en cours'}</div>
              <ul className="mt-1 space-y-1">
                {r.findings.map((f) => (
                  <li key={f.id} className="flex items-start gap-2 text-sm">
                    <StatusDot
                      tone={
                        f.category === 'blocker' || f.category === 'security'
                          ? 'danger'
                          : f.category === 'required_fix' || f.category === 'missing_test'
                            ? 'warning'
                            : 'reviewer'
                      }
                    />
                    <span><span className="text-text-muted">[{f.category}]</span> {f.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <AppShell
      rightPanel={
        <WorkflowSidebar
          initialRun={run ? { id: run.id, state: run.state, cycleCount: run.cycleCount } : null}
        />
      }
    >
      <section className="mx-auto max-w-5xl">
        {/* Fil d'Ariane */}
        <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-sm text-text-muted">
          <Link href="/projects" className="transition-colors duration-base hover:text-accent-reviewer">
            Projets
          </Link>
          <span aria-hidden>/</span>
          <span className="truncate text-text">{project.name}</span>
        </nav>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          <span className="flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-sm text-text-muted">
            <StatusDot tone={stateTone(run?.state ?? 'DRAFT')} />
            {stateLabel(run?.state ?? 'DRAFT')}
          </span>
        </div>
        <p className="mt-1 text-text-muted">{project.description}</p>

        {tech.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tech.map((t) => (
              <span
                key={t}
                className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs text-text-muted"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="mt-6">
          <Tabs
            tabs={[
              { key: 'chat', label: 'Chat', content: chat },
              { key: 'workflow', label: 'Workflow', content: workflow },
              { key: 'files', label: 'Fichiers', content: filesPanel },
              { key: 'packages', label: 'Lots & Reviews', content: packagesPanel },
            ]}
          />
        </div>
      </section>
    </AppShell>
  );
}
