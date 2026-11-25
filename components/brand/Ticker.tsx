import type { TeamEvent } from '@/lib/dashboard';
import { clockTr, upperTr } from '@/lib/format';

// Today's comings and goings. Afiş: a marquee band. Sinyal: the tail of a log.
export function Ticker({ events }: { events: TeamEvent[] }) {
  const items = events.map((e) => ({
    key: `${e.userId}-${e.kind}-${e.at.getTime()}`,
    when: clockTr(e.at),
    name: e.name,
    kind: e.kind,
  }));

  const band = items.length === 0
    ? [<span key="none" className="ticker-empty">★ BUGÜN HENÜZ HAREKET YOK ★ VERİ 2 DAKİKADA BİR GELİR</span>]
    : items.map((it) => (
        <span key={it.key} className={`ticker-item ev-${it.kind}`}>
          <span className="star" aria-hidden="true">★</span>
          <span className="who">{upperTr(it.name)}</span>
          <span>{it.kind === 'active' ? 'AKTİF OLDU' : 'UZAKLAŞTI'}</span>
          <span className="when num">{it.when}</span>
        </span>
      ));

  const tail = items.slice(0, 6).reverse();

  return (
    <section aria-label="Bugünün hareketleri">
      <div className="ticker only-afis" style={{ ['--marquee' as string]: `${Math.max(24, items.length * 7)}s` }}>
        {items.length === 0 ? (
          band
        ) : (
          <div className="ticker-track">
            <span>{band}</span>
            <span aria-hidden="true">{band}</span>
          </div>
        )}
      </div>
      <ol className="log only-sinyal">
        {tail.length === 0 && <li><time>--:--</time><span>bugün henüz hareket yok</span></li>}
        {tail.map((it, i) => (
          <li key={it.key} className={`ev-${it.kind}`} style={{ ['--i' as string]: i }}>
            <time className="num">{it.when}</time>
            <span><b className="keep-case">{it.name}</b> {it.kind === 'active' ? 'aktif oldu' : 'uzaklaştı'}</span>
          </li>
        ))}
        <li className="prompt" style={{ ['--i' as string]: tail.length }} aria-hidden="true"><span>&gt;</span><span>izleniyor<span className="cursor" /></span></li>
      </ol>
    </section>
  );
}
