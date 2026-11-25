import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Avatar } from '@/components/brand/Avatar';
import { DayStrip, sessionSpan } from '@/components/brand/DayStrip';
import { Heatmap } from '@/components/brand/Heatmap';
import { Presence } from '@/components/brand/Presence';
import { WeekBars } from '@/components/brand/WeekBars';
import { DayNav } from '@/components/person/DayNav';
import { canAccessWorkspace } from '@/lib/access';
import { getPersonDay } from '@/lib/dashboard';
import { clockTr, dayMonthTr, durationShown, durationSinceTr, durationTr, toneOf } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { dateStringInZone, isDateString } from '@/lib/time';
import { getViewer } from '@/lib/viewer';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ userId: string }>; searchParams: Promise<{ d?: string; w?: string }> };

async function load(userId: string) {
  const viewer = await getViewer();
  if (!viewer) return null;
  const status = await prisma.userStatus.findUnique({ where: { userId }, select: { workspaceId: true, name: true, realName: true } });
  if (!status || !(await canAccessWorkspace(viewer.email, status.workspaceId))) return null;
  return { viewer, status };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await load((await params).userId);
  return { title: found ? found.status.realName || found.status.name : 'Bulunamadı' };
}

export default async function PersonPage({ params, searchParams }: Props) {
  const { userId } = await params;
  const { d } = await searchParams;
  const found = await load(userId);
  if (!found) notFound();

  const wsId = found.status.workspaceId;
  const now = new Date();
  const today = dateStringInZone(now);
  const date = d && isDateString(d) && d <= today ? d : today;
  const day = await getPersonDay(userId, wsId, date, now);
  if (!day) notFound();

  const base = `/users/${userId}?w=${wsId}`;
  const hrefFor = (x: string) => (x === today ? base : `${base}&d=${x}`);
  const p = day.person;

  const nowLine =
    p.presence === 'active'
      ? p.activeSince ? `${durationSinceTr(now.getTime() - p.activeSince.getTime())} aktif` : 'şu an aktif'
      : p.lastSeen ? `son aktif ${dateStringInZone(p.lastSeen) === today ? '' : `${dayMonthTr(dateStringInZone(p.lastSeen))} `}${clockTr(p.lastSeen)}` : 'henüz görülmedi';

  const firstLabel = day.sessions[0] ? sessionSpan(day.sessions[0]).from : '–';
  const lastLabel = day.sessions.length === 0 ? '–' : day.lastEnd ? sessionSpan(day.sessions[day.sessions.length - 1]!).to : 'şu an';

  return (
    <>
      <Link className="back" href={day.isToday ? `/?w=${wsId}` : `/?w=${wsId}&d=${date}`}><span className="arrow" aria-hidden="true">←</span> Tüm ekip</Link>

      <header className={`phead tone-${toneOf(userId)} is-${p.presence}`} style={{ ['--tile' as string]: `var(--tone-${toneOf(userId)})` }}>
        <Avatar name={p.name} src={p.image} />
        <h1>{p.name}</h1>
        <div className="phead-meta">
          <Presence value={p.presence} />
          <span>{nowLine}</span>
        </div>
      </header>

      <DayNav date={date} today={today} hrefFor={hrefFor} base={base} />

      <dl className="stats">
        <div className="stat is-main"><dt>Toplam</dt><dd className={`num${day.totalMs ? '' : ' zero'}`}>{durationShown(day.totalMs)}</dd></div>
        <div className="stat"><dt>Aktif aralık</dt><dd className={`num${day.sessions.length ? '' : ' zero'}`}>{day.sessions.length || '—'}</dd></div>
        <div className="stat"><dt>En uzun</dt><dd className={`num${day.longestMs ? '' : ' zero'}`}>{durationShown(day.longestMs)}</dd></div>
        <div className="stat"><dt>İlk</dt><dd className="num">{firstLabel}</dd></div>
        <div className="stat"><dt>Son</dt><dd className="num">{lastLabel}</dd></div>
      </dl>

      <section className="block timeline" aria-labelledby="day-title">
        <div className="block-head">
          <h2 id="day-title">Gün</h2>
          <p>00:00’dan 24:00’a, Slack’te aktif olduğu aralıklar</p>
        </div>
        <DayStrip sessions={day.sessions} nowMin={day.nowMin} size="large" />
      </section>

      <div className="two">
        <section className="block" aria-labelledby="sessions-title">
          <div className="block-head">
            <h2 id="sessions-title">Aralıklar</h2>
            <p>{day.sessions.length ? `${day.sessions.length} aktif aralık` : 'Aktif aralık yok'}</p>
          </div>
          {day.sessions.length === 0 ? (
            <p className="note">{day.isToday ? 'Bugün henüz Slack’te aktif olmadı.' : 'Bu gün Slack’te aktif değildi.'}</p>
          ) : (
            <ol className="sessions">
              {day.sessions.map((s, i) => {
                const span = sessionSpan(s);
                return (
                  <li key={i} style={{ ['--i' as string]: i }}>
                    <span className="span num">{span.from}<span className="arrow" aria-label=" ile ">→</span>{span.to}</span>
                    <span className="len">
                      <span className="sticker only-afis">{span.length}</span>
                      <span className="only-sinyal">{span.length}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="block" aria-labelledby="week-title">
          <div className="block-head">
            <h2 id="week-title">Hafta</h2>
            <p>Toplam {durationTr(day.weekTotalMs)}</p>
          </div>
          <WeekBars week={day.week} selected={date} today={today} hrefFor={hrefFor} />
        </section>
      </div>

      <section className="block" aria-labelledby="year-title">
        <div className="block-head">
          <h2 id="year-title">{date.slice(0, 4)}</h2>
          <p>Her kare bir gün; bir kareye tıkla, o güne git</p>
        </div>
        <Heatmap days={day.year} selected={date} today={today} hrefFor={hrefFor} />
      </section>
    </>
  );
}
