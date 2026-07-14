import Link from 'next/link';
import { AppShell } from '../components/app-shell';
import { StatusDot } from '../components/status-dot';
import { listProjectsWithState } from '../server/services/projects';
import { requirePageOwner } from '../server/guard';
import { stateLabel, stateTone } from '../lib/workflow-ui';

export const dynamic = 'force-dynamic';

/** Accueil / tableau de bord (design-system §10.1). Données réelles issues du seed. */
export default async function HomePage() {
  await requirePageOwner('/');
  const projects = await listProjectsWithState();

  const counts = {
    active: projects.filter((p) => p.status === 'active').length,
    reviewing: projects.filter((p) => (p.runState ?? '').includes('REVIEW')).length,
    blocked: projects.filter((p) => p.status === 'blocked' || p.runState === 'BLOCKED').length,
    approved: projects.filter((p) => p.runState === 'APPROVED').length,
  };

  const recentProjects = projects
    .slice(0, 5)
    .map((p) => ({ id: p.id, name: p.name }));

  return (
    <AppShell recentProjects={recentProjects}>
      <section className="mx-auto max-w-5xl">
        <p className="text-sm text-text-muted">Bienvenue</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Votre centre de commande de développement
        </h1>
        <p className="mt-2 max-w-2xl text-text-muted">
          Créez un projet, décrivez votre besoin, déposez vos fichiers, puis lancez un
          workflow simulé — suivez Claude Builder et Codex Reviewer, les tests, les reviews
          et le verdict final.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Projets actifs', value: counts.active, tone: 'builder' as const },
            { label: 'En review', value: counts.reviewing, tone: 'reviewer' as const },
            { label: 'Bloqués', value: counts.blocked, tone: 'warning' as const },
            { label: 'Approuvés', value: counts.approved, tone: 'success' as const },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-center gap-2">
                <StatusDot tone={s.tone} />
                <span className="text-xs text-text-muted">{s.label}</span>
              </div>
              <div className="mt-2 text-2xl font-semibold">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
            Projets récents
          </h2>
          <Link href="/projects" className="text-sm text-accent-reviewer hover:underline">
            Tout voir
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-border p-6 text-center">
            <p className="text-sm text-text-muted">
              Aucun projet. Initialisez la base (<code className="rounded bg-surface-2 px-1">npm run db:migrate</code>{' '}
              puis <code className="rounded bg-surface-2 px-1">npm run db:seed</code>) ou créez un projet.
            </p>
          </div>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {projects.slice(0, 4).map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="rounded-lg border border-border bg-surface p-4 transition-colors duration-base hover:border-accent-reviewer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{p.name}</span>
                  <span className="flex items-center gap-1.5 text-xs text-text-muted">
                    <StatusDot tone={stateTone(p.runState ?? 'DRAFT')} />
                    {stateLabel(p.runState ?? 'DRAFT')}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-text-muted">{p.description}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {p.tech.map((tech) => (
                    <span key={tech} className="rounded bg-surface-2 px-2 py-0.5 text-xs text-text-muted">
                      {tech}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
