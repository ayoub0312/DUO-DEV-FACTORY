import 'server-only';
import { chatRepo, projectsRepo } from '@duo/database';
import { zPostMessage } from '@duo/contracts';
import { requireOwner, AuthError } from '../auth';

/** Vérifie que le projet appartient au propriétaire courant. */
async function ensureProjectOwned(projectId: string) {
  const owner = await requireOwner();
  const project = await projectsRepo.get(owner.id, projectId);
  if (!project) throw new AuthError('Projet introuvable ou non autorisé.');
  return { owner, project };
}

/** Liste les messages de la conversation d'un projet (créée si absente). */
export async function listMessages(projectId: string) {
  await ensureProjectOwned(projectId);
  const conversation = await chatRepo.ensureConversation(projectId);
  return chatRepo.listMessages(conversation.id);
}

/** Ajoute un message utilisateur à la conversation d'un projet. */
export async function addMessage(projectId: string, input: unknown) {
  await ensureProjectOwned(projectId);
  const parsed = zPostMessage.parse(input);
  const conversation = await chatRepo.ensureConversation(projectId);
  return chatRepo.addMessage({
    conversationId: conversation.id,
    role: 'user',
    content: parsed.content,
  });
}
