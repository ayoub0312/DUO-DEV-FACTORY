import 'server-only';
import { chatRepo, filesRepo, workflowRepo } from '@duo/database';
import { getProject } from './projects';

export async function getProjectDetail(id: string) {
  const project = await getProject(id);
  if (!project) return null;

  const [conversation, files, run] = await Promise.all([
    chatRepo.ensureConversation(id),
    filesRepo.list(id),
    workflowRepo.latestRunForProject(id),
  ]);

  const messages = await chatRepo.listMessages(conversation.id);

  let stages: Awaited<ReturnType<typeof workflowRepo.listStages>> = [];
  let events: Awaited<ReturnType<typeof workflowRepo.eventsAfter>> = [];
  type WpWithReviews = Awaited<ReturnType<typeof workflowRepo.listWorkPackages>>[number] & {
    reviews: Awaited<ReturnType<typeof workflowRepo.reviewsForWorkPackage>>;
  };
  let workPackages: WpWithReviews[] = [];

  if (run) {
    [stages, events] = await Promise.all([
      workflowRepo.listStages(run.id),
      workflowRepo.eventsAfter(run.id, 0, 200),
    ]);
    const wps = await workflowRepo.listWorkPackages(run.id);
    workPackages = await Promise.all(
      wps.map(async (wp) => ({
        ...wp,
        reviews: await workflowRepo.reviewsForWorkPackage(wp.id),
      })),
    );
  }

  return { project, conversation, messages, files, run, stages, events, workPackages };
}
