import 'server-only';
import { createHash } from 'node:crypto';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { env } from '../env';

export interface StorageAdapter {
  put(key: string, data: Buffer): Promise<string>;
  get(key: string): Promise<Buffer>;
  del(key: string): Promise<void>;
}

const STORAGE_DIR = resolve(process.cwd(), env.storageDir ?? '.data/storage');

export class LocalStorageAdapter implements StorageAdapter {
  async put(key: string, data: Buffer): Promise<string> {
    const dir = join(STORAGE_DIR, key.substring(0, 2));
    await mkdir(dir, { recursive: true });
    const path = join(dir, key);
    await writeFile(path, data);
    return key;
  }

  async get(key: string): Promise<Buffer> {
    const path = join(STORAGE_DIR, key.substring(0, 2), key);
    return readFile(path);
  }

  async del(key: string): Promise<void> {
    const path = join(STORAGE_DIR, key.substring(0, 2), key);
    await unlink(path).catch(() => {});
  }
}

export function sha256(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

let _storage: StorageAdapter | null = null;
export function getStorage(): StorageAdapter {
  if (!_storage) {
    _storage = new LocalStorageAdapter();
  }
  return _storage;
}
