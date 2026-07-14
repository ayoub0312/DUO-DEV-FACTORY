import { randomUUID } from 'node:crypto';

/**
 * Identifiant opaque préfixé : `<prefix>_<uuid sans tirets>`.
 * Ex. `prj_3f2a...`. Jamais d'entier auto-incrémenté exposé.
 */
export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '')}`;
}

export const ID_PREFIX = {
  user: 'usr',
  session: 'ses',
  project: 'prj',
  member: 'mbr',
  file: 'fil',
  extraction: 'ext',
  conversation: 'cnv',
  message: 'msg',
  run: 'run',
  stage: 'stg',
  workPackage: 'wpk',
  agentSession: 'ags',
  event: 'evt',
  checkpoint: 'ckp',
  worker: 'wkr',
  heartbeat: 'hbt',
  job: 'job',
  review: 'rev',
  finding: 'fnd',
  gateRun: 'qgr',
  gateResult: 'qgs',
  artifact: 'art',
  approval: 'apr',
  audit: 'aud',
  secret: 'sec',
} as const;
