import { handle, ok } from '../../../../../server/http';
import { getWorkflowEvents } from '../../../../../server/services/workflow';

export const dynamic = 'force-dynamic';

export function GET(req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const url = new URL(req.url);
    const query = Object.fromEntries(url.searchParams.entries());
    return ok({ items: await getWorkflowEvents(params.id, query) });
  });
}
