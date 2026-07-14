import type { WorkflowState, Actor } from '@duo/contracts';
import {
  TRANSITIONS,
  CYCLE_ACTIONS,
  TERMINAL_STATES,
  isPausable,
  type WorkflowAction,
  type ControlAction,
} from './transitions';

export interface MachineContext {
  /** Nombre de cycles de correction déjà consommés. */
  cycleCount: number;
  /** Limite de cycles avant blocage automatique (anti-boucle infinie). */
  maxCycles: number;
  /** État sauvegardé lors d'une pause, requis pour `resume`. */
  checkpointState?: WorkflowState;
}

export interface TransitionInput {
  state: WorkflowState;
  action: WorkflowAction | ControlAction;
  actor: Actor;
  context: MachineContext;
  /**
   * Clé d'idempotence : si identique à la dernière transition appliquée, la transition
   * est considérée déjà effectuée (no-op) plutôt que rejouée.
   */
  idempotencyKey?: string;
  lastIdempotencyKey?: string;
}

export type TransitionResult =
  | {
      ok: true;
      state: WorkflowState;
      cycleCount: number;
      checkpointState?: WorkflowState;
      idempotent: boolean;
      note?: string;
    }
  | { ok: false; code: 'INVALID_TRANSITION'; message: string };

const CONTROL: ReadonlySet<string> = new Set([
  'pause',
  'resume',
  'cancel',
  'fail',
  'block',
  'unblock',
]);

function invalid(message: string): TransitionResult {
  return { ok: false, code: 'INVALID_TRANSITION', message };
}

/**
 * Fonction de transition PURE. Aucune I/O, aucune dépendance à la base ou au réseau.
 * Retourne le nouvel état (ou une erreur) ; la persistance est faite par l'appelant.
 */
export function transition(input: TransitionInput): TransitionResult {
  const { state, action, context, idempotencyKey, lastIdempotencyKey } = input;

  // Idempotence : rejouer la même clé ne réapplique rien.
  if (idempotencyKey && lastIdempotencyKey && idempotencyKey === lastIdempotencyKey) {
    return {
      ok: true,
      state,
      cycleCount: context.cycleCount,
      checkpointState: context.checkpointState,
      idempotent: true,
      note: 'Transition déjà appliquée (idempotent).',
    };
  }

  // Actions de contrôle.
  if (CONTROL.has(action)) {
    return control(state, action as ControlAction, context);
  }

  // États terminaux : rien ne sort.
  if (TERMINAL_STATES.has(state)) {
    return invalid(`État terminal ${state} : aucune transition possible.`);
  }

  // On ne peut pas avancer le métier depuis PAUSED/BLOCKED sans reprise/déblocage.
  if (state === 'PAUSED') return invalid('Workflow en pause : utiliser resume.');
  if (state === 'BLOCKED') return invalid('Workflow bloqué : utiliser unblock ou cancel.');

  const act = action as WorkflowAction;
  const next = TRANSITIONS[state]?.[act];
  if (!next) {
    return invalid(`Transition invalide : ${state} —(${action})→ ?`);
  }

  // Limite de cycles de correction.
  let cycleCount = context.cycleCount;
  if (CYCLE_ACTIONS.has(act)) {
    cycleCount += 1;
    if (cycleCount > context.maxCycles) {
      return {
        ok: true,
        state: 'BLOCKED',
        cycleCount,
        idempotent: false,
        note: `Limite de cycles atteinte (${context.maxCycles}). Passage en BLOCKED.`,
      };
    }
  }

  return { ok: true, state: next, cycleCount, idempotent: false };
}

function control(
  state: WorkflowState,
  action: ControlAction,
  context: MachineContext,
): TransitionResult {
  switch (action) {
    case 'pause':
      if (!isPausable(state)) return invalid(`Impossible de mettre en pause depuis ${state}.`);
      return {
        ok: true,
        state: 'PAUSED',
        cycleCount: context.cycleCount,
        checkpointState: state, // checkpoint pour la reprise
        idempotent: false,
      };
    case 'resume':
      if (state !== 'PAUSED') return invalid('Resume uniquement depuis PAUSED.');
      if (!context.checkpointState) return invalid('Aucun checkpoint pour reprendre.');
      return {
        ok: true,
        state: context.checkpointState,
        cycleCount: context.cycleCount,
        checkpointState: undefined,
        idempotent: false,
      };
    case 'unblock':
      if (state !== 'BLOCKED') return invalid('Unblock uniquement depuis BLOCKED.');
      return { ok: true, state: 'READY', cycleCount: 0, idempotent: false };
    case 'block':
      if (TERMINAL_STATES.has(state)) return invalid(`État terminal ${state}.`);
      return { ok: true, state: 'BLOCKED', cycleCount: context.cycleCount, idempotent: false };
    case 'cancel':
      if (TERMINAL_STATES.has(state)) return invalid(`État terminal ${state}.`);
      return { ok: true, state: 'CANCELLED', cycleCount: context.cycleCount, idempotent: false };
    case 'fail':
      if (TERMINAL_STATES.has(state)) return invalid(`État terminal ${state}.`);
      return { ok: true, state: 'FAILED', cycleCount: context.cycleCount, idempotent: false };
    default:
      return invalid(`Action de contrôle inconnue : ${action}`);
  }
}

/** Liste des actions métier valides depuis un état donné (utile pour l'UI). */
export function availableActions(state: WorkflowState): WorkflowAction[] {
  return Object.keys(TRANSITIONS[state] ?? {}) as WorkflowAction[];
}
