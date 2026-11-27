'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LOCALE_COOKIE, LOCALE_LABEL, LOCALES, messages, type Locale } from '@/lib/i18n';

// TR / EN. The text is rendered on the server, so switching stores the cookie
// and re-renders the page in place.
export function LangSwitch({ initial }: { initial: Locale }) {
  const [locale, setLocale] = useState<Locale>(initial);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function choose(next: Locale) {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    document.documentElement.lang = next;
    setLocale(next);
    startTransition(() => router.refresh());
  }

  return (
    <div className="theme lang" role="radiogroup" aria-label={messages(locale).language}>
      {LOCALES.map((l) => (
        <button key={l} type="button" role="radio" aria-checked={locale === l} lang={l} onClick={() => choose(l)}>
          {LOCALE_LABEL[l]}
        </button>
      ))}
    </div>
  );
}
