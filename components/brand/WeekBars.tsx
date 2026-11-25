import Link from 'next/link';
import { durationShown, durationTr, weekdayShortTr } from '@/lib/format';

const EIGHT_HOURS = 8 * 3_600_000;
const WIDTH = 20;

export function WeekBars({
  week,
  selected,
  today,
  hrefFor,
}: {
  week: { date: string; totalMs: number }[];
  selected: string;
  today: string;
  hrefFor: (date: string) => string;
}) {
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
            <span className="day">{weekdayShortTr(d.date)}</span>
            <span className="week-txt" aria-hidden="true">{future ? ''.padEnd(WIDTH, ' ') : '█'.repeat(filled) + '░'.repeat(WIDTH - filled)}</span>
            <span className="val num">{future ? '' : durationShown(d.totalMs)}</span>
          </>
        );
        return (
          <li key={d.date}>
            {future ? (
              <span className={cls} aria-label={`${weekdayShortTr(d.date)}: henüz gelmedi`}>{body}</span>
            ) : (
              <Link href={hrefFor(d.date)} className={cls} scroll={false} aria-label={`${weekdayShortTr(d.date)}: ${durationTr(d.totalMs)}`} aria-current={d.date === selected ? 'date' : undefined}>
                {body}
              </Link>
            )}
          </li>
        );
      })}
    </ol>
  );
}
