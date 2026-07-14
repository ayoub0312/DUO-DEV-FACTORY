'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '../../components/app-shell';

type Theme = 'light' | 'dark' | 'system';

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {description && <div className="text-xs text-text-muted">{description}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SettingsContent() {
  const [theme, setTheme] = useState<Theme>('system');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('duo-theme-pref');
    if (stored === 'light' || stored === 'dark') setTheme(stored);
  }, []);

  function applyTheme(t: Theme) {
    setTheme(t);
    if (t === 'system') {
      localStorage.removeItem('duo-theme-pref');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      localStorage.setItem('duo-theme-pref', t);
      document.documentElement.setAttribute('data-theme', t);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight">Paramètres</h1>
        <p className="mt-1 text-sm text-text-muted">Configuration de l&apos;application</p>

        <div className="mt-6 space-y-4">
          <SettingsSection title="Apparence">
            <SettingsRow label="Thème" description="Choisir le mode d'affichage">
              <div className="flex gap-1 rounded-md border border-border p-0.5">
                {(['light', 'dark', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => applyTheme(t)}
                    className={`rounded px-3 py-1.5 text-sm transition-colors ${
                      theme === t
                        ? 'bg-accent-builder text-white'
                        : 'text-text-muted hover:bg-surface-2'
                    }`}
                  >
                    {t === 'light' ? 'Clair' : t === 'dark' ? 'Sombre' : 'Système'}
                  </button>
                ))}
              </div>
            </SettingsRow>
          </SettingsSection>

          <SettingsSection title="Workflow">
            <SettingsRow
              label="Adaptateur"
              description="V1 utilise un adaptateur simulé (Mock) ou le pont Worker externe"
            >
              <span className="rounded-full bg-surface-2 px-3 py-1 text-sm text-text-muted">
                Mock Adapter
              </span>
            </SettingsRow>
            <SettingsRow
              label="Niveau d'autonomie par défaut"
              description="S'applique aux nouveaux projets"
            >
              <select
                className="rounded-md border border-border bg-bg px-3 py-1.5 text-sm"
                defaultValue="balanced"
              >
                <option value="supervised">Supervisé</option>
                <option value="balanced">Équilibré</option>
                <option value="autonomous">Autonome</option>
              </select>
            </SettingsRow>
          </SettingsSection>

          <SettingsSection title="Données">
            <SettingsRow
              label="Base de données"
              description="libSQL (fichier local en dev, Turso en production)"
            >
              <span className="rounded-full bg-surface-2 px-3 py-1 text-sm text-text-muted">
                libSQL
              </span>
            </SettingsRow>
            <SettingsRow
              label="Stockage fichiers"
              description="Fichiers uploadés stockés localement"
            >
              <span className="rounded-full bg-surface-2 px-3 py-1 text-sm text-text-muted">
                .data/storage/
              </span>
            </SettingsRow>
          </SettingsSection>

          <SettingsSection title="À propos">
            <SettingsRow label="Version" description="DUO DEV FACTORY WEB">
              <span className="text-sm text-text-muted">V1.0.0</span>
            </SettingsRow>
            <SettingsRow label="Authentification" description="Propriétaire unique, connexion par mot de passe">
              <span className="text-sm text-text-muted">Mono-utilisateur</span>
            </SettingsRow>
          </SettingsSection>
        </div>

        {saved && (
          <div className="fixed bottom-4 right-4 rounded-lg border border-border bg-surface px-4 py-2 text-sm shadow-lg">
            Paramètre enregistré
          </div>
        )}
      </section>
    </AppShell>
  );
}
