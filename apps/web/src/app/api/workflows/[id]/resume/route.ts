import { handle, ok } from '../../../../../server/http';
import { resumeWorkflow } from '../../../../../server/services/workflow';

export const dynamic = 'force-dynamic';

export function POST(_req: Request, { params }: { params: { id: string } }) {
  return handle(async () => ok({ run: await resumeWorkflow(params.id) }), 'write');
}
