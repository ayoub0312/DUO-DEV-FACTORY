import 'server-only';
import { projectsRepo, workflowRepo, type CreateProjectInput } from '@duo/database';
import { zCreateProject, zUpdateProject } from '@duo/contracts';
import { requireOwner } from '../auth';

export interface ProjectWithState {
  id: string;
  name: string;
  type: string;
  description: string;
  tech: string[];
  status: string;
  updatedAt: number;
  runState: string | null;
}

/** Projets + état du dernier run (pour dashboard et liste). Tolère une base absente. */
export async function listProjectsWithState(): Promise<ProjectWithState[]> {
  const owner = await requireOwner();
  try {
    const projects = await projectsRepo.list(owner.id);
    const out: ProjectWithState[] = [];
    for (const p of projects) {
      const run = await workflowRepo.latestRunForProject(p.id);
      out.push({
        id: p.id,
        name: p.name,
        type: p.type,
        description: p.description,
        tech: (p.tech as string[]) ?? [],
        status: p.status,
        updatedAt: p.updatedAt,
        runState: run?.state ?? null,
      });
    }
    return out;
  } catch {
    return [];
  }
}

/** Liste les projets du propriétaire. Renvoie [] si la base n'est pas encore initialisée. */
export async function listProjects() {
  const owner = await requireOwner();
  try {
    return await projectsRepo.list(owner.id);
  } catch {
    // Base non migrée / absente : état vide plutôt qu'une erreur bloquante.
    return [];
  }
}

export async function getProject(id: string) {
  const owner = await requireOwner();
  return projectsRepo.get(owner.id, id);
}

export async function createProject(input: unknown) {
  const owner = await requireOwner();
  const parsed = zCreateProject.parse(input);
  const payload: CreateProjectInput = { ownerId: owner.id, ...parsed };
  return projectsRepo.create(payload);
}

export async function updateProject(id: string, patch: unknown) {
  const owner = await requireOwner();
  const parsed = zUpdateProject.parse(patch);
  return projectsRepo.update(owner.id, id, parsed);
}

export async function deleteProject(id: string) {
  const owner = await requireOwner();
  await projectsRepo.softDelete(owner.id, id);
}
