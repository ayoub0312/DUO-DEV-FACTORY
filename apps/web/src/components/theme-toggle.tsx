'use client';

import { useEffect, useState } from 'react';
import { Button } from '@duo/ui';

/** Bascule clair/sombre avec persistance (localStorage) et respect du système. */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('duo-theme', next ? 'dark' : 'light');
    } catch {
      /* stockage indisponible : on ignore */
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={toggle} aria-label="Basculer le thème">
      {dark ? '☾ Sombre' : '☀ Clair'}
    </Button>
  );
}
