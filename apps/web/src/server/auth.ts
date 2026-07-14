import 'server-only';
import { cookies } from 'next/headers';
import { usersRepo } from '@duo/database';
import { env, authRequired, assertAuthConfig } from './env';
import { SESSION_COOKIE, verifySession } from './session';

export interface OwnerUser {
  id: string;
  email: string;
  name: string;
}

export class AuthError extends Error {
  constructor(message = 'Non autorisé') {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Retourne le propriétaire courant.
 *
 * - Auth requise (production, ou hash de mot de passe configuré) : le propriétaire est
 *   déterminé par la session signée (cookie httpOnly). Absence/invalidité → AuthError.
 * - Développement local sans hash de mot de passe : propriétaire simulé auto-provisionné,
 *   pour ne pas bloquer le travail (jamais actif en production, cf. assertAuthConfig).
 */
export async function getOwner(): Promise<OwnerUser> {
  assertAuthConfig();

  if (!authRequired) {
    const owner = await usersRepo.ensureOwner(env.ownerEmail, 'Propriétaire');
    return { id: owner.id, email: owner.email, name: owner.name };
  }

  const token = cookies().get(SESSION_COOKIE)?.value;
  const ownerId = await verifySession(token);
  if (!ownerId) throw new AuthError('Session absente ou expirée.');

  const owner = await usersRepo.get(ownerId);
  if (!owner) throw new AuthError('Propriétaire introuvable.');
  return { id: owner.id, email: owner.email, name: owner.name };
}

/** Variante qui lève une AuthError si aucun propriétaire n'est disponible. */
export async function requireOwner(): Promise<OwnerUser> {
  const owner = await getOwner();
  if (!owner) throw new AuthError();
  return owner;
}
