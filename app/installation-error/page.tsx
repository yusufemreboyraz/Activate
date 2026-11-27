import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { getI18n } from '@/lib/locale';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.meta.installError };
}

export default async function InstallError({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { locale, t } = await getI18n();
  const ti = t.install;
  const message = (error && ti.errors[error]) || ti.unexpected;
  return (
    <main id="main" className="poster">
      <div className="poster-top"><Logo locale={locale} /></div>
      <div className="poster-main">
        <h1 className="poster-title" style={{ ['--chars' as string]: 12 }}><span className="row"><span className="stk">{ti.failTitle}</span></span></h1>
        <div className="alert is-error" role="alert"><b>{ti.failLead}</b><span>{message}</span></div>
        <div className="poster-actions">
          <a className="btn btn-pop" href="/api/slack/install">{ti.retry}</a>
          <Link className="btn btn-ghost" href="/">{t.day.backToday}</Link>
        </div>
      </div>
      <div className="poster-foot"><span>activate</span></div>
    </main>
  );
}
