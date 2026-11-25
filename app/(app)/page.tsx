import Link from 'next/link';
import type { Metadata } from 'next';
import { Avatar } from '@/components/brand/Avatar';
import { DayStrip } from '@/components/brand/DayStrip';
import { Presence } from '@/components/brand/Presence';
import { Ticker } from '@/components/brand/Ticker';
import { Fresh } from '@/components/live/Fresh';
import { LiveStatus } from '@/components/live/LiveStatus';
import { getWorkspaceToday, type PersonToday } from '@/lib/dashboard';
import { clockTr, dayMonthTr, durationShown, durationSinceTr, durationTr, toneOf, weekdayTr } from '@/lib/format';
import { getViewer, pickWorkspace } from '@/lib/viewer';
import { dateStringInZone } from '@/lib/time';
import { signOutAction } from '@/app/actions';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ w?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const viewer = await getViewer();
  const { w } = await searchParams;
  const ws = viewer?.workspaces.find((x) => x.id === pickWorkspace(viewer, w));
  return { title: ws ? `Bugün · ${ws.name}` : 'Bugün' };
}

function since(p: PersonToday, now: Date): string {
  if (p.presence === 'active') {
    return p.activeSince ? `${durationSinceTr(now.getTime() - p.activeSince.getTime())} aktif` : 'şu an aktif';
  }
  if (p.lastSeen) {
    const day = dateStringInZone(p.lastSeen);
    return `son aktif ${day === dateStringInZone(now) ? '' : `${dayMonthTr(day)} `}${clockTr(p.lastSeen)}`;
  }
  return 'henüz görülmedi';
}

export default async function TodayPage({ searchParams }: Props) {
  const viewer = (await getViewer())!;
  const wsId = pickWorkspace(viewer, (await searchParams).w);

  if (!wsId) {
    return (
      <section className="empty">
        <h1 className="empty-big" style={{ ['--chars' as string]: 8 }}>Henüz bir ekibin yok.</h1>
        <p>
          {viewer.email} adresi, Activate’e bağlı hiçbir Slack ekibinde üye olarak görünmüyor.
          {viewer.isAdmin
            ? ' Bir Slack workspace’i bağlayarak başla.'
            : ' Ekibinin Slack’te kullandığın hesabıyla girdiğinden emin ol; olmadıysa Activate linkini paylaşan kişiye sor.'}
        </p>
        <div className="empty-actions">
          {viewer.isAdmin && <a className="btn btn-pop" href="/api/slack/install">Slack workspace bağla</a>}
          <form action={signOutAction}><button type="submit" className="btn btn-ghost">Başka hesapla giriş yap</button></form>
        </div>
      </section>
    );
  }

  const ws = viewer.workspaces.find((w) => w.id === wsId)!;
  const now = new Date();
  const today = await getWorkspaceToday(wsId, now);
  const total = durationTr(today.totalMs);

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <p className="kicker">
          <span>{weekdayTr(today.date)}</span>
          <span className="dot" aria-hidden="true" />
          <span>{dayMonthTr(today.date)}</span>
          <span className="dot" aria-hidden="true" />
          <span className="keep-case">{ws.name}</span>
          <span className="dot" aria-hidden="true" />
          <LiveStatus syncedAt={today.syncedAt?.toISOString() ?? null} />
        </p>
        <h1 id="hero-title" className="hero-num num">
          <Fresh value={today.activeCount}>{today.activeCount}</Fresh>
          <span className="of">/{today.people.length}</span> <span className="word">aktif</span>
          <span className="sr-only"> kişi şu an Slack’te</span>
        </h1>
        <p className="hero-cap">
          {today.people.length} kişiden {today.activeCount} kişi şu an Slack’te aktif. Ekip bugün toplam{' '}
          <b className="num"><Fresh value={total}>{total}</Fresh></b> aktifti.
        </p>
      </section>

      <Ticker events={today.events} />

      <section className="block" aria-labelledby="team-title">
        <div className="block-head">
          <h2 id="team-title">Ekip</h2>
          <p>
            Önce şu an aktif olanlar, sonra alfabetik ·{' '}
            <span className="only-afis">şerit: günün 24 saati, siyah = aktif, pembe çizgi = şimdi</span>
            <span className="only-sinyal">şerit: günün 24 saati, █ = aktif, sarı = şimdi</span>
          </p>
        </div>

        {today.people.length === 0 ? (
          <div className="empty">
            <p className="empty-big" style={{ ['--chars' as string]: 7 }}>İlk veri yolda.</p>
            <p>Workspace bağlandı ama Slack’ten henüz okuma gelmedi. İlk okuma 2 dakika içinde gelir; sayfa kendini yeniler.</p>
          </div>
        ) : (
          <ul className="people">
            {today.people.map((p, i) => {
              const time = durationShown(p.todayMs);
              return (
                <li key={p.userId} className={`person tone-${toneOf(p.userId)} is-${p.presence}`} style={{ ['--i' as string]: i }}>
                  <Link className="person-link" href={`/users/${p.userId}?w=${wsId}`}>
                    <Avatar name={p.name} src={p.image} />
                    <span className="person-name">
                      <span className="keep-case">{p.name}</span>
                      {p.isGuest && <span className="guest" title="Bu kişi Slack’te misafir hesapla bulunuyor">Slack misafiri</span>}
                    </span>
                    <Presence value={p.presence} />
                    <span className={`person-time num${p.todayMs ? '' : ' zero'}`}>
                      <span className="sr-only">bugün </span>
                      <Fresh value={time}>{time}</Fresh>
                    </span>
                    <span className="person-since">{since(p, now)}</span>
                    <DayStrip sessions={p.sessions} nowMin={today.nowMin} />
                    <span className="person-go" aria-hidden="true">→</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="note">
        Süreler, Slack’te yeşil “aktif” noktasıyla göründüğün zamandır: Slack açık ve kullanılıyorken aktif sayılırsın.
        Toplantıda, telefonda ya da odaklanmış çalışırken burada görünmeyebilirsin. Bu bir çalışma süresi ölçümü değildir; liste kimseyi sıralamaz.
      </p>
    </>
  );
}
