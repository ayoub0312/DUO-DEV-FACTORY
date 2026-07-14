import { z } from 'zod';
import { zId } from './common';
import { Actor } from './workflow';

/** Types d'événements minimum (cahier des charges §16). */
export const EventType = z.enum([
  'workflow.started',
  'workflow.paused',
  'workflow.resumed',
  'workflow.completed',
  'workflow.failed',
  'stage.started',
  'stage.completed',
  'agent.started',
  'agent.message',
  'agent.completed',
  'file.created',
  'file.modified',
  'test.started',
  'test.completed',
  'review.completed',
  'checkpoint.created',
]);
export type EventType = z.infer<typeof EventType>;

export const zWorkflowEvent = z.object({
  id: zId,
  runId: zId,
  type: EventType,
  actor: Actor,
  /** Curseur monotone append-only pour le polling (docs/architecture.md §4.3). */
  seq: z.number().int().nonnegative(),
  payload: z.record(z.unknown()).default({}),
  createdAt: z.number().int(),
});
export type WorkflowEvent = z.infer<typeof zWorkflowEvent>;

/** Requête de flux d'événements : GET /api/workflows/:id/events?after=<seq> */
export const zEventQuery = z.object({
  after: z.coerce.number().int().nonnegative().default(0),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});
export type EventQuery = z.infer<typeof zEventQuery>;
