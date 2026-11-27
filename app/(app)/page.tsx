import Link from 'next/link';
import type { Metadata } from 'next';
import { Avatar } from '@/components/brand/Avatar';
import { DayStrip } from '@/components/brand/DayStrip';
import { Presence } from '@/components/brand/Presence';
import { Ticker } from '@/components/brand/Ticker';
import { Fresh } from '@/components/live/Fresh';
import { LiveStatus } from '@/components/live/LiveStatus';
import { DayNav } from '@/components/person/DayNav';
import { getWorkspaceDay, type PersonToday } from '@/lib/dashboard';
import { toneOf } from '@/lib/format';
import type { Formatter, Messages } from '@/lib/i18n';
import { getI18n } from '@/lib/locale';
import { getViewer, pickWorkspace } from '@/lib/viewer';
import { dateStringInZone, isDateString } from '@/lib/time';
import { signOutAction } from '@/app/actions';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ w?: string; d?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const viewer = await getViewer();
  const { w } = await searchParams;
  const { t } = await getI18n();
  const ws = viewer?.workspaces.find((x) => x.id === pickWorkspace(viewer, w));
  return { title: ws ? `${t.meta.team} · ${ws.name}` : t.meta.team };
}

function since(p: PersonToday, now: Date, isToday: boolean, t: Messages, f: Formatter): string {
  if (!isToday) return p.sessions.length ? t.state.sessions(p.sessions.length) : t.state.notActiveThatDay;
  if (p.presence === 'active') {
    return p.activeSince ? t.state.activeFor(now.getTime() - p.activeSince.getTime()) : t.state.activeNow;
  }
  if (p.lastSeen) {
    const day = dateStringInZone(p.lastSeen);
    return t.state.lastActive(`${day === dateStringInZone(now) ? '' : `${f.dayMonth(day)} `}${f.clock(p.lastSeen)}`);
  }
  return t.state.notSeen;
}

export default async function TodayPage({ searchParams }: Props) {
  const viewer = (await getViewer())!;
  const params = await searchParams;
  const { locale, t, f } = await getI18n();
  const tt = t.team;
  const wsId = pickWorkspace(viewer, params.w);

  if (!wsId) {
    return (
      <section className="empty">
        <h1 className="empty-big" style={{ ['--chars' as string]: 8 }}>{tt.noTeamTitle}</h1>
        <p>
          {tt.noTeamBody(viewer.email)}
          {viewer.isAdmin ? tt.noTeamAdmin : tt.noTeamMember}
        </p>
        <div className="empty-actions">
          {viewer.isAdmin && <a className="btn btn-pop" href="/api/slack/install">{t.menu.connect}</a>}
          <form action={signOutAction}><button type="submit" className="btn btn-ghost">{tt.otherAccount}</button></form>
        </div>
      </section>
    );
  }

  const ws = viewer.workspaces.find((w) => w.id === wsId)!;
  const now = new Date();
  const todayDate = dateStringInZone(now);
  const date = params.d && isDateString(params.d) && params.d < todayDate ? params.d : todayDate;
  const today = await getWorkspaceDay(wsId, date, now, viewer.email);
  const total = f.duration(today.totalMs);
  const liveCap = tt.liveCap(today.people.length, today.activeCount);
  const live = today.isToday;
  const base = `/?w=${wsId}`;
  const hrefFor = (d: string) => (d === todayDate ? base : `${base}&d=${d}`);
  const withPeople = today.people.filter((p) => p.todayMs > 0).length;
  const pastCap = tt.pastCap(f.dayMonth(date), today.people.length, withPeople);

  return (
    <>
      <DayNav date={date} today={todayDate} hrefFor={hrefFor} base={base} label={tt.dayNav} locale={locale} />

      <section className="hero" aria-labelledby="hero-title">
        <p className="kicker">
          <span className="keep-case">{ws.name}</span>
          <span className="dot" aria-hidden="true" />
          {live ? <LiveStatus syncedAt={today.syncedAt?.toISOString() ?? null} locale={locale} /> : <span>{tt.summary}</span>}
        </p>
        {live ? (
          <>
            <h1 id="hero-title" className="hero-num num">
              <Fresh value={today.activeCount}>{today.activeCount}</Fresh>
              <span className="of">/{today.people.length}</span> <span className="word">{tt.word}</span>
              <span className="sr-only">{tt.srNow}</span>
            </h1>
            <p className="hero-cap">
              {liveCap[0]}
              <b className="num"><Fresh value={total}>{total}</Fresh></b>{liveCap[1]}
            </p>
          </>
        ) : (
          <>
            <h1 id="hero-title" className="hero-num num">
              <span className="sr-only">{tt.pastSr(f.dayMonth(date))}</span>
              {total}
            </h1>
            <p className="hero-cap">
              {pastCap[0]}
              <b className="num">{total}</b>{pastCap[1]}
            </p>
          </>
        )}
      </section>

      <Ticker events={today.events} live={live} locale={locale} />

      <section className="block" aria-labelledby="team-title">
        <div className="block-head">
          <h2 id="team-title">{tt.title}</h2>
          <p>
            {tt.order(live)} ·{' '}
            <span className="only-afis">{tt.stripAfis(live)}</span>
            <span className="only-sinyal">{tt.stripSinyal(live)}</span>
          </p>
        </div>

        {today.people.length === 0 ? (
          <div className="empty">
            <p className="empty-big" style={{ ['--chars' as string]: 7 }}>{tt.firstDataTitle}</p>
            <p>{tt.firstDataBody}</p>
          </div>
        ) : (
          <ul className="people">
            {today.people.map((p, i) => {
              const time = f.durationShown(p.todayMs);
              // Today the card shows presence now; another day, whether they were active then.
              const state = live ? p.presence : p.todayMs > 0 ? 'active' : 'away';
              return (
                <li key={p.userId} className={`person tone-${toneOf(p.userId)} is-${state}${p.isYou ? ' is-you' : ''}`} style={{ ['--i' as string]: i }}>
                  <Link className="person-link" href={`/users/${p.userId}?w=${wsId}${live ? '' : `&d=${date}`}`}>
                    <Avatar name={p.name} src={p.image} />
                    <span className="person-name">
                      <span className="keep-case">{p.name}</span>
                      {p.isYou && <span className="you">{tt.you}</span>}
                      {p.isGuest && <span className="guest" title={tt.guestTitle}>{tt.guest}</span>}
                    </span>
                    {live && <Presence value={p.presence} locale={locale} />}
                    <span className={`person-time num${p.todayMs ? '' : ' zero'}`}>
                      <span className="sr-only">{live ? tt.srToday : tt.srOn(f.dayMonth(date))}</span>
                      <Fresh value={time}>{time}</Fresh>
                    </span>
                    <span className="person-since">{since(p, now, live, t, f)}</span>
                    <DayStrip sessions={p.sessions} nowMin={today.nowMin} locale={locale} />
                    <span className="person-go" aria-hidden="true">→</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="note">{tt.note}</p>
    </>
  );
}
