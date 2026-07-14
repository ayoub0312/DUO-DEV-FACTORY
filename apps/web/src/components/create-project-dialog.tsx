'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@duo/ui';
import { Dialog } from './dialog';

const PROJECT_TYPES = [
  { value: 'web', label: 'Web' },
  { value: 'saas', label: 'SaaS' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'api', label: 'API' },
];

const initialState = {
  name: '',
  type: 'web',
  description: '',
  tech: '',
};

export interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Formulaire de création de projet — POST /api/projects puis rafraîchit la page. */
export function CreateProjectDialog({ open, onClose }: CreateProjectDialogProps) {
  const router = useRouter();
  const [form, setForm] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setForm(initialState);
    setError(null);
    setSubmitting(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Le nom du projet est requis.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const tech = form.tech
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          type: form.type,
          description: form.description.trim() || undefined,
          tech: tech.length > 0 ? tech : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? "Échec de la création du projet.");
      }

      reset();
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Nouveau projet">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="project-name" className="mb-1 block text-sm font-medium text-text">
            Nom <span className="text-danger">*</span>
          </label>
          <input
            id="project-name"
            type="text"
            required
            autoFocus
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ex. Plateforme Hôtel Palmes d'Or"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent-reviewer focus:outline-none focus:ring-1 focus:ring-accent-reviewer"
          />
        </div>

        <div>
          <label htmlFor="project-type" className="mb-1 block text-sm font-medium text-text">
            Type
          </label>
          <select
            id="project-type"
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:border-accent-reviewer focus:outline-none focus:ring-1 focus:ring-accent-reviewer"
          >
            {PROJECT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="project-description" className="mb-1 block text-sm font-medium text-text">
            Description
          </label>
          <textarea
            id="project-description"
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Décrivez brièvement le besoin…"
            className="w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent-reviewer focus:outline-none focus:ring-1 focus:ring-accent-reviewer"
          />
        </div>

        <div>
          <label htmlFor="project-tech" className="mb-1 block text-sm font-medium text-text">
            Stack technique
          </label>
          <input
            id="project-tech"
            type="text"
            value={form.tech}
            onChange={(e) => setForm((f) => ({ ...f, tech: e.target.value }))}
            placeholder="Next.js, Postgres, Stripe…"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent-reviewer focus:outline-none focus:ring-1 focus:ring-accent-reviewer"
          />
          <p className="mt-1 text-xs text-text-muted">Séparez les technologies par des virgules.</p>
        </div>

        {error && (
          <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md border border-border px-3 py-2 text-sm text-text transition-colors duration-base hover:bg-surface-2"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={cn(
              'rounded-md bg-accent-builder px-3 py-2 text-sm font-medium text-white transition-colors duration-base hover:opacity-90',
              submitting && 'cursor-not-allowed opacity-70',
            )}
          >
            {submitting ? 'Création…' : 'Créer le projet'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
