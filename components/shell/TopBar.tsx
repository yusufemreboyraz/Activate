import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { Logo } from '@/components/brand/Logo';
import { LangSwitch } from '@/components/shell/LangSwitch';
import { ThemeSwitch } from '@/components/shell/ThemeSwitch';
import { UserMenu } from '@/components/shell/UserMenu';
import { WorkspaceNav } from '@/components/shell/WorkspaceNav';
import { parseTheme, THEME_COOKIE } from '@/lib/theme';
import { getLocale } from '@/lib/locale';
import type { Viewer } from '@/lib/viewer';

export async function TopBar({ viewer }: { viewer: Viewer }) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  const locale = await getLocale();
  return (
    <header className="topbar">
      <div className="topbar-in">
        <Logo locale={locale} />
        <Suspense fallback={null}>
          <WorkspaceNav workspaces={viewer.workspaces} locale={locale} />
        </Suspense>
        <div className="topbar-end">
          <LangSwitch initial={locale} />
          <ThemeSwitch initial={theme} locale={locale} />
          <UserMenu name={viewer.name} email={viewer.email} image={viewer.image} isAdmin={viewer.isAdmin} locale={locale} />
        </div>
      </div>
    </header>
  );
}
