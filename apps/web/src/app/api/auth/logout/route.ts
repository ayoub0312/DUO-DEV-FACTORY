import { cookies } from 'next/headers';
import { handle, ok } from '../../../../server/http';
import { SESSION_COOKIE } from '../../../../server/session';

export const dynamic = 'force-dynamic';

/** Déconnexion : supprime le cookie de session. */
export function POST() {
  return handle(async () => {
    cookies().delete(SESSION_COOKIE);
    return ok({ ok: true });
  }, 'write');
}
