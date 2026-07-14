import 'server-only';
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Hachage de mot de passe propriétaire avec scrypt (sel aléatoire par mot de passe).
 * Le mot de passe en clair n'est jamais stocké ni journalisé : seul le hash `sel:hash`
 * (hex) est conservé, dans la variable d'environnement OWNER_PASSWORD_HASH.
 */

const KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, KEYLEN);
  return `${salt.toString('hex')}:${derived.toString('hex')}`;
}

/** Vérifie un mot de passe contre un hash `sel:hash`, en temps constant. */
export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltHex, 'hex');
    expected = Buffer.from(hashHex, 'hex');
  } catch {
    return false;
  }
  if (expected.length === 0) return false;
  const actual = scryptSync(password, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
