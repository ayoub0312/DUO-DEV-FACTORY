import Link from 'next/link';
import { AppShell } from '../../components/app-shell';
import { StatusDot } from '../../components/status-dot';
import { listProjectsWithState } from '../../server/services/projects';
import { stateLabel, stateTone } from '../../lib/workflow-ui';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const projects = await listProjectsWithState();
  const recentProjects = projects.slice(0, 5).map((p) => ({ id: p.id, name: p.name }));

  return (
    <AppShell recentProjects={recentProjects}>
      <section className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Projets</h1>
            <p className="mt-1 text-sm text-text-muted">
              {projects.length} projet{projects.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-border p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2">
              <svg className="h-6 w-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <p className="text-sm font-medium">Aucun projet</p>
            <p className="mt-1 text-sm text-text-muted">
              Créez votre premier projet pour démarrer.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="group rounded-lg border border-border bg-surface p-4 transition-all duration-base hover:border-accent-reviewer hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium leading-tight group-hover:text-accent-reviewer">
                    {p.name}
                  </h3>
                  <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-text-muted">
                    <StatusDot tone={stateTone(p.runState ?? 'DRAFT')} />
                    {stateLabel(p.runState ?? 'DRAFT')}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-text-muted">
                  {p.description || 'Aucune description'}
                </p>
                <div className="mt-3 flex flex-wrap gap-1">
                  <span className="rounded bg-surface-2 px-2 py-0.5 text-xs text-text-muted">
                    {p.type}
                  </span>
                  {p.tech.slice(0, 3).map((t) => (
                    <span key={t} className="rounded bg-surface-2 px-2 py-0.5 text-xs text-text-muted">
                      {t}
                    </span>
                  ))}
                  {p.tech.length > 3 && (
                    <span className="rounded bg-surface-2 px-2 py-0.5 text-xs text-text-muted">
                      +{p.tech.length - 3}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
