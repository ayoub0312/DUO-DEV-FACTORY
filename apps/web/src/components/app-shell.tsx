'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { ThemeToggle } from './theme-toggle';
import { CreateProjectDialog } from './create-project-dialog';

const NAV = [
  { label: 'Accueil', href: '/' },
  { label: 'Projets', href: '/projects' },
  { label: 'Rapports', href: '/reports' },
  { label: 'Paramètres', href: '/settings' },
];

export interface RecentProject {
  id: string;
  name: string;
}

export function AppShell({
  children,
  recentProjects = [],
  rightPanel,
}: {
  children: ReactNode;
  recentProjects?: RecentProject[];
  rightPanel?: ReactNode;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[260px_1fr] xl:grid-cols-[260px_1fr_320px]">
      {/* Mobile nav overlay */}
      {mobileNav && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileNav(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={
          mobileNav
            ? 'fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-border bg-surface shadow-lg md:relative md:z-auto md:w-auto md:shadow-none'
            : 'hidden border-r border-border bg-surface md:flex md:flex-col'
        }
      >
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <span className="inline-block h-6 w-6 rounded-md bg-accent-builder" aria-hidden />
          <span className="font-semibold tracking-tight">DUO DEV FACTORY</span>
          {mobileNav && (
            <button
              type="button"
              onClick={() => setMobileNav(false)}
              className="ml-auto rounded-md p-1 text-text-muted hover:bg-surface-2"
              aria-label="Fermer le menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="p-3">
          <button
            type="button"
            data-new-project
            onClick={() => { setDialogOpen(true); setMobileNav(false); }}
            className="w-full rounded-md bg-accent-builder px-3 py-2 text-sm font-medium text-white transition-colors duration-base hover:opacity-90"
          >
            + Nouveau projet
          </button>
        </div>
        <nav className="px-2" aria-label="Navigation principale">
          {NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setMobileNav(false)}
              className="block rounded-md px-3 py-2 text-sm text-text-muted transition-colors duration-base hover:bg-surface-2 hover:text-text"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-4 px-4 text-xs font-medium uppercase tracking-wide text-text-muted">
          Projets récents
        </div>
        <ul className="mt-1 px-2">
          {recentProjects.length === 0 ? (
            <li className="px-3 py-2 text-sm text-text-muted">Aucun projet récent</li>
          ) : (
            recentProjects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  onClick={() => setMobileNav(false)}
                  className="block truncate rounded-md px-3 py-2 text-sm text-text-muted transition-colors duration-base hover:bg-surface-2 hover:text-text"
                >
                  {p.name}
                </Link>
              </li>
            ))
          )}
        </ul>
        <div className="mt-auto border-t border-border p-3">
          <button
            type="button"
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
              window.location.href = '/login';
            }}
            className="mb-2 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-text-muted transition-colors duration-base hover:bg-surface-2 hover:text-text"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
            </svg>
            Se déconnecter
          </button>
          <div className="px-3 text-xs text-text-muted">Mono-utilisateur · V1</div>
        </div>
      </aside>

      {/* Zone principale */}
      <div className="flex min-w-0 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNav(true)}
              className="rounded-md p-1.5 text-text-muted hover:bg-surface-2 md:hidden"
              aria-label="Ouvrir le menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <span className="text-sm text-text-muted">
              Centre de commande — Claude Builder + Codex Reviewer
            </span>
          </div>
          <ThemeToggle />
        </header>
        <main className="min-w-0 flex-1 overflow-auto p-6">{children}</main>
      </div>

      {/* Panneau contextuel (workflow) — visible en xl */}
      <aside className="hidden border-l border-border bg-surface xl:block">
        <div className="flex h-14 items-center border-b border-border px-4 text-sm font-medium">
          Workflow
        </div>
        <div className="overflow-auto p-4">
          {rightPanel ?? (
            <div className="space-y-3 text-sm">
              <div className="rounded-md border border-border bg-surface-2 p-3">
                <div className="text-text-muted">Étape actuelle</div>
                <div className="mt-1 font-medium">En attente de démarrage</div>
              </div>
              <div className="rounded-md border border-border p-3">
                <div className="mb-2 text-text-muted">Agents</div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-accent-builder" aria-hidden />
                  <span>Claude Builder</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-accent-reviewer" aria-hidden />
                  <span>Codex Reviewer</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      <CreateProjectDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
