// Server-side read of the interface language cookie. Server-only.
import { cookies } from 'next/headers';
import { formatter, LOCALE_COOKIE, messages, parseLocale, type Formatter, type Locale, type Messages } from '@/lib/i18n';

export async function getLocale(): Promise<Locale> {
  return parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
}

export async function getI18n(): Promise<{ locale: Locale; t: Messages; f: Formatter }> {
  const locale = await getLocale();
  return { locale, t: messages(locale), f: formatter(locale) };
}
