#!/usr/bin/env node
/**
 * Génère le hash scrypt d'un mot de passe propriétaire, à placer dans la variable
 * d'environnement OWNER_PASSWORD_HASH (Vercel ou .env.local). Le mot de passe en clair
 * n'est jamais stocké : passez-le par une variable d'environnement, jamais en argument
 * (pour ne pas le laisser dans l'historique du shell).
 *
 * Utilisation :
 *   OWNER_PASSWORD='votre-mot-de-passe' node scripts/hash-owner-password.mjs
 *
 * Copiez la ligne OWNER_PASSWORD_HASH=... affichée dans votre configuration.
 */
import { scryptSync, randomBytes } from 'node:crypto';

const password = process.env.OWNER_PASSWORD;
if (!password || password.length < 8) {
  console.error('Erreur : définissez OWNER_PASSWORD (≥ 8 caractères).');
  console.error("Exemple : OWNER_PASSWORD='mon-mot-de-passe' node scripts/hash-owner-password.mjs");
  process.exit(1);
}

const salt = randomBytes(16);
const derived = scryptSync(password, salt, 64);
const hash = `${salt.toString('hex')}:${derived.toString('hex')}`;

console.log('\nHash généré. Ajoutez cette variable d’environnement :\n');
console.log(`OWNER_PASSWORD_HASH=${hash}\n`);
