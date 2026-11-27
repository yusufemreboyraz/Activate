import Link from 'next/link';
import { formatter, messages, type Locale } from '@/lib/i18n';

const EIGHT_HOURS = 8 * 3_600_000;
const WIDTH = 20;

export function WeekBars({
  week,
  selected,
  today,
  hrefFor,
  locale,
}: {
  week: { date: string; totalMs: number }[];
  selected: string;
  today: string;
  hrefFor: (date: string) => string;
  locale: Locale;
}) {
  const f = formatter(locale);
  const max = Math.max(EIGHT_HOURS, ...week.map((d) => d.totalMs));
  return (
    <ol className="week">
      {week.map((d) => {
        const future = d.date > today;
        const pct = (d.totalMs / max) * 100;
        const filled = Math.round((d.totalMs / max) * WIDTH);
        const cls = `${d.date === selected ? 'is-sel' : ''} ${d.date === today ? 'is-today' : ''}`;
        const body = (
          <>
            <span className="col" aria-hidden="true"><span className="bar" style={{ ['--h' as string]: `${pct}%` }} /></span>
            <span className="day">{f.weekdayShort(d.date)}</span>
            <span className="week-txt" aria-hidden="true">{future ? ''.padEnd(WIDTH, ' ') : '█'.repeat(filled) + '░'.repeat(WIDTH - filled)}</span>
            <span className="val num">{future ? '' : f.durationShown(d.totalMs)}</span>
          </>
        );
        return (
          <li key={d.date}>
            {future ? (
              <span className={cls} aria-label={`${f.weekdayShort(d.date)}: ${messages(locale).week.notYet}`}>{body}</span>
            ) : (
              <Link href={hrefFor(d.date)} className={cls} scroll={false} aria-label={`${f.weekdayShort(d.date)}: ${f.duration(d.totalMs)}`} aria-current={d.date === selected ? 'date' : undefined}>
                {body}
              </Link>
            )}
          </li>
        );
      })}
    </ol>
  );
}
