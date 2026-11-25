import type { DaySession } from '@/lib/dashboard';
import { durationTr } from '@/lib/format';

const DAY = 1440;
const CHARS = ['·', '▒', '█'];

function minuteLabel(min: number): string {
  const m = Math.max(0, Math.min(DAY, Math.round(min)));
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// Hour labels every 3 hours, aligned to the strip's cells (the first cell is
// the strip's opening "|").
function ruler(buckets: number): string[] {
  const cells = Array.from({ length: buckets + 3 }, () => ' ');
  for (let h = 0; h <= 24; h += 3) {
    // 24 ends at the closing bar instead of starting there.
    const pos = h === 24 ? buckets : 1 + (h * buckets) / 24;
    const label = String(h).padStart(2, '0');
    cells[pos] = label[0]!;
    cells[pos + 1] = label[1]!;
  }
  return cells;
}

// Fraction of each bucket covered by sessions.
function coverage(sessions: DaySession[], buckets: number): number[] {
  const size = DAY / buckets;
  return Array.from({ length: buckets }, (_, b) => {
    const from = b * size, to = from + size;
    let covered = 0;
    for (const s of sessions) covered += Math.max(0, Math.min(to, s.endMin) - Math.max(from, s.startMin));
    return covered / size;
  });
}

function describe(sessions: DaySession[]): string {
  if (sessions.length === 0) return 'Bu gün Slack’te aktif değildi.';
  const parts = sessions.map((s) => `${minuteLabel(s.startMin)}–${s.end ? minuteLabel(s.endMin) : 'şu an'}`);
  return `${sessions.length} aktif aralık: ${parts.join(', ')}`;
}

// A 24-hour strip of the day. Afiş prints framed ink blocks with a pink "now"
// line; Sinyal prints one character per bucket.
export function DayStrip({
  sessions,
  nowMin,
  size = 'mini',
}: {
  sessions: DaySession[];
  nowMin?: number | null;
  size?: 'mini' | 'large';
}) {
  const large = size === 'large';
  const h = large ? 64 : 22;
  const buckets = large ? 96 : 24;
  const cov = coverage(sessions, buckets);
  const nowBucket = nowMin != null ? Math.floor((nowMin / DAY) * buckets) : null;

  return (
    <div className="strip" role="img" aria-label={describe(sessions)}>
      <div className="only-afis">
        <svg className="strip-svg" viewBox={`0 0 ${DAY} ${h}`} preserveAspectRatio="none" aria-hidden="true">
          <rect className="frame" x="0" y="0" width={DAY} height={h} vectorEffect="non-scaling-stroke" />
          {[180, 360, 540, 720, 900, 1080, 1260].map((x) => (
            <line key={x} className="tick" x1={x} x2={x} y1={0} y2={h} vectorEffect="non-scaling-stroke" />
          ))}
          {sessions.map((s, i) => (
            <rect key={i} className={`blk ${s.end ? '' : 'open'}`} x={s.startMin} y={large ? 6 : 3} width={Math.max(4, s.endMin - s.startMin)} height={h - (large ? 12 : 6)} />
          ))}
          {nowMin != null && <line className="nowline" x1={nowMin} x2={nowMin} y1={-4} y2={h + 4} vectorEffect="non-scaling-stroke" />}
        </svg>
        {large && (
          <div className="strip-hours" aria-hidden="true">
            {['00', '03', '06', '09', '12', '15', '18', '21', '24'].map((t) => <span key={t}>{t}</span>)}
          </div>
        )}
      </div>
      <div className="only-sinyal strip-txt" aria-hidden="true">
        {large && (
          <div className="strip-ruler">
            {ruler(buckets).map((ch, i) => <span key={i} className="cell">{ch}</span>)}
          </div>
        )}
        <div>
          <span className="cell">|</span>
          {cov.map((c, i) => {
            const future = nowBucket != null && i > nowBucket;
            const level = c === 0 ? 0 : c < 0.5 ? 1 : 2;
            const isNow = nowBucket === i;
            return (
              <span key={i} className={`cell${isNow ? ' now' : level ? ' on' : ''}`}>
                {future ? ' ' : isNow && level === 0 ? '▏' : CHARS[level]}
              </span>
            );
          })}
          <span className="cell">|</span>
        </div>
      </div>
    </div>
  );
}

export function sessionSpan(s: DaySession): { from: string; to: string; length: string } {
  return { from: minuteLabel(s.startMin), to: s.end ? minuteLabel(s.endMin) : 'şu an', length: durationTr(s.durationMs) };
}
