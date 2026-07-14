import { z } from 'zod';
import { zId, zTimestamp } from './common';

export const MessageRole = z.enum(['user', 'claude', 'codex', 'system']);
export type MessageRole = z.infer<typeof MessageRole>;

export const zMessage = z.object({
  id: zId,
  conversationId: zId,
  role: MessageRole,
  content: z.string(),
  stageId: zId.nullable().default(null),
  edited: z.boolean().default(false),
  createdAt: zTimestamp,
});
export type Message = z.infer<typeof zMessage>;

export const zPostMessage = z.object({
  content: z.string().min(1).max(20000),
  attachmentIds: z.array(zId).max(50).optional(),
});
export type PostMessage = z.infer<typeof zPostMessage>;
