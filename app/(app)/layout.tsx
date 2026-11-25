import { redirect } from 'next/navigation';
import { Footer } from '@/components/shell/Footer';
import { TopBar } from '@/components/shell/TopBar';
import { getViewer } from '@/lib/viewer';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (!viewer) redirect('/signin');
  return (
    <div className="shell">
      <TopBar viewer={viewer} />
      <main id="main" className="page">{children}</main>
      <Footer />
    </div>
  );
}
