import 'server-only';
import { usersRepo } from '@duo/database';
import { env, assertAuthConfig, isProd } from './env';

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
 * Retourne le propriétaire courant (V1 mono-utilisateur).
 *
 * - En développement (AUTH_DEV_MODE=true, local) : propriétaire simulé auto-provisionné.
 * - En production : le mode simulé est refusé (voir assertAuthConfig). Le branchement
 *   d'un fournisseur d'authentification mature est prévu (voir REAL-WORKFLOW-INTEGRATION-TODO).
 */
export async function getOwner(): Promise<OwnerUser> {
  assertAuthConfig();
  if (!env.authDevMode && isProd) {
    // Aucun fournisseur réel branché en V1 : refuser explicitement plutôt que d'ouvrir un accès.
    throw new AuthError('Authentification propriétaire non configurée en production.');
  }
  const owner = await usersRepo.ensureOwner(env.ownerEmail, 'Propriétaire');
  return { id: owner.id, email: owner.email, name: owner.name };
}

/** Variante qui lève une AuthError si aucun propriétaire n'est disponible. */
export async function requireOwner(): Promise<OwnerUser> {
  const owner = await getOwner();
  if (!owner) throw new AuthError();
  return owner;
}
