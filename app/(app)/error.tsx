'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { messages, parseLocale } from '@/lib/i18n';

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  const t = messages(parseLocale(typeof document === 'undefined' ? null : document.documentElement.lang));
  return (
    <section className="empty" role="alert">
      <h1 className="empty-big" style={{ ['--chars' as string]: 7 }}>{t.error.title}</h1>
      <p>{t.error.body}{error.digest ? t.error.code(error.digest) : ''}</p>
      <div className="empty-actions">
        <button type="button" className="btn" onClick={reset}>{t.install.retry}</button>
        <Link className="btn btn-ghost" href="/">{t.day.backToday}</Link>
      </div>
    </section>
  );
}
