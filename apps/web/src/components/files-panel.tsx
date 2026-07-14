'use client';

import { useCallback, useRef, useState } from 'react';
import { cn } from '@duo/ui';
import { StatusDot } from './status-dot';

export interface ProjectFile {
  id: string;
  projectId: string;
  name: string;
  mime: string;
  size: number;
  category: string;
  status: string;
  createdAt: number;
}

export interface FilesPanelProps {
  projectId: string;
  initialFiles: ProjectFile[];
}

const CATEGORY_LABEL: Record<string, string> = {
  requirements: 'Cahier des charges',
  business_rules: 'Règles métier',
  brand_asset: 'Identité visuelle',
  design_reference: 'Référence design',
  source_archive: 'Archive source',
  technical_document: 'Document technique',
  other: 'Autre',
};

interface UploadTask {
  id: string;
  name: string;
  progress: number;
  error?: string;
  done?: boolean;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusTone(status: string): 'success' | 'danger' | 'muted' {
  if (status === 'READY') return 'success';
  if (status === 'ERROR') return 'danger';
  return 'muted';
}

function FileIcon({ category }: { category: string }) {
  if (category === 'brand_asset' || category === 'design_reference') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 20.25h18A1.5 1.5 0 0022.5 18.75V5.25A1.5 1.5 0 0021 3.75H3a1.5 1.5 0 00-1.5 1.5v13.5A1.5 1.5 0 003 20.25zM9 8.25a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      </svg>
    );
  }
  if (category === 'source_archive') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

/** Panneau de gestion documentaire : upload (drag & drop) + liste des fichiers du projet. */
export function FilesPanel({ projectId, initialFiles }: FilesPanelProps) {
  const [files, setFiles] = useState<ProjectFile[]>(initialFiles);
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const refreshFiles = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/files`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setFiles(data.items ?? []);
    } catch {
      // silencieux
    }
  }, [projectId]);

  const uploadFiles = useCallback(
    (fileList: FileList | File[]) => {
      const list = Array.from(fileList);
      if (list.length === 0) return;

      const taskId = `up_${Date.now()}`;
      setTasks((prev) => [
        ...prev,
        { id: taskId, name: list.length === 1 ? (list[0]?.name ?? 'fichier') : `${list.length} fichiers`, progress: 0 },
      ]);

      const formData = new FormData();
      for (const f of list) formData.append('files', f);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `/api/projects/${projectId}/files`);
      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        const progress = Math.round((e.loaded / e.total) * 100);
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, progress } : t)));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, progress: 100, done: true } : t)));
          void refreshFiles();
        } else {
          let message = 'Échec de l\'envoi.';
          try {
            const data = JSON.parse(xhr.responseText);
            message = data?.error?.message ?? message;
          } catch {
            /* réponse non JSON */
          }
          setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, error: message } : t)));
        }
        setTimeout(() => setTasks((prev) => prev.filter((t) => t.id !== taskId)), 4000);
      };
      xhr.onerror = () => {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, error: 'Erreur réseau.' } : t)));
        setTimeout(() => setTasks((prev) => prev.filter((t) => t.id !== taskId)), 4000);
      };
      xhr.send(formData);
    },
    [projectId, refreshFiles],
  );

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'rounded-lg border-2 border-dashed p-6 text-center transition-colors duration-base',
          dragOver ? 'border-accent-reviewer bg-accent-reviewer/5' : 'border-border',
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="mx-auto h-8 w-8 text-text-muted"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 7.5m0 0L7.5 12m4.5-4.5v13.5"
          />
        </svg>
        <p className="mt-2 text-sm font-medium">Glissez-déposez vos fichiers ici</p>
        <p className="mt-1 text-xs text-text-muted">
          Cahiers des charges, maquettes, archives source, documents techniques…
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-3 rounded-md border border-border px-3 py-1.5 text-sm transition-colors duration-base hover:bg-surface-2"
        >
          Parcourir…
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          aria-label="Choisir des fichiers à envoyer"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) uploadFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {tasks.length > 0 && (
        <div className="space-y-2">
          {tasks.map((t) => (
            <div key={t.id} className="rounded-md border border-border bg-surface px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="truncate">{t.name}</span>
                <span className="text-xs text-text-muted">
                  {t.error ? 'Échec' : t.done ? 'Terminé' : `${t.progress}%`}
                </span>
              </div>
              <div
                className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2"
                role="progressbar"
                aria-label={`Envoi de ${t.name}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={t.error ? undefined : t.progress}
              >
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-base',
                    t.error ? 'bg-danger' : 'bg-accent-builder',
                  )}
                  style={{ width: `${t.error ? 100 : t.progress}%` }}
                />
              </div>
              {t.error && <p className="mt-1 text-xs text-danger">{t.error}</p>}
            </div>
          ))}
        </div>
      )}

      {files.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm font-medium">Aucun fichier</p>
          <p className="mt-1 text-sm text-text-muted">
            Ajoutez vos documents pour que Claude Builder puisse démarrer l&apos;analyse.
          </p>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {files.map((f) => (
            <div key={f.id} className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-text-muted">
                <FileIcon category={f.category} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{f.name}</div>
                <div className="mt-0.5 text-xs text-text-muted">
                  {CATEGORY_LABEL[f.category] ?? f.category} · {formatSize(f.size)}
                </div>
                <div className="mt-0.5 text-xs text-text-muted">{formatDate(f.createdAt)}</div>
              </div>
              <span className="flex shrink-0 items-center gap-1.5 text-xs text-text-muted">
                <StatusDot tone={statusTone(f.status)} />
                {f.status === 'READY' ? 'Prêt' : f.status === 'ERROR' ? 'Erreur' : 'Traitement'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
