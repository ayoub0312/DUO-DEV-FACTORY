/**
 * Allowlist des actions autorisées pour un Worker (cahier §15.2).
 * Le navigateur ne transmet JAMAIS de commande shell arbitraire. Le Worker n'exécute
 * que des actions figurant dans cette liste, avec des limites de durée et de taille.
 */
export const ALLOWED_WORKER_ACTIONS = [
  'plan',
  'build_package',
  'run_tests',
  'review',
  'git_status',
  'git_diff',
  'preview_start',
  'preview_stop',
] as const;

export type WorkerAction = (typeof ALLOWED_WORKER_ACTIONS)[number];

export function isAllowedAction(action: string): action is WorkerAction {
  return (ALLOWED_WORKER_ACTIONS as readonly string[]).includes(action);
}

export const WORKER_LIMITS = {
  maxActionDurationMs: 15 * 60 * 1000,
  maxArtifactBytes: 50 * 1024 * 1024,
  maxEventsPerBatch: 500,
} as const;
