import { z } from 'zod';
import { zId, zTimestamp } from './common';

export const ProjectStatus = z.enum(['active', 'blocked', 'archived']);
export type ProjectStatus = z.infer<typeof ProjectStatus>;

export const AutonomyLevel = z.enum(['guided', 'balanced', 'autonomous']);
export type AutonomyLevel = z.infer<typeof AutonomyLevel>;

export const zProject = z.object({
  id: zId,
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(140),
  type: z.string().min(1).max(60),
  description: z.string().max(4000).default(''),
  tech: z.array(z.string().max(40)).default([]),
  autonomyLevel: AutonomyLevel.default('balanced'),
  status: ProjectStatus.default('active'),
  createdAt: zTimestamp,
  updatedAt: zTimestamp,
});
export type Project = z.infer<typeof zProject>;

export const zCreateProject = z.object({
  name: z.string().min(1).max(120),
  type: z.string().min(1).max(60),
  description: z.string().max(4000).optional(),
  tech: z.array(z.string().max(40)).max(30).optional(),
  autonomyLevel: AutonomyLevel.optional(),
});
export type CreateProject = z.infer<typeof zCreateProject>;

export const zUpdateProject = zCreateProject.partial().extend({
  status: ProjectStatus.optional(),
});
export type UpdateProject = z.infer<typeof zUpdateProject>;
