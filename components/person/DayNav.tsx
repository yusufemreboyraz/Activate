import Link from 'next/link';
import { DateJump } from '@/components/person/DateJump';
import { dayMonthTr, dayMonthYearTr, weekdayTr } from '@/lib/format';
import { addDays } from '@/lib/time';

// ‹ day › with a date picker and a way back to today. Used by the team page and
// the person page so both move through days the same way.
export function DayNav({
  date,
  today,
  hrefFor,
  base,
  label = 'Gün seç',
}: {
  date: string;
  today: string;
  hrefFor: (date: string) => string;
  base: string;
  label?: string;
}) {
  const prev = addDays(date, -1);
  const next = addDays(date, 1);
  const isToday = date === today;
  const yesterday = addDays(today, -1);
  return (
    <nav className="daynav" aria-label={label}>
      <Link className="daynav-btn" href={hrefFor(prev)} scroll={false} aria-label={`Önceki gün, ${dayMonthTr(prev)}`}>‹</Link>
      <div className="daynav-date" aria-live="polite">
        <b>{isToday ? 'Bugün' : date === yesterday ? 'Dün' : weekdayTr(date)}</b>
        <span>{isToday || date === yesterday ? `${weekdayTr(date)} · ` : ''}{dayMonthYearTr(date)}</span>
      </div>
      <Link
        className="daynav-btn"
        href={hrefFor(next)}
        scroll={false}
        aria-disabled={isToday}
        tabIndex={isToday ? -1 : undefined}
        aria-label={`Sonraki gün, ${dayMonthTr(next)}`}
      >›</Link>
      <span className="daynav-spacer" />
      {!isToday && <Link className="btn btn-ghost" href={hrefFor(today)} scroll={false}>Bugüne git</Link>}
      <DateJump value={date} max={today} base={base} />
    </nav>
  );
}
