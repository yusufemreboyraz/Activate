import Link from 'next/link';
import { ScrollEnd } from '@/components/brand/ScrollEnd';
import type { HeatmapDay } from '@/lib/activityService';
import { dayMonthTr, durationTr, monthShortTr } from '@/lib/format';

const HOUR = 3_600_000;
const CHARS = ['·', '░', '▒', '▓', '█'];

// Sinyal prints the whole hours of the day as a digit (· for none, + for 10 or more).
function hoursChar(ms: number): string {
  if (ms <= 0) return '·';
  const h = Math.floor(ms / HOUR);
  return h >= 10 ? '+' : String(h);
}

export function heatLevel(ms: number): number {
  if (ms <= 0) return 0;
  if (ms < HOUR) return 1;
  if (ms < 3 * HOUR) return 2;
  if (ms < 6 * HOUR) return 3;
  return 4;
}

// Weekday of a YYYY-MM-DD date, Monday = 0.
function mondayIndex(date: string): number {
  return (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
}

// The year at a glance. Squares in Afiş, block characters in Sinyal: the same
// cells, printed differently. Cells are links to that day but stay out of the
// tab order; the day navigation above is the keyboard path.
export function Heatmap({
  days,
  selected,
  today,
  hrefFor,
}: {
  days: HeatmapDay[];
  selected: string;
  today: string;
  hrefFor: (date: string) => string;
}) {
  if (days.length === 0) return null;
  const offset = mondayIndex(days[0]!.date);
  const weeks = Math.ceil((offset + days.length) / 7);
  const total = days.filter((d) => d.date <= today).reduce((s, d) => s + d.totalActiveMs, 0);
  const activeDays = days.filter((d) => d.totalActiveMs > 0).length;

  return (
    <div className="heat-block">
      <p className="sr-only">
        {days[0]!.date.slice(0, 4)} yılında {activeDays} gün aktif, toplam {durationTr(total)}.
      </p>
      <ScrollEnd className="heat-wrap">
        <div className="heat" style={{ ['--weeks' as string]: weeks }} aria-hidden="true">
          {days.map((d, i) => {
            if (!d.date.endsWith('-01')) return null;
            const col = Math.floor((offset + i) / 7) + 2;
            return <span key={`m${d.date}`} className="m" style={{ gridColumn: col }}>{monthShortTr(Number(d.date.slice(5, 7)) - 1)}</span>;
          })}
          {['pzt', 'çar', 'cum'].map((w, i) => (
            <span key={w} className="wd" style={{ gridRow: i * 2 + 2 }}>{w}</span>
          ))}
          {days.map((d, i) => {
            const pos = offset + i;
            const style = { gridColumn: Math.floor(pos / 7) + 2, gridRow: (pos % 7) + 2 };
            const future = d.date > today;
            const level = future ? 0 : heatLevel(d.totalActiveMs);
            const cls = `hc l${level}${d.date === selected ? ' is-sel' : ''}${future ? ' is-future' : ''}`;
            const label = `${dayMonthTr(d.date)}: ${durationTr(d.totalActiveMs)}`;
            return future ? (
              <span key={d.date} className={cls} style={style} />
            ) : (
              <Link key={d.date} href={hrefFor(d.date)} className={cls} style={style} data-c={hoursChar(d.totalActiveMs)} title={label} tabIndex={-1} scroll={false} />
            );
          })}
        </div>
      </ScrollEnd>
      <div className="heat-legend" aria-hidden="true">
        <span className="only-afis">az</span>
        {[0, 1, 2, 3, 4].map((l) => <span key={l} className={`hc l${l} only-afis`} data-c={CHARS[l]} />)}
        <span className="only-afis">çok · 1 kare = 1 gün</span>
        <span className="only-sinyal">her karakter bir gün: o gün aktif olunan tam saat (· = hiç, + = 10 ve üstü)</span>
      </div>
    </div>
  );
}
