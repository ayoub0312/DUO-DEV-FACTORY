/** Métadonnées d'affichage des états de workflow et statuts projet (design-system §6). */
export type Tone = 'builder' | 'reviewer' | 'success' | 'warning' | 'danger' | 'muted';

export const TONE_DOT: Record<Tone, string> = {
  builder: 'bg-accent-builder',
  reviewer: 'bg-accent-reviewer',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  muted: 'bg-text-muted',
};

export function stateTone(state: string): Tone {
  if (['APPROVED'].includes(state)) return 'success';
  if (['BLOCKED'].includes(state)) return 'warning';
  if (['FAILED', 'CANCELLED'].includes(state)) return 'danger';
  if (['PAUSED', 'DRAFT', 'READY', 'INGESTING'].includes(state)) return 'muted';
  if (state.includes('REVIEW')) return 'reviewer';
  return 'builder';
}

export function stateLabel(state: string): string {
  const map: Record<string, string> = {
    DRAFT: 'Brouillon',
    INGESTING: 'Ingestion',
    READY: 'Prêt',
    ANALYZING_REQUIREMENTS: 'Analyse du besoin',
    PLANNING: 'Planification',
    REVIEWING_PLAN: 'Review du plan',
    FIXING_PLAN: 'Correction du plan',
    PLAN_APPROVED: 'Plan approuvé',
    PREPARING_WORK_PACKAGES: 'Préparation des lots',
    BUILDING_PACKAGE: 'Construction',
    TESTING_PACKAGE: 'Tests',
    REVIEWING_PACKAGE: 'Review du lot',
    FIXING_PACKAGE: 'Correction du lot',
    INTEGRATING: 'Intégration',
    FINAL_TESTING: 'Tests finaux',
    FINAL_REVIEW: 'Review finale',
    APPROVED: 'Approuvé',
    BLOCKED: 'Bloqué',
    PAUSED: 'En pause',
    CANCELLED: 'Annulé',
    FAILED: 'Échec',
  };
  return map[state] ?? state;
}

export function statusTone(status: string): Tone {
  if (status === 'blocked') return 'warning';
  if (status === 'archived') return 'muted';
  return 'builder';
}
