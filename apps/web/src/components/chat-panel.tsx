'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@duo/ui';

export interface ChatMessage {
  id: string;
  role: string;
  content: string;
  createdAt: number;
}

export interface ChatPanelProps {
  projectId: string;
  initialMessages: ChatMessage[];
}

const ROLE_META: Record<string, { label: string; initials: string; avatar: string }> = {
  claude: { label: 'Claude Builder', initials: 'CB', avatar: 'bg-accent-builder text-white' },
  codex: { label: 'Codex Reviewer', initials: 'CR', avatar: 'bg-accent-reviewer text-white' },
  user: { label: 'Vous', initials: 'V', avatar: 'bg-surface-2 text-text' },
  system: { label: 'Système', initials: 'S', avatar: 'bg-surface-2 text-text-muted' },
};

function roleMeta(role: string) {
  return ROLE_META[role] ?? { label: role, initials: '?', avatar: 'bg-surface-2 text-text-muted' };
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Panneau de conversation temps réel avec le Builder/Reviewer (chat + composer sticky). */
export function ChatPanel({ projectId, initialMessages }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  async function refreshMessages() {
    try {
      const res = await fetch(`/api/projects/${projectId}/messages`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.items ?? []);
    } catch {
      // silencieux : on garde l'état précédent si le rafraîchissement échoue
    }
  }

  async function handleSend() {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? "Échec de l'envoi du message.");
      }
      setDraft('');
      await refreshMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="flex h-[calc(100vh-260px)] min-h-[420px] flex-col rounded-lg border border-border bg-surface">
      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label="Messages de la conversation"
        className="flex-1 space-y-3 overflow-y-auto p-4"
      >
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-sm text-text-muted">
            <p className="font-medium text-text">Aucun message pour l&apos;instant</p>
            <p className="mt-1 max-w-xs">
              Écrivez à Claude Builder pour lancer la conversation sur ce projet.
            </p>
          </div>
        )}
        {messages.map((m) => {
          const meta = roleMeta(m.role);
          return (
            <div key={m.id} className="flex items-start gap-3">
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  meta.avatar,
                )}
                aria-hidden
              >
                {meta.initials}
              </span>
              <div className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-text-muted">{meta.label}</span>
                  <span className="text-xs text-text-muted">{formatTime(m.createdAt)}</span>
                </div>
                <div className="mt-1 whitespace-pre-wrap break-words text-sm text-text">{m.content}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-0 border-t border-border bg-surface p-3">
        {error && (
          <p role="alert" className="mb-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-1.5 text-xs text-danger">
            {error}
          </p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            aria-label="Écrire un message"
            placeholder="Écrire un message… (Entrée pour envoyer, Maj+Entrée pour un saut de ligne)"
            disabled={sending}
            className="min-h-[44px] flex-1 resize-none rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent-reviewer focus:outline-none focus:ring-1 focus:ring-accent-reviewer disabled:opacity-60"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !draft.trim()}
            className={cn(
              'inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-accent-builder px-4 text-sm font-medium text-white transition-colors duration-base hover:opacity-90',
              (sending || !draft.trim()) && 'cursor-not-allowed opacity-50',
            )}
          >
            {sending ? 'Envoi…' : 'Envoyer'}
          </button>
        </div>
      </div>
    </div>
  );
}
