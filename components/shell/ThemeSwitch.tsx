'use client';

import { useState } from 'react';
import { THEME_COOKIE, THEME_LABEL, THEMES, type Theme } from '@/lib/theme';

type DocWithVT = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };

// Switches the theme in place: both themes' markup is already on the page, so
// only data-theme changes. The wipe starts from the button that was pressed.
export function ThemeSwitch({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);

  function choose(next: Theme, el: HTMLElement) {
    if (next === theme) return;
    document.cookie = `${THEME_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    const root = document.documentElement;
    const r = el.getBoundingClientRect();
    root.style.setProperty('--vt-x', `${r.left + r.width / 2}px`);
    root.style.setProperty('--vt-y', `${r.top + r.height / 2}px`);
    const apply = () => {
      root.dataset.theme = next;
      setTheme(next);
    };
    const doc = document as DocWithVT;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!doc.startViewTransition || reduce) return apply();
    root.classList.add(next === 'sinyal' ? 'vt-to-sinyal' : 'vt-to-afis');
    doc.startViewTransition(apply).finished.finally(() => root.classList.remove('vt-to-sinyal', 'vt-to-afis'));
  }

  return (
    <div className="theme" role="radiogroup" aria-label="Görünüm" title="Görünüm: Afiş ya da Sinyal">
      {THEMES.map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={theme === t}
          onClick={(e) => choose(t, e.currentTarget)}
        >
          {THEME_LABEL[t]}
        </button>
      ))}
    </div>
  );
}
