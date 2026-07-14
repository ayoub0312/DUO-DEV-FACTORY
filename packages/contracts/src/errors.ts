import { z } from 'zod';

/** Codes d'erreur applicatifs (voir docs/api-contracts.md §2). */
export const ErrorCode = z.enum([
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION_ERROR',
  'RATE_LIMITED',
  'WORKFLOW_NOT_READY',
  'INVALID_TRANSITION',
  'WORKER_TOKEN_INVALID',
  'IDEMPOTENCY_CONFLICT',
  'UPLOAD_REJECTED',
  'INTERNAL',
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const zApiError = z.object({
  error: z.object({
    code: ErrorCode,
    message: z.string(),
    requestId: z.string(),
  }),
});
export type ApiError = z.infer<typeof zApiError>;

/** Construit une réponse d'erreur uniforme. */
export function apiError(code: ErrorCode, message: string, requestId: string): ApiError {
  return { error: { code, message, requestId } };
}
