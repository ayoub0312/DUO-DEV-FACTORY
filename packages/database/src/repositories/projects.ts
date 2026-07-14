import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../client';
import { projects } from '../schema';
import { newId, ID_PREFIX } from '../id';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 120);
}

export interface CreateProjectInput {
  ownerId: string;
  name: string;
  type?: string;
  description?: string;
  tech?: string[];
  autonomyLevel?: string;
}

export const projectsRepo = {
  async list(ownerId: string) {
    return db
      .select()
      .from(projects)
      .where(and(eq(projects.ownerId, ownerId), isNull(projects.deletedAt)))
      .orderBy(desc(projects.updatedAt));
  },

  async get(ownerId: string, id: string) {
    const rows = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.ownerId, ownerId), isNull(projects.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  },

  async create(input: CreateProjectInput) {
    const id = newId(ID_PREFIX.project);
    const ts = Date.now();
    const row = {
      id,
      ownerId: input.ownerId,
      name: input.name,
      slug: slugify(input.name),
      type: input.type ?? 'web',
      description: input.description ?? '',
      tech: input.tech ?? [],
      autonomyLevel: input.autonomyLevel ?? 'balanced',
      status: 'active',
      createdAt: ts,
      updatedAt: ts,
    };
    await db.insert(projects).values(row);
    return row;
  },

  async update(
    ownerId: string,
    id: string,
    patch: Partial<{ name: string; description: string; tech: string[]; status: string; type: string; autonomyLevel: string }>,
  ) {
    await db
      .update(projects)
      .set({ ...patch, updatedAt: Date.now() })
      .where(and(eq(projects.id, id), eq(projects.ownerId, ownerId)));
    return this.get(ownerId, id);
  },

  /** Suppression LOGIQUE (cahier §14.1). */
  async softDelete(ownerId: string, id: string) {
    await db
      .update(projects)
      .set({ deletedAt: Date.now(), status: 'archived' })
      .where(and(eq(projects.id, id), eq(projects.ownerId, ownerId)));
  },
};
