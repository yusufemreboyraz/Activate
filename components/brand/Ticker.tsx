import type { TeamEvent } from '@/lib/dashboard';
import { formatter, messages, type Locale } from '@/lib/i18n';

// Today's comings and goings, newest last, as a stacked log in both themes.
// Afiş prints it as an ink panel with a sticker per event; Sinyal as the tail
// of a terminal log with a blinking prompt.
export function Ticker({ events, live = true, locale }: { events: TeamEvent[]; live?: boolean; locale: Locale }) {
  const t = messages(locale).log;
  const f = formatter(locale);
  const tail = events
    .map((e) => ({
      key: `${e.userId}-${e.kind}-${e.at.getTime()}`,
      when: f.clock(e.at),
      name: e.name,
      kind: e.kind,
    }))
    .slice(0, 6)
    .reverse();

  return (
    <section aria-label={live ? t.today : t.thatDay}>
      <ol className="log">
        {tail.length === 0 && (
          <li className="log-empty">
            <time>--:--</time>
            <span>{live ? t.emptyLive : t.emptyPast}</span>
          </li>
        )}
        {tail.map((it, i) => (
          <li key={it.key} className={`ev-${it.kind}`} style={{ ['--i' as string]: i }}>
            <time className="num">{it.when}</time>
            <span className="log-line">
              <b>{it.name}</b>{' '}
              <span className="log-what">{it.kind === 'active' ? t.active : t.away}</span>
            </span>
          </li>
        ))}
        {live && (
          <li className="prompt only-sinyal" style={{ ['--i' as string]: tail.length }} aria-hidden="true">
            <span>&gt;</span>
            <span>{t.watching}<span className="cursor" /></span>
          </li>
        )}
      </ol>
    </section>
  );
}
