import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';

export const metadata: Metadata = { title: 'Workspace bağlandı' };

export default async function InstallSuccess({ searchParams }: { searchParams: Promise<{ workspace?: string }> }) {
  const { workspace } = await searchParams;
  return (
    <main id="main" className="poster">
      <div className="poster-top"><Logo /></div>
      <div className="poster-main">
        <ol className="boot only-sinyal" aria-hidden="true">
          <li style={{ ['--i' as string]: 0 }}>slack izni <span className="ok">tamam</span></li>
          <li style={{ ['--i' as string]: 1 }}>bağlantı güvenle kaydedildi <span className="ok">tamam</span></li>
          <li style={{ ['--i' as string]: 2 }}>ilk okuma ≤ 2 dk</li>
        </ol>
        <h1 className="poster-title" style={{ ['--chars' as string]: Math.max(10, (workspace?.length ?? 0) + 1) }}><span className="row">Bağlandı!</span>{workspace && <span className="row"><span className="stk keep-case">{workspace}</span></span>}</h1>
        <p className="poster-lead">İlk veriler 2 dakika içinde gelir. Ekibindekiler Slack hesaplarıyla girip yalnızca kendi ekiplerini görür.</p>
        <div className="poster-actions"><Link className="btn btn-pop" href="/">Bugüne git</Link></div>
      </div>
      <div className="poster-foot"><span>activate</span></div>
    </main>
  );
}
