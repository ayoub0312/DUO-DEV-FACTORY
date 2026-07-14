'use client';

import { useRef, useState, type ReactNode } from 'react';

export interface TabItem {
  key: string;
  label: string;
  content: ReactNode;
}

/**
 * Onglets accessibles (motif WAI-ARIA Tabs) : rôles ARIA, roving tabindex,
 * navigation clavier (flèches gauche/droite, Home/End).
 */
export function Tabs({ tabs }: { tabs: TabItem[] }) {
  const [active, setActive] = useState(tabs[0]?.key ?? '');
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  function focusTab(key: string) {
    setActive(key);
    tabRefs.current.get(key)?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    let nextIndex = index;
    if (e.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
    else if (e.key === 'Home') nextIndex = 0;
    else if (e.key === 'End') nextIndex = tabs.length - 1;
    const next = tabs[nextIndex];
    if (next) focusTab(next.key);
  }

  return (
    <div>
      <div role="tablist" className="flex flex-wrap gap-1 border-b border-border" aria-label="Sections du projet">
        {tabs.map((t, i) => {
          const selected = t.key === active;
          return (
            <button
              key={t.key}
              ref={(el) => {
                if (el) tabRefs.current.set(t.key, el);
                else tabRefs.current.delete(t.key);
              }}
              role="tab"
              id={`tab-${t.key}`}
              aria-selected={selected}
              aria-controls={`tabpanel-${t.key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(t.key)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className={
                'rounded-t-md px-3 py-2 text-sm transition-colors duration-base ' +
                (selected
                  ? 'border-b-2 border-accent-builder font-medium text-text'
                  : 'text-text-muted hover:text-text')
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {tabs.map((t) => (
        <div
          key={t.key}
          role="tabpanel"
          id={`tabpanel-${t.key}`}
          aria-labelledby={`tab-${t.key}`}
          hidden={t.key !== active}
          className="pt-4"
        >
          {t.key === active ? t.content : null}
        </div>
      ))}
    </div>
  );
}
