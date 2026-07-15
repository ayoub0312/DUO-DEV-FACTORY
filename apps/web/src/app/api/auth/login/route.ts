import { cookies } from 'next/headers';
import { usersRepo } from '@duo/database';
import { handle, ok, fail } from '../../../../server/http';
import { env, authRequired, isProd } from '../../../../server/env';
import { verifyPassword } from '../../../../server/password';
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE_S } from '../../../../server/session';

export const dynamic = 'force-dynamic';

/**
 * Connexion propriétaire. Vérifie l'e-mail et le mot de passe (hash scrypt en temps
 * constant) puis ouvre une session signée (cookie httpOnly). Le mot de passe en clair
 * n'est ni stocké ni journalisé. Rate limité comme une écriture.
 */
export function POST(req: Request) {
  return handle(async (reqId) => {
    if (!authRequired) {
      return fail('VALIDATION_ERROR', "L'authentification n'est pas activée sur cette instance.", 400, reqId);
    }
    if (!env.ownerPasswordHash) {
      return fail('INTERNAL', 'Aucun mot de passe propriétaire configuré (OWNER_PASSWORD_HASH).', 500, reqId);
    }

    const body = (await req.json().catch(() => ({}))) as { email?: unknown; password?: unknown };
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!email || !password) {
      return fail('VALIDATION_ERROR', 'E-mail et mot de passe requis.', 400, reqId);
    }

    const emailOk = email === env.ownerEmail.trim().toLowerCase();
    const passwordOk = verifyPassword(password, env.ownerPasswordHash);
    // On vérifie toujours le mot de passe (même si l'e-mail ne correspond pas) pour ne pas
    // révéler par le temps de réponse lequel des deux est erroné.
    if (!emailOk || !passwordOk) {
      return fail('UNAUTHORIZED', 'Identifiants invalides.', 401, reqId);
    }

    const owner = await usersRepo.ensureOwner(env.ownerEmail, 'Propriétaire');
    const token = signSession(owner.id);
    cookies().set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_S,
    });

    return ok({ owner: { id: owner.id, email: owner.email, name: owner.name } });
  }, 'write');
}
