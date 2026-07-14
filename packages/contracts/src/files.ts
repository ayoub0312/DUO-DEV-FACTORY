import { z } from 'zod';
import { zId, zTimestamp } from './common';

/** Formats acceptés (cahier des charges §11.1). */
export const ACCEPTED_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'text/plain',
  'text/markdown',
  'application/json',
  'application/x-yaml',
  'text/yaml',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'application/zip',
] as const;

export const FileCategory = z.enum([
  'requirements',
  'business_rules',
  'brand_asset',
  'design_reference',
  'source_archive',
  'technical_document',
  'other',
]);
export type FileCategory = z.infer<typeof FileCategory>;

export const FileStatus = z.enum(['PROCESSING', 'READY', 'ERROR']);
export type FileStatus = z.infer<typeof FileStatus>;

export const zFileMeta = z.object({
  id: zId,
  projectId: zId,
  name: z.string().min(1).max(255),
  generatedName: z.string().min(1).max(255),
  mime: z.string().min(1).max(120),
  size: z.number().int().nonnegative(),
  sha256: z.string().length(64),
  category: FileCategory,
  status: FileStatus,
  messageId: zId.nullable().default(null),
  createdAt: zTimestamp,
});
export type FileMeta = z.infer<typeof zFileMeta>;

export const zUploadResult = z.object({
  file: zFileMeta,
  extractionQueued: z.boolean(),
});
export type UploadResult = z.infer<typeof zUploadResult>;
