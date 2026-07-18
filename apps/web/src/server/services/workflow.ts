import 'server-only';
import { workflowRepo, projectsRepo, usersRepo } from '@duo/database';
import { env } from '../env';
import {
  zStartWorkflow,
  zEventQuery,
  zExternalWorkflowEvent,
  type WorkflowState,
  type Actor,
  type ExternalWorkflowEvent,
} from '@duo/contracts';
import {
  transition,
  TERMINAL_STATES,
  DEFAULT_MAX_CYCLES,
  type WorkflowAction,
  type ControlAction,
} from '@duo/workflow-engine';
import { requireOwner, AuthError } from '../auth';

type RunRow = NonNullable<Awaited<ReturnType<typeof workflowRepo.getRun>>>;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Vérifie que le projet appartient au propriétaire courant. */
async function ensureProjectOwned(projectId: string) {
  const owner = await requireOwner();
  const project = await projectsRepo.get(owner.id, projectId);
  if (!project) throw new AuthError('Projet introuvable ou non autorisé.');
  return { owner, project };
}

/**
 * Vérifie qu'un projet existe pour le propriétaire mono-utilisateur, SANS passer par la
 * session par cookie — utilisé par le pont Worker externe, déjà authentifié par jeton
 * partagé au niveau de la route (le script bash n'a pas de cookie de navigateur).
 */
async function ensureProjectExistsForBridge(projectId: string) {
  const owner = await usersRepo.getByEmail(env.ownerEmail);
  if (!owner) throw new AuthError('Propriétaire non initialisé.');
  const project = await projectsRepo.get(owner.id, projectId);
  if (!project) throw new AuthError('Projet introuvable.');
  return project;
}

/** Vérifie qu'un run appartient (via son projet) au propriétaire courant. */
async function ensureRunOwned(runId: string) {
  const owner = await requireOwner();
  const run = await workflowRepo.getRun(runId);
  if (!run) throw new AuthError('Run introuvable.');
  const project = await projectsRepo.get(owner.id, run.projectId);
  if (!project) throw new AuthError('Run introuvable ou non autorisé.');
  return { owner, run, project };
}

/**
 * Applique une transition de la machine à états et persiste le résultat.
 * Lève une erreur si la transition est invalide (état terminal, action inconnue…).
 */
async function applyTransition(
  run: RunRow,
  action: WorkflowAction | ControlAction,
  actor: Actor,
  idempotencyKey?: string,
): Promise<RunRow> {
  const result = transition({
    state: run.state as WorkflowState,
    action,
    actor,
    context: {
      cycleCount: run.cycleCount,
      maxCycles: DEFAULT_MAX_CYCLES,
      checkpointState: (run.checkpointState as WorkflowState | null) ?? undefined,
    },
    idempotencyKey,
    lastIdempotencyKey: run.lastIdempotencyKey ?? undefined,
  });

  if (!result.ok) {
    throw new Error(result.message);
  }

  const patch: Partial<{
    state: string;
    cycleCount: number;
    checkpointState: string | null;
    lastIdempotencyKey: string | null;
    startedAt: number | null;
    pausedAt: number | null;
    endedAt: number | null;
  }> = {
    state: result.state,
    cycleCount: result.cycleCount,
    checkpointState: result.checkpointState ?? null,
  };
  if (idempotencyKey) patch.lastIdempotencyKey = idempotencyKey;
  if (!run.startedAt && result.state !== 'DRAFT') patch.startedAt = Date.now();
  if (result.state === 'PAUSED') patch.pausedAt = Date.now();
  if (run.state === 'PAUSED' && result.state !== 'PAUSED') patch.pausedAt = null;
  if (TERMINAL_STATES.has(result.state) || result.state === 'CANCELLED') {
    patch.endedAt = Date.now();
  }

  const updated = await workflowRepo.updateRun(run.id, patch);
  return updated as RunRow;
}

/** Démarre un nouveau run pour un projet : DRAFT → INGESTING → READY → ANALYZING_REQUIREMENTS. */
export async function startWorkflow(projectId: string, input: unknown) {
  await ensureProjectOwned(projectId);
  const { idempotencyKey } = zStartWorkflow.parse({
    projectId,
    ...(typeof input === 'object' && input ? input : {}),
  });

  let run: RunRow = await workflowRepo.createRun(projectId);
  await workflowRepo.appendEvent({
    runId: run.id,
    type: 'workflow.started',
    actor: 'owner',
    payload: { projectId },
  });

  run = await applyTransition(run, 'ingest', 'system', idempotencyKey);
  run = await applyTransition(run, 'ingested', 'system');
  run = await applyTransition(run, 'start', 'owner');
  // état courant : ANALYZING_REQUIREMENTS

  // Lance la simulation mock en tâche de fond : ne bloque pas la réponse HTTP.
  void runMockSimulation(run.id).catch((err) => {
    // eslint-disable-next-line no-console
    console.error(`[workflow ${run.id}] échec de la simulation`, err);
  });

  return run;
}

/** Met le run en pause (checkpoint sur l'état courant). */
export async function pauseWorkflow(runId: string) {
  const { run } = await ensureRunOwned(runId);
  const paused = await applyTransition(run, 'pause', 'owner');
  await workflowRepo.addCheckpoint(paused.id, run.state);
  await workflowRepo.appendEvent({
    runId: paused.id,
    type: 'workflow.paused',
    actor: 'owner',
    payload: { checkpointState: run.state },
  });
  return paused;
}

/** Reprend un run en pause à partir du checkpoint sauvegardé. */
export async function resumeWorkflow(runId: string) {
  const { run } = await ensureRunOwned(runId);
  const resumed = await applyTransition(run, 'resume', 'owner');
  await workflowRepo.appendEvent({
    runId: resumed.id,
    type: 'workflow.resumed',
    actor: 'owner',
    payload: { state: resumed.state },
  });
  return resumed;
}

/** Annule définitivement un run. */
export async function cancelWorkflow(runId: string) {
  const { run } = await ensureRunOwned(runId);
  const cancelled = await applyTransition(run, 'cancel', 'owner');
  await workflowRepo.appendEvent({
    runId: cancelled.id,
    type: 'workflow.failed',
    actor: 'owner',
    payload: { reason: 'cancelled', previousState: run.state },
  });
  return cancelled;
}

/** Retourne l'état courant du run, ses étapes et ses paquets de travail. */
export async function getWorkflowStatus(runId: string) {
  const { run } = await ensureRunOwned(runId);
  const [stages, workPackages] = await Promise.all([
    workflowRepo.listStages(runId),
    workflowRepo.listWorkPackages(runId),
  ]);
  return { run, stages, workPackages };
}

/** Retourne les événements survenus après un curseur `seq` donné. */
export async function getWorkflowEvents(runId: string, query: unknown) {
  await ensureRunOwned(runId);
  const { after, limit } = zEventQuery.parse(query);
  return workflowRepo.eventsAfter(runId, after, limit);
}

// ---------------------------------------------------------------------------
// Pont Worker externe (bridge léger V1.5) — ingestion d'événements réels
// ---------------------------------------------------------------------------

/**
 * Ingère un événement réel poussé par un Worker externe (script bash local
 * orchestrant Claude Builder + Codex Reviewer hors plateforme, ex. `duo-autopilot.sh`).
 *
 * Traduit chaque événement en transition de la machine à états DÉJÀ existante — aucun
 * état ni aucune transition nouvelle n'est introduit. Crée le run à la volée si aucun
 * run actif n'existe pour le projet (le pont suppose que l'ingestion/analyse des besoins
 * a déjà eu lieu en amont, côté Ubuntu).
 *
 * N'exécute et ne transmet jamais de commande shell : ne fait que persister des données
 * structurées validées par Zod (cf. docs/SECURITY-REVIEW.md — pas d'API shell arbitraire).
 */
/**
 * Traduit un événement externe en transition(s) de la machine à états, selon la phase
 * (`stage`) du script réel : `plan-N` (revue de plan), `build` (construction initiale),
 * `code-N` (revue de code par Codex), `fix-N` (corrections Claude suite à une revue de
 * code). Ne fait rien si l'état courant ne correspond à aucune transition attendue pour
 * cette phase (simple event d'activité journalisé sans changement d'état).
 */
async function applyExternalTransition(run: RunRow, parsed: ExternalWorkflowEvent): Promise<RunRow> {
  const { agent, action, stage, verdict } = parsed;

  if (stage.startsWith('plan-')) {
    if (agent === 'claude' && action === 'started' && run.state === 'ANALYZING_REQUIREMENTS') {
      return applyTransition(run, 'analyzed', 'system');
    }
    if (agent === 'claude' && action === 'completed') {
      if (run.state === 'PLANNING') return applyTransition(run, 'planned', 'builder');
      if (run.state === 'FIXING_PLAN') return applyTransition(run, 'plan_fixed', 'builder');
    }
    if (agent === 'codex' && action === 'verdict' && run.state === 'REVIEWING_PLAN') {
      return applyTransition(run, verdict === 'APPROVED' ? 'plan_approved' : 'plan_rejected', 'reviewer');
    }
    return run;
  }

  if (stage === 'build') {
    if (agent === 'claude' && action === 'started' && run.state === 'PLAN_APPROVED') {
      run = await applyTransition(run, 'packages_prepared', 'system');
      return applyTransition(run, 'built', 'builder');
    }
    if (agent === 'claude' && action === 'completed' && run.state === 'BUILDING_PACKAGE') {
      return applyTransition(run, 'tested', 'builder');
    }
    return run;
  }

  if (stage.startsWith('code-')) {
    if (agent === 'codex' && action === 'started') {
      // Les contrôles qualité (tests) tournent avant la revue Codex dans le script réel :
      // on considère TESTING_PACKAGE franchi dès que Codex démarre sa revue.
      if (run.state === 'TESTING_PACKAGE') run = await applyTransition(run, 'package_approved', 'system');
      if (run.state === 'BUILDING_PACKAGE') {
        run = await applyTransition(run, 'tested', 'system');
        run = await applyTransition(run, 'package_approved', 'system');
      }
      return run;
    }
    if (agent === 'codex' && action === 'verdict' && run.state === 'REVIEWING_PACKAGE') {
      if (verdict === 'APPROVED') {
        // Le script réel termine ici : pas d'étape distincte d'intégration/tests finaux
        // côté Ubuntu, on complète directement la chaîne jusqu'à APPROVED.
        run = await applyTransition(run, 'integrated', 'orchestrator');
        run = await applyTransition(run, 'final_tested', 'orchestrator');
        run = await applyTransition(run, 'package_approved', 'reviewer');
        return applyTransition(run, 'final_approved', 'reviewer');
      }
      return applyTransition(run, 'package_rejected', 'reviewer');
    }
    return run;
  }

  if (stage.startsWith('fix-')) {
    if (agent === 'claude' && action === 'completed' && run.state === 'FIXING_PACKAGE') {
      return applyTransition(run, 'package_fixed', 'builder');
    }
    return run;
  }

  return run;
}

export async function ingestExternalEvent(projectId: string, input: unknown) {
  // Authentification déjà vérifiée au niveau route (jeton de pont) ; on vérifie ici que le
  // projet existe bel et bien pour le propriétaire mono-utilisateur, pour éviter de créer
  // des runs orphelins sur un identifiant invalide. Pas de session par cookie ici : le
  // script bash externe s'authentifie par jeton, pas par navigateur.
  await ensureProjectExistsForBridge(projectId);
  const parsed = zExternalWorkflowEvent.parse(input);

  let run: RunRow | null = await workflowRepo.latestRunForProject(projectId);
  // BLOCKED est une limite interne de la machine à états (DEFAULT_MAX_CYCLES, distincte
  // du MAX_PLAN_CYCLES/MAX_CODE_CYCLES du script bash externe) : sans mécanisme de
  // déblocage côté pont, on démarre un nouveau run pour continuer à refléter les
  // tentatives suivantes plutôt que de rester bloqué indéfiniment côté affichage.
  if (!run || TERMINAL_STATES.has(run.state as WorkflowState) || run.state === 'BLOCKED') {
    run = await workflowRepo.createRun(projectId);
    await workflowRepo.appendEvent({
      runId: run.id,
      type: 'workflow.started',
      actor: 'system',
      payload: { source: 'external-bridge' },
    });
    run = await applyTransition(run, 'ingest', 'system');
    run = await applyTransition(run, 'ingested', 'system');
    run = await applyTransition(run, 'start', 'system');
    // état courant : ANALYZING_REQUIREMENTS
  }

  const actor: Actor = parsed.agent === 'claude' ? 'builder' : 'reviewer';
  await workflowRepo.appendEvent({
    runId: run.id,
    type: `external.${parsed.agent}.${parsed.action}`,
    actor,
    payload: { stage: parsed.stage, verdict: parsed.verdict ?? null, message: parsed.message ?? null },
  });

  return applyExternalTransition(run, parsed);
}

// ---------------------------------------------------------------------------
// Simulation mock (Mock Workflow Adapter — cahier des charges V1)
// ---------------------------------------------------------------------------

const STAGE_NAMES = ['Analyse', 'Planification', 'Construction', 'Tests', 'Review', 'Verdict'] as const;

async function emit(
  runId: string,
  type: Parameters<typeof workflowRepo.appendEvent>[0]['type'],
  actor: Actor,
  payload?: Record<string, unknown>,
) {
  return workflowRepo.appendEvent({ runId, type, actor, payload });
}

async function runStage(
  runId: string,
  name: (typeof STAGE_NAMES)[number],
  actor: Actor,
  work: () => Promise<void>,
) {
  const stage = await workflowRepo.addStage({ runId, name, status: 'active', actor });
  await emit(runId, 'stage.started', actor, { stage: name, stageId: stage.id });
  await work();
  await workflowRepo.appendEvent({
    runId,
    type: 'stage.completed',
    actor,
    payload: { stage: name, stageId: stage.id },
  });
  return stage;
}

function slug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/**
 * Simule le déroulé complet d'un run jusqu'à APPROVED : crée les étapes, les
 * paquets de travail, les événements et une review avec ses findings. Conçu
 * pour tourner de façon asynchrone après l'envoi de la réponse HTTP de démarrage.
 */
export async function runMockSimulation(runId: string): Promise<void> {
  let run: RunRow | null = await workflowRepo.getRun(runId);
  if (!run) return;

  // --- Analyse ---
  await runStage(runId, 'Analyse', 'orchestrator', async () => {
    await emit(runId, 'agent.started', 'orchestrator', { agent: 'claude', task: 'Analyse des besoins' });
    await sleep(400);
    await emit(runId, 'agent.completed', 'orchestrator', { agent: 'claude', summary: 'Besoins clarifiés.' });
  });
  run = await applyTransition(run, 'analyzed', 'orchestrator');

  // --- Planification ---
  await runStage(runId, 'Planification', 'orchestrator', async () => {
    await emit(runId, 'agent.started', 'orchestrator', { agent: 'claude', task: 'Rédaction du plan' });
    await sleep(400);
    await emit(runId, 'agent.completed', 'orchestrator', { agent: 'claude', summary: 'Plan rédigé.' });
  });
  run = await applyTransition(run, 'planned', 'orchestrator');

  // Revue du plan par Codex : approuvé directement dans la simulation mock.
  await emit(runId, 'agent.started', 'reviewer', { agent: 'codex', task: 'Revue du plan' });
  await sleep(300);
  await emit(runId, 'review.completed', 'reviewer', { target: 'plan', verdict: 'approved' });
  run = await applyTransition(run, 'plan_approved', 'reviewer');
  run = await applyTransition(run, 'packages_prepared', 'orchestrator');

  // --- Paquets de travail ---
  const packageDefs = [
    { title: 'Mise en place du schéma de données', objective: 'Créer les tables et migrations nécessaires.' },
    { title: 'Implémentation des services métier', objective: 'Ajouter la logique applicative principale.' },
    { title: 'Interface utilisateur', objective: 'Construire les écrans associés.' },
  ];
  const packages: Awaited<ReturnType<typeof workflowRepo.addWorkPackage>>[] = [];
  for (const def of packageDefs) {
    packages.push(
      await workflowRepo.addWorkPackage({
        runId,
        title: def.title,
        objective: def.objective,
        mainAgent: 'claude',
        status: 'pending',
      }),
    );
  }

  // --- Construction ---
  await runStage(runId, 'Construction', 'builder', async () => {
    for (const pkg of packages) {
      await emit(runId, 'agent.started', 'builder', { agent: 'claude', workPackageId: pkg.id, title: pkg.title });
      await sleep(300);
      await emit(runId, 'file.created', 'builder', { workPackageId: pkg.id, file: `src/${slug(pkg.title)}.ts` });
      await emit(runId, 'agent.completed', 'builder', { agent: 'claude', workPackageId: pkg.id });
    }
  });
  run = await applyTransition(run, 'built', 'builder');

  // --- Tests ---
  await runStage(runId, 'Tests', 'builder', async () => {
    await emit(runId, 'test.started', 'builder', { scope: 'unit+integration' });
    await sleep(400);
    await emit(runId, 'test.completed', 'builder', { passed: true, total: packages.length * 4 });
  });
  run = await applyTransition(run, 'tested', 'builder');

  // --- Review ---
  await runStage(runId, 'Review', 'reviewer', async () => {
    await emit(runId, 'agent.started', 'reviewer', { agent: 'codex', task: 'Revue des paquets' });
    await sleep(400);
  });
  const firstPackage = packages[0];
  if (!firstPackage) throw new Error('Aucun paquet de travail créé.');
  const review = await workflowRepo.addReview(
    firstPackage.id,
    'approved',
    "Implémentation conforme au plan, quelques points mineurs à surveiller.",
  );
  await workflowRepo.addFinding({
    reviewId: review.id,
    category: 'polish',
    severity: 'info',
    message: "Envisager d'ajouter des commentaires JSDoc sur les fonctions publiques.",
  });
  await workflowRepo.addFinding({
    reviewId: review.id,
    category: 'missing_test',
    severity: 'warning',
    message: 'Ajouter un test de cas limite pour les entrées vides.',
    file: `src/${slug(firstPackage.title)}.ts`,
  });
  await emit(runId, 'review.completed', 'reviewer', {
    target: 'package',
    workPackageId: firstPackage.id,
    verdict: 'approved',
  });
  for (const pkg of packages) {
    if (pkg.id === firstPackage.id) continue;
    await workflowRepo.addReview(pkg.id, 'approved', 'Conforme, aucune remarque bloquante.');
  }
  run = await applyTransition(run, 'package_approved', 'reviewer');

  // --- Intégration & tests finaux ---
  run = await applyTransition(run, 'integrated', 'orchestrator');
  await emit(runId, 'test.started', 'orchestrator', { scope: 'final' });
  await sleep(300);
  await emit(runId, 'test.completed', 'orchestrator', { passed: true });
  run = await applyTransition(run, 'final_tested', 'orchestrator');
  run = await applyTransition(run, 'package_approved', 'reviewer');

  // --- Verdict final ---
  await runStage(runId, 'Verdict', 'reviewer', async () => {
    await emit(runId, 'agent.started', 'reviewer', { agent: 'codex', task: 'Revue finale' });
    await sleep(300);
    await emit(runId, 'review.completed', 'reviewer', { target: 'final', verdict: 'approved' });
  });
  run = await applyTransition(run, 'final_approved', 'reviewer');

  await emit(runId, 'workflow.completed', 'system', { state: run.state });
}
