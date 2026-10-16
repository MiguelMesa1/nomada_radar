'use client';

import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  function toggleTheme() {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('nomada-theme-v1', theme);
    } catch {
      // The theme still works when browser storage is unavailable.
    }
  }

  return <button type="button" className="theme-toggle" onClick={toggleTheme} title="Cambiar entre modo claro y oscuro" aria-label="Cambiar entre modo claro y oscuro">
    <span className="theme-to-light"><Sun size={17} aria-hidden="true"/>Modo claro</span>
    <span className="theme-to-dark"><Moon size={17} aria-hidden="true"/>Modo oscuro</span>
  </button>;
}
