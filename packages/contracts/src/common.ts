import { z } from 'zod';

/** Identifiant opaque (ULID/UUID). Jamais un entier auto-incrémenté exposé. */
export const zId = z.string().min(1).max(64);

export const zTimestamp = z.number().int().nonnegative();

export const zPagination = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});
export type Pagination = z.infer<typeof zPagination>;

export const zPaginated = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
  });
