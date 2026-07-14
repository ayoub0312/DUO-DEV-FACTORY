import { handle, ok } from '../../../../server/http';
import { getWorkflowStatus } from '../../../../server/services/workflow';

export const dynamic = 'force-dynamic';

export function GET(_req: Request, { params }: { params: { id: string } }) {
  return handle(async () => ok(await getWorkflowStatus(params.id)));
}
