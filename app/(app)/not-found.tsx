import Link from 'next/link';
import { getI18n } from '@/lib/locale';

export default async function NotFoundInApp() {
  const { t } = await getI18n();
  return (
    <section className="empty">
      <h1 className="empty-big" style={{ ['--chars' as string]: 11 }}>{t.notFound.appTitle}</h1>
      <p>{t.notFound.appBody}</p>
      <div className="empty-actions"><Link className="btn" href="/">{t.day.backToday}</Link></div>
    </section>
  );
}
