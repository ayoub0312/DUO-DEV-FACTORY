import { timingSafeEqual } from 'node:crypto';
import { handle, ok, fail } from '../../../../../../server/http';
import { ingestExternalEvent } from '../../../../../../server/services/workflow';
import { env } from '../../../../../../server/env';

export const dynamic = 'force-dynamic';

/**
 * Vérifie le jeton de pont Worker externe (en-tête `Authorization: Bearer <token>`)
 * en comparaison à temps constant. Refuse tout si le pont est désactivé ou le jeton
 * absent de la configuration (`WORKER_BRIDGE_ENABLED` / `WORKER_BRIDGE_TOKEN`).
 */
function checkBridgeAuth(req: Request): boolean {
  if (!env.workerBridgeEnabled || !env.workerBridgeToken) return false;
  const header = req.headers.get('authorization') ?? '';
  const match = /^Bearer (.+)$/.exec(header);
  if (!match) return false;
  const provided = Buffer.from(match[1]!);
  const expected = Buffer.from(env.workerBridgeToken);
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

/**
 * Ingestion d'événements réels d'un Worker externe (ex. script bash local orchestrant
 * Claude Builder + Codex Reviewer). Ne fait que persister des données structurées
 * validées par Zod — n'exécute jamais de commande transmise par l'appelant.
 */
export function POST(req: Request, { params }: { params: { id: string } }) {
  return handle(async (reqId) => {
    if (!checkBridgeAuth(req)) {
      return fail('WORKER_TOKEN_INVALID', 'Jeton de pont Worker invalide ou pont désactivé.', 401, reqId);
    }
    const body = await req.json().catch(() => ({}));
    const run = await ingestExternalEvent(params.id, body);
    return ok({ run });
  }, 'write');
}
