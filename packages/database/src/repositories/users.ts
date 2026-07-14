import { eq } from 'drizzle-orm';
import { db } from '../client';
import { users } from '../schema';
import { newId, ID_PREFIX } from '../id';

export const usersRepo = {
  async getByEmail(email: string) {
    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return rows[0] ?? null;
  },

  async get(id: string) {
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] ?? null;
  },

  /** Récupère le propriétaire existant ou le crée (mono-utilisateur V1). */
  async ensureOwner(email: string, name = 'Propriétaire') {
    const existing = await this.getByEmail(email);
    if (existing) return existing;
    const row = { id: newId(ID_PREFIX.user), email, name, role: 'owner', createdAt: Date.now() };
    await db.insert(users).values(row);
    return row;
  },
};
