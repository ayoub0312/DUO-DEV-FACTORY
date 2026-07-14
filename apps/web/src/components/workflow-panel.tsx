'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@duo/ui';
import { StatusDot } from './status-dot';
import { stateLabel, stateTone } from '../lib/workflow-ui';

export interface WorkflowRun {
  id: string;
  projectId: string;
  state: string;
  cycleCount: number;
  startedAt: number | null;
  pausedAt: number | null;
  endedAt: number | null;
}

export interface WorkflowStage {
  id: string;
  runId: string;
  name: string;
  status: string;
  actor: string | null;
  startedAt: number | null;
  completedAt: number | null;
}

export interface WorkflowEvent {
  id: string;
  runId: string;
  type: string;
  actor: string;
  seq: number;
  payload: Record<string, unknown>;
  createdAt: number;
}

export interface WorkflowPanelProps {
  projectId: string;
  initialRun: WorkflowRun | null;
  initialStages: WorkflowStage[];
  initialEvents: WorkflowEvent[];
}

const STEPS = ['Analyse', 'Planification', 'Construction', 'Tests', 'Review', 'Verdict'];

const TERMINAL_STATES = new Set(['APPROVED', 'CANCELLED', 'FAILED']);
const DRAFT_STATES = new Set(['DRAFT', 'READY']);

const EVENT_LABEL: Record<string, string> = {
  'workflow.started': 'Workflow démarré',
  'workflow.paused': 'Workflow mis en pause',
  'workflow.resumed': 'Workflow repris',
  'workflow.completed': 'Workflow terminé',
  'workflow.failed': 'Workflow annulé',
  'workflow.cancelled': 'Workflow annulé',
  'stage.started': 'Étape démarrée',
  'stage.completed': 'Étape terminée',
  'agent.started': 'Agent en action',
  'agent.message': 'Message agent',
  'agent.completed': 'Agent a terminé',
  'file.created': 'Fichier créé',
  'file.modified': 'Fichier modifié',
  'test.started': 'Tests lancés',
  'test.completed': 'Tests terminés',
  'review.completed': 'Review terminée',
  'checkpoint.created': 'Point de reprise créé',
};

const ACTOR_LABEL: Record<string, string> = {
  owner: 'Vous',
  orchestrator: 'Orchestrateur',
  builder: 'Claude Builder',
  reviewer: 'Codex Reviewer',
  system: 'Système',
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const EXTERNAL_AGENT_LABEL: Record<string, string> = { claude: 'Claude Builder', codex: 'Codex Reviewer' };
const EXTERNAL_VERDICT_LABEL: Record<string, string> = {
  APPROVED: 'approuvé',
  CHANGES_REQUESTED: 'modifications demandées',
  INVALID: 'invalide',
};

/** Libellé lisible pour une phase réelle du script externe (ex. "plan-0", "build", "code-1", "fix-2"). */
function stagePhaseLabel(stage: string): string {
  if (stage === 'build') return 'construction';
  const [, prefix, n] = /^(plan|code|fix)-(\d+)$/.exec(stage) ?? [];
  if (prefix === 'plan') return `plan (cycle ${n})`;
  if (prefix === 'code') return `revue de code (cycle ${n})`;
  if (prefix === 'fix') return `correction (cycle ${n})`;
  return stage;
}

/** Libellé pour un événement réel poussé par le pont Worker externe (`external.<agent>.<action>`). */
function externalEventLabel(e: WorkflowEvent): string | null {
  const match = /^external\.(claude|codex)\.(started|completed|verdict)$/.exec(e.type);
  if (!match) return null;
  const [, agent, action] = match;
  const agentLabel = EXTERNAL_AGENT_LABEL[agent!] ?? agent;
  const stageRaw = e.payload?.stage;
  const stageSuffix = typeof stageRaw === 'string' ? ` — ${stagePhaseLabel(stageRaw)}` : '';
  if (action === 'started') return `${agentLabel} a démarré${stageSuffix}`;
  if (action === 'completed') return `${agentLabel} a terminé${stageSuffix}`;
  const verdictRaw = e.payload?.verdict;
  const verdict = typeof verdictRaw === 'string' ? (EXTERNAL_VERDICT_LABEL[verdictRaw] ?? verdictRaw) : '';
  return `Verdict réel${stageSuffix} : ${verdict}`;
}

function eventLabel(e: WorkflowEvent) {
  return externalEventLabel(e) ?? EVENT_LABEL[e.type] ?? e.type;
}

/** Dérive l'activité courante des agents à partir du flux d'événements. */
function deriveAgentActivity(events: WorkflowEvent[]) {
  let builder = false;
  let reviewer = false;
  for (const e of events) {
    const agent = e.payload?.agent as string | undefined;
    const isBuilder = e.actor === 'builder' || agent === 'claude';
    const isReviewer = e.actor === 'reviewer' || agent === 'codex';
    if (e.type === 'agent.started') {
      if (isBuilder) builder = true;
      if (isReviewer) reviewer = true;
    } else if (e.type === 'agent.completed') {
      if (isBuilder) builder = false;
      if (isReviewer) reviewer = false;
    } else if (e.type === 'workflow.completed' || e.type === 'workflow.failed' || e.type === 'workflow.cancelled') {
      builder = false;
      reviewer = false;
    }
  }
  return { builder, reviewer };
}

/** Centre de contrôle du workflow : état, frise d'étapes, agents actifs, actions et timeline. */
export function WorkflowPanel({ projectId, initialRun, initialStages, initialEvents }: WorkflowPanelProps) {
  const [run, setRun] = useState<WorkflowRun | null>(initialRun);
  const [stages, setStages] = useState<WorkflowStage[]>(initialStages);
  const [events, setEvents] = useState<WorkflowEvent[]>(initialEvents);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastSeqRef = useRef(events.reduce((max, e) => Math.max(max, e.seq), 0));

  const state = run?.state ?? 'DRAFT';
  const isTerminal = TERMINAL_STATES.has(state);
  const isPaused = state === 'PAUSED';
  const isDraft = DRAFT_STATES.has(state);
  const isBlocked = state === 'BLOCKED';
  const isRunning = Boolean(run) && !isTerminal && !isPaused && !isDraft && !isBlocked;

  const canStart = !run || isDraft;
  const canPause = Boolean(run) && isRunning;
  const canResume = Boolean(run) && isPaused;
  const canCancel = Boolean(run) && !isTerminal;

  const agentActivity = useMemo(() => deriveAgentActivity(events), [events]);

  const stepStatus = useMemo(() => {
    const byName = new Map(stages.map((s) => [s.name, s.status]));
    return STEPS.map((name) => ({ name, status: byName.get(name) ?? 'pending' }));
  }, [stages]);

  const poll = useCallback(async () => {
    if (!run) return;
    try {
      const [statusRes, eventsRes] = await Promise.all([
        fetch(`/api/workflows/${run.id}`, { cache: 'no-store' }),
        fetch(`/api/workflows/${run.id}/events?after=${lastSeqRef.current}`, { cache: 'no-store' }),
      ]);
      if (statusRes.ok) {
        const data = await statusRes.json();
        if (data.run) setRun(data.run);
        if (data.stages) setStages(data.stages);
      }
      if (eventsRes.ok) {
        const data = await eventsRes.json();
        const items: WorkflowEvent[] = data.items ?? [];
        if (items.length > 0) {
          lastSeqRef.current = items.reduce((max, e) => Math.max(max, e.seq), lastSeqRef.current);
          setEvents((prev) => [...prev, ...items]);
        }
      }
    } catch {
      // silencieux : on retentera au prochain tick
    }
  }, [run]);

  useEffect(() => {
    if (!run || !isRunning) return undefined;
    const id = setInterval(() => void poll(), 2000);
    return () => clearInterval(id);
  }, [run, isRunning, poll]);

  async function callAction(url: string, key: string) {
    setPending(key);
    setError(null);
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error?.message ?? 'Action impossible.');
      }
      if (data.run) {
        setRun(data.run);
        lastSeqRef.current = 0;
      }
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
      return null;
    } finally {
      setPending(null);
    }
  }

  async function handleStart() {
    const data = await callAction(`/api/projects/${projectId}/workflow/start`, 'start');
    if (data?.run) {
      setRun(data.run);
      setStages([]);
      setEvents([]);
      lastSeqRef.current = 0;
    }
  }

  async function handlePause() {
    if (!run) return;
    await callAction(`/api/workflows/${run.id}/pause`, 'pause');
  }

  async function handleResume() {
    if (!run) return;
    await callAction(`/api/workflows/${run.id}/resume`, 'resume');
  }

  async function handleCancel() {
    if (!run) return;
    await callAction(`/api/workflows/${run.id}/cancel`, 'cancel');
  }

  return (
    <div className="space-y-5">
      {/* Bandeau d'état + actions */}
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <StatusDot tone={stateTone(state)} />
            <span className="text-sm font-semibold">{stateLabel(state)}</span>
            {run && <span className="text-xs text-text-muted">· cycle {run.cycleCount}</span>}
          </div>
          <div className="flex gap-2">
            {canStart && (
              <button
                type="button"
                onClick={handleStart}
                disabled={pending !== null}
                className="rounded-md bg-accent-builder px-3 py-1.5 text-sm font-medium text-white transition-colors duration-base hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending === 'start' ? 'Démarrage…' : 'Démarrer'}
              </button>
            )}
            {canPause && (
              <button
                type="button"
                onClick={handlePause}
                disabled={pending !== null}
                className="rounded-md border border-border px-3 py-1.5 text-sm transition-colors duration-base hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending === 'pause' ? 'Pause…' : 'Pause'}
              </button>
            )}
            {canResume && (
              <button
                type="button"
                onClick={handleResume}
                disabled={pending !== null}
                className="rounded-md bg-accent-builder px-3 py-1.5 text-sm font-medium text-white transition-colors duration-base hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending === 'resume' ? 'Reprise…' : 'Reprendre'}
              </button>
            )}
            {canCancel && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={pending !== null}
                className="rounded-md border border-danger/40 px-3 py-1.5 text-sm text-danger transition-colors duration-base hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending === 'cancel' ? 'Arrêt…' : 'Arrêter'}
              </button>
            )}
          </div>
        </div>
        {error && (
          <p role="alert" className="mt-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-1.5 text-xs text-danger">
            {error}
          </p>
        )}
      </div>

      {/* Frise des étapes */}
      <div className="rounded-lg border border-border bg-surface p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">Progression</h3>
        <ol className="flex flex-wrap items-center gap-2">
          {stepStatus.map((s, i) => (
            <li key={s.name} className="flex items-center gap-2">
              <div
                className={cn(
                  'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-base',
                  s.status === 'completed' && 'border-success/40 bg-success/10 text-success',
                  s.status === 'active' && 'border-accent-builder/40 bg-accent-builder/10 text-accent-builder',
                  s.status === 'pending' && 'border-border text-text-muted',
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    s.status === 'completed' && 'bg-success',
                    s.status === 'active' && 'animate-pulse bg-accent-builder',
                    s.status === 'pending' && 'bg-border',
                  )}
                  aria-hidden
                />
                {s.name}
              </div>
              {i < stepStatus.length - 1 && <span className="h-px w-4 bg-border" aria-hidden />}
            </li>
          ))}
        </ol>
      </div>

      {/* Agents actifs */}
      <div className="rounded-lg border border-border bg-surface p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">Agents</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="relative flex h-2.5 w-2.5">
              {agentActivity.builder && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-builder opacity-75" />
              )}
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent-builder" />
            </span>
            <span>Claude Builder</span>
            <span className="text-xs text-text-muted">{agentActivity.builder ? 'actif' : 'en attente'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="relative flex h-2.5 w-2.5">
              {agentActivity.reviewer && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-reviewer opacity-75" />
              )}
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent-reviewer" />
            </span>
            <span>Codex Reviewer</span>
            <span className="text-xs text-text-muted">{agentActivity.reviewer ? 'actif' : 'en attente'}</span>
          </div>
        </div>
      </div>

      {/* Timeline des événements */}
      <div className="rounded-lg border border-border bg-surface p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">Événements</h3>
        {events.length === 0 ? (
          <p className="text-sm text-text-muted">Aucun événement pour l&apos;instant.</p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto text-sm">
            {[...events]
              .sort((a, b) => b.seq - a.seq)
              .map((e) => (
                <li key={e.id} className="flex items-start gap-2 border-b border-border pb-2 last:border-0 last:pb-0">
                  <span className="mt-0.5 shrink-0 tabular-nums text-xs text-text-muted">#{e.seq}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium">{eventLabel(e)}</span>
                      <span className="text-xs text-text-muted">— {ACTOR_LABEL[e.actor] ?? e.actor}</span>
                    </div>
                    <div className="text-xs text-text-muted">{formatTime(e.createdAt)}</div>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
