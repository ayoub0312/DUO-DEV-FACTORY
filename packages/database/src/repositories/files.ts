import { and, desc, eq } from 'drizzle-orm';
import { db } from '../client';
import { projectFiles, fileExtractions } from '../schema';
import { newId, ID_PREFIX } from '../id';

export const filesRepo = {
  async list(projectId: string) {
    return db
      .select()
      .from(projectFiles)
      .where(eq(projectFiles.projectId, projectId))
      .orderBy(desc(projectFiles.createdAt));
  },

  async get(id: string) {
    const rows = await db.select().from(projectFiles).where(eq(projectFiles.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async create(input: {
    projectId: string;
    name: string;
    generatedName: string;
    mime: string;
    size: number;
    sha256: string;
    category: string;
    status?: string;
    messageId?: string | null;
  }) {
    const row = {
      id: newId(ID_PREFIX.file),
      projectId: input.projectId,
      name: input.name,
      generatedName: input.generatedName,
      mime: input.mime,
      size: input.size,
      sha256: input.sha256,
      category: input.category,
      status: input.status ?? 'PROCESSING',
      messageId: input.messageId ?? null,
      createdAt: Date.now(),
    };
    await db.insert(projectFiles).values(row);
    return row;
  },

  async setStatus(id: string, status: string) {
    await db.update(projectFiles).set({ status }).where(eq(projectFiles.id, id));
  },

  async addExtraction(input: {
    fileId: string;
    kind: string;
    contentRef?: string | null;
    meta?: Record<string, unknown> | null;
  }) {
    const row = {
      id: newId(ID_PREFIX.extraction),
      fileId: input.fileId,
      kind: input.kind,
      contentRef: input.contentRef ?? null,
      meta: input.meta ?? null,
      createdAt: Date.now(),
    };
    await db.insert(fileExtractions).values(row);
    return row;
  },

  async extractionsFor(fileId: string) {
    return db.select().from(fileExtractions).where(eq(fileExtractions.fileId, fileId));
  },

  async remove(projectId: string, id: string) {
    await db
      .delete(projectFiles)
      .where(and(eq(projectFiles.id, id), eq(projectFiles.projectId, projectId)));
  },
};
