import 'server-only';
import { filesRepo } from '@duo/database';
import { requireOwner } from '../auth';
import { getProject } from './projects';
import { getStorage, sha256 } from '../storage/adapter';
import {
  validateFileName,
  validateMime,
  validateSize,
  validateUploadCount,
  classifyFile,
} from '../security/upload-validation';
import { newId, ID_PREFIX } from '@duo/database';

export async function listFiles(projectId: string) {
  await requireOwner();
  const project = await getProject(projectId);
  if (!project) throw new Error('Projet introuvable.');
  return filesRepo.list(projectId);
}

export async function getFile(fileId: string) {
  await requireOwner();
  const file = await filesRepo.get(fileId);
  if (!file) return null;
  const extractions = await filesRepo.extractionsFor(fileId);
  return { ...file, extractions };
}

export async function uploadFiles(projectId: string, formData: FormData) {
  await requireOwner();
  const project = await getProject(projectId);
  if (!project) throw new Error('Projet introuvable.');

  const files = formData.getAll('files') as File[];
  const countCheck = validateUploadCount(files.length);
  if (!countCheck.ok) throw new Error(countCheck.error);

  const storage = getStorage();
  const results: Array<{ file: Awaited<ReturnType<typeof filesRepo.create>>; error?: string }> = [];

  for (const file of files) {
    const nameCheck = validateFileName(file.name);
    if (!nameCheck.ok) {
      results.push({ file: null as never, error: nameCheck.error });
      continue;
    }

    const sizeCheck = validateSize(file.size);
    if (!sizeCheck.ok) {
      results.push({ file: null as never, error: sizeCheck.error });
      continue;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeCheck = validateMime(file.type, buffer);
    if (!mimeCheck.ok) {
      results.push({ file: null as never, error: mimeCheck.error });
      continue;
    }

    const hash = sha256(buffer);
    const generatedName = `${newId(ID_PREFIX.file)}-${file.name}`;
    const category = classifyFile(file.type, file.name);

    await storage.put(generatedName, buffer);

    const record = await filesRepo.create({
      projectId,
      name: file.name,
      generatedName,
      mime: file.type,
      size: file.size,
      sha256: hash,
      category,
      status: 'READY',
    });

    await filesRepo.addExtraction({
      fileId: record.id,
      kind: 'text',
      contentRef: null,
      meta: { originalName: file.name, size: file.size },
    });

    results.push({ file: record });
  }

  return results;
}

export async function deleteFile(projectId: string, fileId: string) {
  await requireOwner();
  await filesRepo.remove(projectId, fileId);
}
