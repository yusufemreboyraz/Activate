'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { messages, type Locale } from '@/lib/i18n';

export function WorkspaceNav({ workspaces, locale }: { workspaces: { id: string; name: string; members: number }[]; locale: Locale }) {
  const params = useSearchParams();
  const requested = params.get('w');
  const current = workspaces.some((w) => w.id === requested) ? requested : workspaces[0]?.id;
  if (workspaces.length === 0) return null;
  return (
    <nav className="wsnav" aria-label="Workspace">
      {workspaces.map((w) => (
        <Link key={w.id} href={`/?w=${w.id}`} className="ws" aria-current={w.id === current ? 'page' : undefined}>
          <span className="keep-case">{w.name}</span>
          <span className="ws-count num">{messages(locale).people(w.members)}</span>
        </Link>
      ))}
    </nav>
  );
}
