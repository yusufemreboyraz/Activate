import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { getI18n } from '@/lib/locale';

export default async function NotFound() {
  const { locale, t } = await getI18n();
  return (
    <main id="main" className="poster">
      <div className="poster-top"><Logo locale={locale} /></div>
      <div className="poster-main">
        <h1 className="poster-title" style={{ ['--chars' as string]: 6 }}><span className="row">{t.notFound.title[0]}</span><span className="row"><span className="stk">{t.notFound.title[1]}</span></span></h1>
        <p className="poster-lead">{t.notFound.body}</p>
        <div className="poster-actions"><Link className="btn" href="/">{t.day.backToday}</Link></div>
      </div>
      <div className="poster-foot"><span>activate</span></div>
    </main>
  );
}
