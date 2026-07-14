import { handle, ok } from '../../../../../../server/http';
import { startWorkflow } from '../../../../../../server/services/workflow';

export const dynamic = 'force-dynamic';

export function POST(req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const body = await req.json().catch(() => ({}));
    const run = await startWorkflow(params.id, body);
    return ok({ run }, { status: 201 });
  }, 'write');
}
