import { handle, ok } from '../../../../../server/http';
import { listMessages, addMessage } from '../../../../../server/services/chat';

export const dynamic = 'force-dynamic';

export function GET(_req: Request, { params }: { params: { id: string } }) {
  return handle(async () => ok({ items: await listMessages(params.id) }));
}

export function POST(req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const body = await req.json().catch(() => ({}));
    const message = await addMessage(params.id, body);
    return ok({ message }, { status: 201 });
  }, 'write');
}
