'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface Command {
  id: string;
  label: string;
  group: string;
  action: () => void;
  keywords?: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
    setQuery('');
  }, [pathname]);

  const commands = useMemo<Command[]>(
    () => [
      {
        id: 'nav-home',
        label: 'Accueil',
        group: 'Navigation',
        action: () => router.push('/'),
        keywords: 'dashboard tableau bord',
      },
      {
        id: 'nav-projects',
        label: 'Projets',
        group: 'Navigation',
        action: () => router.push('/projects'),
        keywords: 'liste projects',
      },
      {
        id: 'nav-reports',
        label: 'Rapports',
        group: 'Navigation',
        action: () => router.push('/reports'),
        keywords: 'stats statistiques',
      },
      {
        id: 'nav-settings',
        label: 'Paramètres',
        group: 'Navigation',
        action: () => router.push('/settings'),
        keywords: 'config configuration',
      },
      {
        id: 'theme-light',
        label: 'Thème clair',
        group: 'Actions',
        action: () => {
          document.documentElement.setAttribute('data-theme', 'light');
          localStorage.setItem('duo-theme-pref', 'light');
        },
        keywords: 'light mode',
      },
      {
        id: 'theme-dark',
        label: 'Thème sombre',
        group: 'Actions',
        action: () => {
          document.documentElement.setAttribute('data-theme', 'dark');
          localStorage.setItem('duo-theme-pref', 'dark');
        },
        keywords: 'dark mode',
      },
      {
        id: 'new-project',
        label: 'Nouveau projet',
        group: 'Actions',
        action: () => {
          setOpen(false);
          const btn = document.querySelector<HTMLButtonElement>('[data-new-project]');
          btn?.click();
        },
        keywords: 'créer create',
      },
    ],
    [router],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q) ||
        (c.keywords ?? '').toLowerCase().includes(q),
    );
  }, [commands, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, Command[]>();
    for (const cmd of filtered) {
      const list = map.get(cmd.group) ?? [];
      list.push(cmd);
      map.set(cmd.group, list);
    }
    return map;
  }, [filtered]);

  const execute = useCallback((cmd: Command) => {
    setOpen(false);
    setQuery('');
    setTimeout(() => cmd.action(), 0);
  }, []);

  const runSelected = useCallback(() => {
    const cmd = filtered[selected];
    if (cmd) execute(cmd);
  }, [filtered, selected, execute]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => {
          const next = !v;
          if (next) triggerRef.current = document.activeElement as HTMLElement;
          return next;
        });
        setQuery('');
        setSelected(0);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      triggerRef.current?.focus?.();
      triggerRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runSelected();
    }
  }

  if (!open) return null;

  let flatIdx = -1;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
      <div
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Palette de commandes"
      >
        <div className="flex items-center gap-2 border-b border-border px-4">
          <svg className="h-4 w-4 shrink-0 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher une commande…"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-text-muted"
            aria-label="Rechercher"
          />
          <kbd className="shrink-0 rounded border border-border bg-surface-2 px-1.5 py-0.5 text-xs text-text-muted">
            Esc
          </kbd>
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-text-muted">Aucun résultat</p>
          )}
          {Array.from(grouped.entries()).map(([group, cmds]) => (
            <div key={group}>
              <div className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-text-muted">
                {group}
              </div>
              {cmds.map((cmd) => {
                flatIdx++;
                const idx = flatIdx;
                return (
                  <button
                    key={cmd.id}
                    type="button"
                    onClick={() => execute(cmd)}
                    onMouseEnter={() => setSelected(idx)}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                      selected === idx
                        ? 'bg-accent-builder/10 text-accent-builder'
                        : 'text-text hover:bg-surface-2'
                    }`}
                  >
                    {cmd.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="border-t border-border px-4 py-2 text-xs text-text-muted">
          <span className="mr-3">↑↓ naviguer</span>
          <span className="mr-3">↵ sélectionner</span>
          <span>Esc fermer</span>
        </div>
      </div>
    </div>
  );
}
