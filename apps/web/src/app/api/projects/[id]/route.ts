import { handle, ok, fail } from '../../../../server/http';
import { getProject, updateProject, deleteProject } from '../../../../server/services/projects';

export const dynamic = 'force-dynamic';

export function GET(_req: Request, { params }: { params: { id: string } }) {
  return handle(async (reqId) => {
    const project = await getProject(params.id);
    if (!project) return fail('NOT_FOUND', 'Projet introuvable.', 404, reqId);
    return ok({ project });
  });
}

export function PATCH(req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const body = await req.json().catch(() => ({}));
    const project = await updateProject(params.id, body);
    return ok({ project });
  }, 'write');
}

export function DELETE(_req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    await deleteProject(params.id);
    return ok({ ok: true });
  }, 'write');
}
