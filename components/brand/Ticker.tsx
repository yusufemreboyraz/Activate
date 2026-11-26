import type { TeamEvent } from '@/lib/dashboard';
import { clockTr } from '@/lib/format';

// Today's comings and goings, newest last, as a stacked log in both themes.
// Afiş prints it as an ink panel with a sticker per event; Sinyal as the tail
// of a terminal log with a blinking prompt.
export function Ticker({ events, live = true }: { events: TeamEvent[]; live?: boolean }) {
  const tail = events
    .map((e) => ({
      key: `${e.userId}-${e.kind}-${e.at.getTime()}`,
      when: clockTr(e.at),
      name: e.name,
      kind: e.kind,
    }))
    .slice(0, 6)
    .reverse();

  return (
    <section aria-label={live ? 'Bugünün hareketleri' : 'Günün hareketleri'}>
      <ol className="log">
        {tail.length === 0 && (
          <li className="log-empty">
            <time>--:--</time>
            <span>{live ? 'bugün henüz hareket yok' : 'bu gün hareket yok'}</span>
          </li>
        )}
        {tail.map((it, i) => (
          <li key={it.key} className={`ev-${it.kind}`} style={{ ['--i' as string]: i }}>
            <time className="num">{it.when}</time>
            <span className="log-line">
              <b>{it.name}</b>{' '}
              <span className="log-what">{it.kind === 'active' ? 'aktif oldu' : 'uzaklaştı'}</span>
            </span>
          </li>
        ))}
        {live && (
          <li className="prompt only-sinyal" style={{ ['--i' as string]: tail.length }} aria-hidden="true">
            <span>&gt;</span>
            <span>izleniyor<span className="cursor" /></span>
          </li>
        )}
      </ol>
    </section>
  );
}
