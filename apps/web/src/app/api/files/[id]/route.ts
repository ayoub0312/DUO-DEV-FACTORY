import { handle, ok, fail } from '../../../../server/http';
import { getFile, deleteFile } from '../../../../server/services/files';

export const dynamic = 'force-dynamic';

export function GET(_req: Request, { params }: { params: { id: string } }) {
  return handle(async (reqId) => {
    const file = await getFile(params.id);
    if (!file) return fail('NOT_FOUND', 'Fichier introuvable.', 404, reqId);
    return ok({ file });
  });
}

export function DELETE(_req: Request, { params }: { params: { id: string } }) {
  return handle(async (reqId) => {
    const file = await getFile(params.id);
    if (!file) return fail('NOT_FOUND', 'Fichier introuvable.', 404, reqId);
    await deleteFile(file.projectId, params.id);
    return ok({ ok: true });
  }, 'write');
}
