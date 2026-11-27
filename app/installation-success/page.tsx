import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { getI18n } from '@/lib/locale';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.meta.installSuccess };
}

export default async function InstallSuccess({ searchParams }: { searchParams: Promise<{ workspace?: string }> }) {
  const { workspace } = await searchParams;
  const { locale, t } = await getI18n();
  const ti = t.install;
  return (
    <main id="main" className="poster">
      <div className="poster-top"><Logo locale={locale} /></div>
      <div className="poster-main">
        <ol className="boot only-sinyal" aria-hidden="true">
          <li style={{ ['--i' as string]: 0 }}>{ti.boot[0]} <span className="ok">{ti.ok}</span></li>
          <li style={{ ['--i' as string]: 1 }}>{ti.boot[1]} <span className="ok">{ti.ok}</span></li>
          <li style={{ ['--i' as string]: 2 }}>{ti.boot[2]}</li>
        </ol>
        <h1 className="poster-title" style={{ ['--chars' as string]: Math.max(10, (workspace?.length ?? 0) + 1) }}><span className="row">{ti.successTitle}</span>{workspace && <span className="row"><span className="stk keep-case">{workspace}</span></span>}</h1>
        <p className="poster-lead">{ti.successLead}</p>
        <div className="poster-actions"><Link className="btn btn-pop" href="/">{t.day.goToday}</Link></div>
      </div>
      <div className="poster-foot"><span>activate</span></div>
    </main>
  );
}
