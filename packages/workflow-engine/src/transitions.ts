import type { WorkflowState } from '@duo/contracts';

/**
 * Actions du domaine qui pilotent la machine à états. Distinctes des états eux-mêmes.
 * Les actions de contrôle (pause/resume/cancel/fail/block/unblock) sont gérées à part.
 */
export type WorkflowAction =
  | 'ingest'
  | 'ingested'
  | 'start'
  | 'analyzed'
  | 'planned'
  | 'plan_approved'
  | 'plan_rejected'
  | 'plan_fixed'
  | 'packages_prepared'
  | 'built'
  | 'tested'
  | 'package_approved'
  | 'package_rejected'
  | 'package_fixed'
  | 'integrated'
  | 'final_tested'
  | 'final_approved'
  | 'final_rejected';

export type ControlAction = 'pause' | 'resume' | 'cancel' | 'fail' | 'block' | 'unblock';

/** Table des transitions du chemin métier (hors actions de contrôle). */
export const TRANSITIONS: Partial<Record<WorkflowState, Partial<Record<WorkflowAction, WorkflowState>>>> = {
  DRAFT: { ingest: 'INGESTING' },
  INGESTING: { ingested: 'READY' },
  READY: { start: 'ANALYZING_REQUIREMENTS' },
  ANALYZING_REQUIREMENTS: { analyzed: 'PLANNING' },
  PLANNING: { planned: 'REVIEWING_PLAN' },
  REVIEWING_PLAN: { plan_approved: 'PLAN_APPROVED', plan_rejected: 'FIXING_PLAN' },
  FIXING_PLAN: { plan_fixed: 'REVIEWING_PLAN' },
  PLAN_APPROVED: { packages_prepared: 'PREPARING_WORK_PACKAGES' },
  PREPARING_WORK_PACKAGES: { built: 'BUILDING_PACKAGE' },
  BUILDING_PACKAGE: { tested: 'TESTING_PACKAGE' },
  TESTING_PACKAGE: { package_approved: 'REVIEWING_PACKAGE' },
  // Codex ne modifie pas pendant une review : la review mène soit à l'intégration, soit à un fix.
  REVIEWING_PACKAGE: { integrated: 'INTEGRATING', package_rejected: 'FIXING_PACKAGE' },
  FIXING_PACKAGE: { package_fixed: 'BUILDING_PACKAGE' },
  INTEGRATING: { final_tested: 'FINAL_TESTING' },
  FINAL_TESTING: { package_approved: 'FINAL_REVIEW' },
  FINAL_REVIEW: { final_approved: 'APPROVED', final_rejected: 'FIXING_PACKAGE' },
};

/** Actions qui comptent comme un « cycle de correction » (soumises à la limite). */
export const CYCLE_ACTIONS: ReadonlySet<WorkflowAction> = new Set([
  'plan_rejected',
  'package_rejected',
  'final_rejected',
]);

/** États terminaux : aucune transition sortante. */
export const TERMINAL_STATES: ReadonlySet<WorkflowState> = new Set([
  'APPROVED',
  'CANCELLED',
  'FAILED',
]);

/** États depuis lesquels une mise en pause est permise (actifs, non terminaux, non déjà pausés). */
export function isPausable(state: WorkflowState): boolean {
  return !TERMINAL_STATES.has(state) && state !== 'PAUSED' && state !== 'DRAFT';
}
