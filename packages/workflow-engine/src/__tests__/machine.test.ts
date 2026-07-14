import { describe, it, expect } from 'vitest';
import { transition, availableActions, DEFAULT_MAX_CYCLES } from '../index.js';
import type { MachineContext } from '../machine.js';

const ctx = (over: Partial<MachineContext> = {}): MachineContext => ({
  cycleCount: 0,
  maxCycles: DEFAULT_MAX_CYCLES,
  ...over,
});

describe('workflow machine — chemin nominal', () => {
  it('DRAFT → INGESTING → READY → ANALYZING_REQUIREMENTS', () => {
    let r = transition({ state: 'DRAFT', action: 'ingest', actor: 'system', context: ctx() });
    expect(r.ok && r.state).toBe('INGESTING');
    r = transition({ state: 'INGESTING', action: 'ingested', actor: 'system', context: ctx() });
    expect(r.ok && r.state).toBe('READY');
    r = transition({ state: 'READY', action: 'start', actor: 'owner', context: ctx() });
    expect(r.ok && r.state).toBe('ANALYZING_REQUIREMENTS');
  });

  it('parcours complet jusqu à APPROVED', () => {
    const path: Array<[Parameters<typeof transition>[0]['state'], Parameters<typeof transition>[0]['action'], string]> = [
      ['ANALYZING_REQUIREMENTS', 'analyzed', 'PLANNING'],
      ['PLANNING', 'planned', 'REVIEWING_PLAN'],
      ['REVIEWING_PLAN', 'plan_approved', 'PLAN_APPROVED'],
      ['PLAN_APPROVED', 'packages_prepared', 'PREPARING_WORK_PACKAGES'],
      ['PREPARING_WORK_PACKAGES', 'built', 'BUILDING_PACKAGE'],
      ['BUILDING_PACKAGE', 'tested', 'TESTING_PACKAGE'],
      ['TESTING_PACKAGE', 'package_approved', 'REVIEWING_PACKAGE'],
      ['REVIEWING_PACKAGE', 'integrated', 'INTEGRATING'],
      ['INTEGRATING', 'final_tested', 'FINAL_TESTING'],
      ['FINAL_TESTING', 'package_approved', 'FINAL_REVIEW'],
      ['FINAL_REVIEW', 'final_approved', 'APPROVED'],
    ];
    for (const [state, action, expected] of path) {
      const r = transition({ state, action, actor: 'orchestrator', context: ctx() });
      expect(r.ok, `${state} -(${action})-> attendu ${expected}`).toBe(true);
      expect(r.ok && r.state).toBe(expected);
    }
  });
});

describe('transitions invalides', () => {
  it('refuse une action non prévue', () => {
    const r = transition({ state: 'READY', action: 'planned', actor: 'system', context: ctx() });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.code).toBe('INVALID_TRANSITION');
  });

  it('aucune sortie depuis un état terminal', () => {
    const r = transition({ state: 'APPROVED', action: 'start', actor: 'owner', context: ctx() });
    expect(r.ok).toBe(false);
  });
});

describe('pause / reprise', () => {
  it('pause depuis un état actif puis resume revient au checkpoint', () => {
    const paused = transition({
      state: 'BUILDING_PACKAGE',
      action: 'pause',
      actor: 'owner',
      context: ctx(),
    });
    expect(paused.ok && paused.state).toBe('PAUSED');
    expect(paused.ok && paused.checkpointState).toBe('BUILDING_PACKAGE');

    const resumed = transition({
      state: 'PAUSED',
      action: 'resume',
      actor: 'owner',
      context: ctx({ checkpointState: 'BUILDING_PACKAGE' }),
    });
    expect(resumed.ok && resumed.state).toBe('BUILDING_PACKAGE');
  });

  it('resume sans checkpoint échoue', () => {
    const r = transition({ state: 'PAUSED', action: 'resume', actor: 'owner', context: ctx() });
    expect(r.ok).toBe(false);
  });
});

describe('limite de cycles', () => {
  it('passe en BLOCKED quand la limite de corrections est dépassée', () => {
    const r = transition({
      state: 'REVIEWING_PLAN',
      action: 'plan_rejected',
      actor: 'reviewer',
      context: ctx({ cycleCount: DEFAULT_MAX_CYCLES }),
    });
    expect(r.ok && r.state).toBe('BLOCKED');
  });

  it('reste dans la boucle sous la limite', () => {
    const r = transition({
      state: 'REVIEWING_PLAN',
      action: 'plan_rejected',
      actor: 'reviewer',
      context: ctx({ cycleCount: 0 }),
    });
    expect(r.ok && r.state).toBe('FIXING_PLAN');
    expect(r.ok && r.cycleCount).toBe(1);
  });
});

describe('idempotence', () => {
  it('rejouer la même clé ne change pas l état', () => {
    const r = transition({
      state: 'READY',
      action: 'start',
      actor: 'owner',
      context: ctx(),
      idempotencyKey: 'k1',
      lastIdempotencyKey: 'k1',
    });
    expect(r.ok && r.idempotent).toBe(true);
    expect(r.ok && r.state).toBe('READY');
  });
});

describe('availableActions', () => {
  it('expose les actions valides pour l UI', () => {
    expect(availableActions('REVIEWING_PLAN').sort()).toEqual(['plan_approved', 'plan_rejected']);
  });
});
