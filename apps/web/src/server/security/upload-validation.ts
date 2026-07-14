import 'server-only';
import { ACCEPTED_MIME } from '@duo/contracts';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_FILES_PER_UPLOAD = 20;

const MIME_SIGNATURES: Array<{ mime: string; magic: number[] }> = [
  { mime: 'application/pdf', magic: [0x25, 0x50, 0x44, 0x46] },
  { mime: 'image/png', magic: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/jpeg', magic: [0xff, 0xd8, 0xff] },
  { mime: 'image/webp', magic: [0x52, 0x49, 0x46, 0x46] },
  { mime: 'application/zip', magic: [0x50, 0x4b, 0x03, 0x04] },
];

export interface UploadValidationResult {
  ok: boolean;
  error?: string;
}

export function validateFileName(name: string): UploadValidationResult {
  if (!name || name.length > 255) {
    return { ok: false, error: 'Nom de fichier invalide.' };
  }
  if (/[<>:"|?*\x00-\x1f]/.test(name)) {
    return { ok: false, error: 'Caractères non autorisés dans le nom.' };
  }
  if (name.includes('..') || name.startsWith('/') || name.startsWith('\\')) {
    return { ok: false, error: 'Path traversal détecté.' };
  }
  return { ok: true };
}

export function validateMime(declared: string, data: Buffer): UploadValidationResult {
  const accepted = ACCEPTED_MIME as readonly string[];
  if (!accepted.includes(declared)) {
    return { ok: false, error: `Type MIME non accepté : ${declared}` };
  }
  for (const sig of MIME_SIGNATURES) {
    if (sig.mime === declared) {
      const match = sig.magic.every((b, i) => data[i] === b);
      if (!match) {
        return { ok: false, error: `Signature de fichier invalide pour ${declared}.` };
      }
    }
  }
  return { ok: true };
}

export function validateSize(size: number): UploadValidationResult {
  if (size <= 0) return { ok: false, error: 'Fichier vide.' };
  if (size > MAX_FILE_SIZE) {
    return { ok: false, error: `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024} Mo).` };
  }
  return { ok: true };
}

export function validateUploadCount(count: number): UploadValidationResult {
  if (count > MAX_FILES_PER_UPLOAD) {
    return { ok: false, error: `Trop de fichiers (max ${MAX_FILES_PER_UPLOAD}).` };
  }
  return { ok: true };
}

export function classifyFile(mime: string, name: string): string {
  if (mime === 'application/pdf' || mime.includes('wordprocessing')) {
    if (name.toLowerCase().includes('cahier') || name.toLowerCase().includes('spec')) {
      return 'requirements';
    }
    return 'business_rules';
  }
  if (mime.startsWith('image/')) {
    if (name.toLowerCase().includes('logo') || name.toLowerCase().includes('brand')) {
      return 'brand_asset';
    }
    if (name.toLowerCase().includes('maquette') || name.toLowerCase().includes('mock') || name.toLowerCase().includes('design')) {
      return 'design_reference';
    }
    return 'design_reference';
  }
  if (mime === 'application/zip') return 'source_archive';
  if (mime === 'text/markdown' || mime === 'text/plain') return 'requirements';
  if (mime === 'application/json' || mime.includes('yaml') || mime === 'text/csv') return 'technical_document';
  return 'other';
}
