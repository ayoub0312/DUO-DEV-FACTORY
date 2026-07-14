import { handle, ok, fail } from '../../../../../server/http';
import { listFiles, uploadFiles } from '../../../../../server/services/files';

export const dynamic = 'force-dynamic';

export function GET(_req: Request, { params }: { params: { id: string } }) {
  return handle(async (reqId) => {
    try {
      const files = await listFiles(params.id);
      return ok({ items: files });
    } catch {
      return fail('NOT_FOUND', 'Projet introuvable.', 404, reqId);
    }
  });
}

export function POST(req: Request, { params }: { params: { id: string } }) {
  return handle(async (reqId) => {
    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return fail('VALIDATION_ERROR', 'Corps multipart attendu.', 400, reqId);
    }
    try {
      const results = await uploadFiles(params.id, formData);
      const errors = results.filter((r) => r.error);
      if (errors.length === results.length) {
        return fail('UPLOAD_REJECTED', errors[0]?.error ?? 'Upload refusé.', 400, reqId);
      }
      return ok({ files: results.filter((r) => r.file).map((r) => r.file), errors: errors.map((r) => r.error) }, { status: 201 });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload échoué.';
      return fail('UPLOAD_REJECTED', message, 400, reqId);
    }
  }, 'upload');
}
