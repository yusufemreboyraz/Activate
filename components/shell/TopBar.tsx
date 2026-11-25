import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { Logo } from '@/components/brand/Logo';
import { ThemeSwitch } from '@/components/shell/ThemeSwitch';
import { UserMenu } from '@/components/shell/UserMenu';
import { WorkspaceNav } from '@/components/shell/WorkspaceNav';
import { parseTheme, THEME_COOKIE } from '@/lib/theme';
import type { Viewer } from '@/lib/viewer';

export async function TopBar({ viewer }: { viewer: Viewer }) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <header className="topbar">
      <div className="topbar-in">
        <Logo />
        <Suspense fallback={null}>
          <WorkspaceNav workspaces={viewer.workspaces} />
        </Suspense>
        <div className="topbar-end">
          <ThemeSwitch initial={theme} />
          <UserMenu name={viewer.name} email={viewer.email} image={viewer.image} isAdmin={viewer.isAdmin} />
        </div>
      </div>
    </header>
  );
}
