'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <section className="empty" role="alert">
      <h1 className="empty-big">Bir şey koptu.</h1>
      <p>Sayfa yüklenirken bir hata oluştu. Veriler güvende; tekrar denemek genelde yeter.{error.digest ? ` (kod: ${error.digest})` : ''}</p>
      <div className="empty-actions">
        <button type="button" className="btn" onClick={reset}>Tekrar dene</button>
        <Link className="btn btn-ghost" href="/">Bugüne dön</Link>
      </div>
    </section>
  );
}
