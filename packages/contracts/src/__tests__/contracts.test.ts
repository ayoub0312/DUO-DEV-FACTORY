import { describe, it, expect } from 'vitest';
import { WorkflowState, EventType, zCreateProject, zApiError, apiError } from '../index';

describe('contracts — workflow', () => {
  it('contient les 21 états', () => {
    expect(WorkflowState.options).toHaveLength(21);
    expect(WorkflowState.options).toContain('APPROVED');
    expect(WorkflowState.options).toContain('BLOCKED');
  });

  it('contient les 16 types d événements', () => {
    expect(EventType.options).toHaveLength(16);
    expect(EventType.options).toContain('workflow.started');
    expect(EventType.options).toContain('checkpoint.created');
  });
});

describe('contracts — projets', () => {
  it('accepte un projet valide', () => {
    const r = zCreateProject.safeParse({ name: 'Mon Projet', type: 'web' });
    expect(r.success).toBe(true);
  });

  it('refuse un nom vide', () => {
    const r = zCreateProject.safeParse({ name: '', type: 'web' });
    expect(r.success).toBe(false);
  });
});

describe('contracts — erreurs', () => {
  it('produit une erreur structurée valide', () => {
    const e = apiError('WORKFLOW_NOT_READY', 'pas prêt', 'req_1');
    expect(zApiError.safeParse(e).success).toBe(true);
    expect(e.error.code).toBe('WORKFLOW_NOT_READY');
  });
});
