import { handle, ok } from '../../../server/http';
import { listProjects, createProject } from '../../../server/services/projects';

export const dynamic = 'force-dynamic';

export function GET() {
  return handle(async () => ok({ items: await listProjects() }));
}

export function POST(req: Request) {
  return handle(async () => {
    const body = await req.json().catch(() => ({}));
    const project = await createProject(body);
    return ok({ project }, { status: 201 });
  }, 'write');
}
