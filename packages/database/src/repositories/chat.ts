import { and, asc, eq } from 'drizzle-orm';
import { db } from '../client';
import { conversations, messages } from '../schema';
import { newId, ID_PREFIX } from '../id';

export const chatRepo = {
  /** Récupère la conversation du projet ou la crée. */
  async ensureConversation(projectId: string) {
    const rows = await db
      .select()
      .from(conversations)
      .where(eq(conversations.projectId, projectId))
      .limit(1);
    if (rows[0]) return rows[0];
    const row = { id: newId(ID_PREFIX.conversation), projectId, createdAt: Date.now() };
    await db.insert(conversations).values(row);
    return row;
  },

  async listMessages(conversationId: string) {
    return db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));
  },

  async addMessage(input: {
    conversationId: string;
    role: string;
    content: string;
    stageId?: string | null;
  }) {
    const row = {
      id: newId(ID_PREFIX.message),
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      stageId: input.stageId ?? null,
      edited: false,
      createdAt: Date.now(),
    };
    await db.insert(messages).values(row);
    return row;
  },

  async editMessage(conversationId: string, id: string, content: string) {
    await db
      .update(messages)
      .set({ content, edited: true })
      .where(and(eq(messages.id, id), eq(messages.conversationId, conversationId)));
  },
};
