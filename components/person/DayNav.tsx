import Link from 'next/link';
import { DateJump } from '@/components/person/DateJump';
import { formatter, messages, type Locale } from '@/lib/i18n';
import { addDays } from '@/lib/time';

// ‹ day › with a date picker and a way back to today. Used by the team page and
// the person page so both move through days the same way.
export function DayNav({
  date,
  today,
  hrefFor,
  base,
  label,
  locale,
}: {
  date: string;
  today: string;
  hrefFor: (date: string) => string;
  base: string;
  label?: string;
  locale: Locale;
}) {
  const t = messages(locale).day;
  const f = formatter(locale);
  const prev = addDays(date, -1);
  const next = addDays(date, 1);
  const isToday = date === today;
  const yesterday = addDays(today, -1);
  return (
    <nav className="daynav" aria-label={label ?? t.pick}>
      <Link className="daynav-btn" href={hrefFor(prev)} scroll={false} aria-label={t.prev(f.dayMonth(prev))}>‹</Link>
      <div className="daynav-date" aria-live="polite">
        <b>{isToday ? t.today : date === yesterday ? t.yesterday : f.weekday(date)}</b>
        <span>{isToday || date === yesterday ? `${f.weekday(date)} · ` : ''}{f.dayMonthYear(date)}</span>
      </div>
      <Link
        className="daynav-btn"
        href={hrefFor(next)}
        scroll={false}
        aria-disabled={isToday}
        tabIndex={isToday ? -1 : undefined}
        aria-label={t.next(f.dayMonth(next))}
      >›</Link>
      <span className="daynav-spacer" />
      {!isToday && <Link className="btn btn-ghost" href={hrefFor(today)} scroll={false}>{t.goToday}</Link>}
      <DateJump value={date} max={today} base={base} locale={locale} />
    </nav>
  );
}
