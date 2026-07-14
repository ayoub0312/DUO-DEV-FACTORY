import { z } from 'zod';
import { zId } from './common';
import { zWorkflowEvent } from './events';

/**
 * Contrats Worker (cahier des charges §13.2). Le Worker INITIE la connexion sortante.
 * Le jeton retourné à l'enregistrement est stocké HACHÉ côté plateforme.
 */
export const zWorkerRegister = z.object({
  name: z.string().min(1).max(80),
  capabilities: z.array(z.string().max(40)).max(50).default([]),
});
export type WorkerRegister = z.infer<typeof zWorkerRegister>;

export const zWorkerRegistered = z.object({
  workerId: zId,
  /** Jeton en clair transmis UNE seule fois. Stocké haché côté serveur. */
  token: z.string().min(32),
});
export type WorkerRegistered = z.infer<typeof zWorkerRegistered>;

export const zHeartbeat = z.object({
  status: z.enum(['idle', 'busy', 'draining']),
  meta: z.record(z.unknown()).optional(),
});
export type Heartbeat = z.infer<typeof zHeartbeat>;

export const zClaim = z.object({
  /** Idempotence : deux claims avec la même clé renvoient le même job. */
  idempotencyKey: z.string().min(8).max(128),
});
export type Claim = z.infer<typeof zClaim>;

export const zJob = z.object({
  id: zId,
  runId: zId,
  type: z.string().min(1).max(60),
  status: z.enum(['queued', 'claimed', 'running', 'done', 'failed']),
  createdAt: z.number().int(),
});
export type Job = z.infer<typeof zJob>;

/** Publication d'événements (append-only) par le Worker pour un job. */
export const zJobEvents = z.object({
  events: z.array(zWorkflowEvent.omit({ id: true, seq: true })).min(1).max(500),
});
export type JobEvents = z.infer<typeof zJobEvents>;

export const zJobComplete = z.object({
  summary: z.string().max(4000).optional(),
});
export type JobComplete = z.infer<typeof zJobComplete>;

export const zJobFail = z.object({
  reason: z.string().min(1).max(4000),
});
export type JobFail = z.infer<typeof zJobFail>;
