import 'server-only';
import { redirect } from 'next/navigation';
import { getOwner, AuthError, type OwnerUser } from './auth';

/**
 * Garde d'accès pour les pages serveur : retourne le propriétaire courant, ou redirige
 * vers /login si la session est absente/expirée. À appeler en tête de chaque page
 * protégée. La sécurité réelle des données est assurée en profondeur par requireOwner()
 * dans chaque service (les API renvoient 401 indépendamment de ce garde).
 */
export async function requirePageOwner(nextPath?: string): Promise<OwnerUser> {
  try {
    return await getOwner();
  } catch (err) {
    if (err instanceof AuthError) {
      redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : '/login');
    }
    throw err;
  }
}
