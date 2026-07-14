import { handle, ok } from '../../../../../server/http';
import { pauseWorkflow } from '../../../../../server/services/workflow';

export const dynamic = 'force-dynamic';

export function POST(_req: Request, { params }: { params: { id: string } }) {
  return handle(async () => ok({ run: await pauseWorkflow(params.id) }), 'write');
}
