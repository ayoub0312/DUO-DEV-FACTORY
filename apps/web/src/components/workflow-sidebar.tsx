'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { stateLabel, stateTone } from '../lib/workflow-ui';
import { StatusDot } from './status-dot';

interface SidebarRun {
  id: string;
  state: string;
  cycleCount: number;
}

const TERMINAL = new Set(['APPROVED', 'CANCELLED', 'FAILED']);

export function WorkflowSidebar({ initialRun }: { initialRun: SidebarRun | null }) {
  const [run, setRun] = useState(initialRun);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const poll = useCallback(async () => {
    if (!run) return;
    try {
      const res = await fetch(`/api/workflows/${run.id}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.run) setRun(data.run);
    } catch { /* silent */ }
  }, [run]);

  useEffect(() => {
    if (!run || TERMINAL.has(run.state) || run.state === 'PAUSED' || run.state === 'DRAFT') return;
    intervalRef.current = setInterval(() => void poll(), 3000);
    return () => clearInterval(intervalRef.current);
  }, [run, poll]);

  const state = run?.state ?? 'DRAFT';
  const isActive = run && !TERMINAL.has(state) && state !== 'PAUSED' && state !== 'DRAFT';

  return (
    <div className="space-y-3 text-sm">
      <div className="rounded-md border border-border bg-surface-2 p-3">
        <div className="text-text-muted">État du workflow</div>
        <div className="mt-1 flex items-center gap-2 font-medium">
          <StatusDot tone={stateTone(state)} />
          {stateLabel(state)}
        </div>
        {run && <div className="mt-0.5 text-xs text-text-muted">cycle {run.cycleCount}</div>}
      </div>
      <div className="rounded-md border border-border p-3">
        <div className="mb-2 text-text-muted">Agents</div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {isActive && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-builder opacity-75" />
            )}
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent-builder" />
          </span>
          <span>Claude Builder</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent-reviewer" aria-hidden />
          <span>Codex Reviewer</span>
        </div>
      </div>
    </div>
  );
}
