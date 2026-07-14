/**
 * Seed de démonstration — données CLAIREMENT FICTIVES (cahier §7 « Données de démonstration »).
 * 4 projets : Restaurant Maison Azur, Plateforme Hôtel Palmes d'Or, CRM commercial,
 * Application Gift Platform — chacun avec conversation, messages, fichiers, run de workflow,
 * étapes, événements, lots, reviews, findings et verdicts, dans des états variés.
 *
 * Idempotent : vide les tables de démo puis réinsère. Exécution : `npm run db:seed`
 * (après `npm run db:migrate`).
 */
import { db } from './client';
import * as t from './schema';
import { newId, ID_PREFIX } from './id';

const OWNER_EMAIL = process.env.OWNER_EMAIL ?? 'owner@duo.local';

async function reset() {
  const order = [
    t.reviewFindings, t.reviews, t.qualityGateResults, t.qualityGateRuns,
    t.agentEvents, t.checkpoints, t.workPackages, t.agentSessions, t.workflowStages,
    t.artifacts, t.approvals, t.jobs, t.workerHeartbeats, t.workers,
    t.messages, t.conversations, t.fileExtractions, t.projectFiles,
    t.workflowRuns, t.projectMembers, t.projects, t.secretReferences, t.auditLogs,
    t.sessions, t.users,
  ];
  for (const table of order) {
    await db.delete(table);
  }
}

type Scenario = {
  name: string;
  type: string;
  tech: string[];
  description: string;
  state: string;
  requirement: string;
  plan: string;
  review: string;
  files: Array<{ name: string; mime: string; category: string; size: number }>;
  packages: Array<{ title: string; objective: string; status: string; verdict: string | null }>;
  findings: Array<{ category: string; severity: string; message: string }>;
  verdict: string;
};

const SCENARIOS: Scenario[] = [
  {
    name: 'Restaurant Maison Azur',
    type: 'web',
    tech: ['next', 'tailwind', 'libsql'],
    description: 'Site vitrine + réservation en ligne pour un restaurant méditerranéen.',
    state: 'APPROVED',
    requirement: 'Je veux un site avec menu, galerie, et un formulaire de réservation par créneaux.',
    plan: 'Plan : pages Accueil/Menu/Galerie/Réservation, modèle de créneaux, confirmation e-mail. 3 lots.',
    review: 'Review Codex : structure claire, accessibilité AA respectée. Aucun blocker. Verdict : approuvé.',
    files: [
      { name: 'cahier-des-charges.pdf', mime: 'application/pdf', category: 'requirements', size: 184320 },
      { name: 'logo-azur.svg', mime: 'image/svg+xml', category: 'brand_asset', size: 8210 },
      { name: 'maquette-accueil.png', mime: 'image/png', category: 'design_reference', size: 542000 },
    ],
    packages: [
      { title: 'Fondations & pages', objective: 'Layout, menu, galerie', status: 'done', verdict: 'approved' },
      { title: 'Réservation', objective: 'Créneaux + confirmation', status: 'done', verdict: 'approved' },
    ],
    findings: [
      { category: 'polish', severity: 'info', message: 'Ajouter un état vide sur la galerie.' },
      { category: 'innovation', severity: 'info', message: 'Suggestion : plan interactif des tables.' },
    ],
    verdict: 'APPROVED',
  },
  {
    name: "Plateforme Hôtel Palmes d’Or",
    type: 'web',
    tech: ['next', 'drizzle', 'blob'],
    description: 'Plateforme de réservation multi-chambres avec tarifs saisonniers.',
    state: 'REVIEWING_PACKAGE',
    requirement: 'Réservation de chambres, calendrier de disponibilité, tarifs par saison, back-office.',
    plan: 'Plan : catalogue chambres, moteur de disponibilité, panier, back-office tarifs. 5 lots.',
    review: "Review Codex en cours sur le lot « moteur de disponibilité ».",
    files: [
      { name: 'specs-tarifs.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', category: 'business_rules', size: 96500 },
      { name: 'chambres.csv', mime: 'text/csv', category: 'technical_document', size: 4200 },
    ],
    packages: [
      { title: 'Catalogue chambres', objective: 'Liste + détail', status: 'done', verdict: 'approved' },
      { title: 'Moteur de disponibilité', objective: 'Calendrier + règles', status: 'reviewing', verdict: null },
    ],
    findings: [
      { category: 'required_fix', severity: 'high', message: 'Gérer le chevauchement de réservations.' },
      { category: 'missing_test', severity: 'medium', message: 'Ajouter un test sur les tarifs de haute saison.' },
    ],
    verdict: 'REVIEWING_PACKAGE',
  },
  {
    name: 'CRM commercial',
    type: 'saas',
    tech: ['next', 'libsql', 'auth'],
    description: "CRM léger : contacts, pipeline d’affaires, activités et rapports.",
    state: 'BLOCKED',
    requirement: "Gérer contacts, opportunités par étape, activités et un tableau de bord.",
    plan: 'Plan : contacts, pipeline kanban, activités, dashboard. 4 lots.',
    review: "Review Codex : boucle de corrections dépassée sur l’import de contacts. Blocage.",
    files: [
      { name: 'import-contacts.json', mime: 'application/json', category: 'technical_document', size: 25600 },
      { name: 'regles-metier.md', mime: 'text/markdown', category: 'business_rules', size: 7300 },
    ],
    packages: [
      { title: 'Contacts & import', objective: 'CRUD + import', status: 'blocked', verdict: 'rejected' },
    ],
    findings: [
      { category: 'blocker', severity: 'critical', message: "Import échoue sur les doublons d’e-mail." },
      { category: 'security', severity: 'high', message: 'Valider le fichier importé (source non fiable).' },
    ],
    verdict: 'BLOCKED',
  },
  {
    name: 'Application Gift Platform',
    type: 'web',
    tech: ['next', 'blob', 'tailwind'],
    description: 'Plateforme de cartes cadeaux personnalisables.',
    state: 'READY',
    requirement: 'Créer et offrir des cartes cadeaux avec messages et visuels personnalisés.',
    plan: '',
    review: '',
    files: [
      { name: 'brief.md', mime: 'text/markdown', category: 'requirements', size: 3100 },
      { name: 'assets.zip', mime: 'application/zip', category: 'source_archive', size: 812000 },
    ],
    packages: [],
    findings: [],
    verdict: 'READY',
  },
];

async function seedProject(ownerId: string, s: Scenario) {
  const ts = Date.now();
  const projectId = newId(ID_PREFIX.project);
  await db.insert(t.projects).values({
    id: projectId,
    ownerId,
    name: s.name,
    slug: s.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    type: s.type,
    description: s.description,
    tech: s.tech,
    autonomyLevel: 'balanced',
    status: s.state === 'BLOCKED' ? 'blocked' : 'active',
    createdAt: ts,
    updatedAt: ts,
  });

  const convId = newId(ID_PREFIX.conversation);
  await db.insert(t.conversations).values({ id: convId, projectId, createdAt: ts });
  const msgs: Array<{ role: string; content: string }> = [
    { role: 'user', content: s.requirement },
  ];
  if (s.plan) msgs.push({ role: 'claude', content: s.plan });
  if (s.review) msgs.push({ role: 'codex', content: s.review });
  msgs.push({ role: 'system', content: `État du workflow : ${s.state}.` });
  for (const m of msgs) {
    await db.insert(t.messages).values({
      id: newId(ID_PREFIX.message), conversationId: convId, role: m.role,
      content: m.content, stageId: null, edited: false, createdAt: Date.now(),
    });
  }

  for (const f of s.files) {
    const fileId = newId(ID_PREFIX.file);
    await db.insert(t.projectFiles).values({
      id: fileId, projectId, name: f.name,
      generatedName: `${fileId}-${f.name}`, mime: f.mime, size: f.size,
      sha256: 'demo'.padEnd(64, '0'), category: f.category, status: 'READY',
      messageId: null, createdAt: Date.now(),
    });
    await db.insert(t.fileExtractions).values({
      id: newId(ID_PREFIX.extraction), fileId, kind: 'text',
      contentRef: null, meta: { demo: true }, createdAt: Date.now(),
    });
  }

  const runId = newId(ID_PREFIX.run);
  const started = s.state === 'READY' ? null : ts;
  await db.insert(t.workflowRuns).values({
    id: runId, projectId, state: s.state, cycleCount: s.state === 'BLOCKED' ? 3 : 0,
    checkpointState: null, lastIdempotencyKey: null,
    startedAt: started, pausedAt: null, endedAt: s.state === 'APPROVED' ? Date.now() : null,
    error: null, createdAt: ts,
  });

  const stageNames = ['Analyse', 'Planification', 'Construction', 'Tests', 'Review'];
  let seq = 0;
  for (const [i, name] of stageNames.entries()) {
    const done = s.state === 'APPROVED' || i < 2;
    await db.insert(t.workflowStages).values({
      id: newId(ID_PREFIX.stage), runId, name,
      status: done ? 'completed' : 'active', actor: 'orchestrator',
      startedAt: ts + i * 1000, completedAt: done ? ts + i * 1000 + 500 : null,
      durationMs: done ? 500 : null, error: null,
    });
  }
  const events: Array<[string, string]> = [
    ['workflow.started', 'orchestrator'],
    ['stage.started', 'orchestrator'],
    ['agent.started', 'builder'],
    ['agent.message', 'builder'],
    ['test.completed', 'system'],
  ];
  if (s.review) events.push(['review.completed', 'reviewer']);
  if (s.state === 'APPROVED') events.push(['workflow.completed', 'orchestrator']);
  for (const [type, actor] of events) {
    seq += 1;
    await db.insert(t.agentEvents).values({
      id: newId(ID_PREFIX.event), runId, type, actor, seq,
      payload: {}, createdAt: ts + seq * 100,
    });
  }
  await db.insert(t.checkpoints).values({
    id: newId(ID_PREFIX.checkpoint), runId, state: s.state,
    snapshot: { seq }, createdAt: Date.now(),
  });

  for (const p of s.packages) {
    const wpId = newId(ID_PREFIX.workPackage);
    await db.insert(t.workPackages).values({
      id: wpId, runId, title: p.title, objective: p.objective,
      deps: [], mainAgent: 'builder', files: [], acceptance: ['typecheck', 'lint', 'tests'],
      status: p.status, verdict: p.verdict, createdAt: Date.now(),
    });
    if (s.review) {
      const revId = newId(ID_PREFIX.review);
      await db.insert(t.reviews).values({
        id: revId, workPackageId: wpId, reviewer: 'codex',
        verdict: p.verdict ?? 'pending', summary: s.review, createdAt: Date.now(),
      });
      for (const f of s.findings) {
        await db.insert(t.reviewFindings).values({
          id: newId(ID_PREFIX.finding), reviewId: revId, category: f.category,
          severity: f.severity, message: f.message, file: null, resolved: false,
        });
      }
    }
  }

  const gateRunId = newId(ID_PREFIX.gateRun);
  await db.insert(t.qualityGateRuns).values({ id: gateRunId, runId, stageId: null, createdAt: Date.now() });
  for (const gate of ['typecheck', 'lint', 'build', 'unit'] as const) {
    await db.insert(t.qualityGateResults).values({
      id: newId(ID_PREFIX.gateResult), gateRunId, gate,
      status: s.state === 'BLOCKED' && gate === 'unit' ? 'fail' : 'pass',
      durationMs: 1200, logRef: null,
    });
  }

  return projectId;
}

async function main() {
  console.warn('[seed] réinitialisation…');
  await reset();

  const ownerId = newId(ID_PREFIX.user);
  await db.insert(t.users).values({
    id: ownerId, email: OWNER_EMAIL, name: 'Propriétaire (démo)', role: 'owner', createdAt: Date.now(),
  });

  for (const s of SCENARIOS) {
    const id = await seedProject(ownerId, s);
    console.warn(`[seed] projet créé : ${s.name} (${s.state}) → ${id}`);
  }
  console.warn(`[seed] terminé. Propriétaire : ${OWNER_EMAIL}`);
}

main().catch((err) => {
  console.error('[seed] échec :', err);
  process.exit(1);
});
