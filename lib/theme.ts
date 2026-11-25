// Theme choice: stored in a cookie so the server renders the right theme first.
export const THEMES = ['afis', 'sinyal'] as const;
export type Theme = (typeof THEMES)[number];
export const THEME_COOKIE = 'activate-theme';
export const DEFAULT_THEME: Theme = 'afis';

export function parseTheme(value: string | undefined | null): Theme {
  return (THEMES as readonly string[]).includes(value ?? '') ? (value as Theme) : DEFAULT_THEME;
}

export const THEME_LABEL: Record<Theme, string> = { afis: 'Afiş', sinyal: 'Sinyal' };
