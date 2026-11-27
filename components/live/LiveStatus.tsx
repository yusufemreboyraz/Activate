'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { messages, type Locale } from '@/lib/i18n';

const REFRESH_MS = 30_000;
const STALE_MS = 6 * 60_000; // three missed 2-minute polls

// Re-renders the page every 30 seconds while the tab is visible, and shows how
// fresh the data is. The data itself changes every 2 minutes (Slack poll).
export function LiveStatus({ syncedAt, locale }: { syncedAt: string | null; locale: Locale }) {
  const t = messages(locale).live;
  const agoText = (ms: number) => t.ago(Math.max(0, Math.round(ms / 1000)));
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [now, setNow] = useState<number | null>(null);
  const lastRefresh = useRef(Date.now());

  useEffect(() => {
    const refresh = () => {
      lastRefresh.current = Date.now();
      startTransition(() => router.refresh());
    };
    setNow(Date.now());
    const tick = setInterval(() => {
      setNow(Date.now());
      if (document.visibilityState === 'visible' && Date.now() - lastRefresh.current >= REFRESH_MS) refresh();
    }, 1000);
    const onVisible = () => { if (document.visibilityState === 'visible' && Date.now() - lastRefresh.current > 5000) refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(tick); document.removeEventListener('visibilitychange', onVisible); };
  }, [router]);

  const synced = syncedAt ? new Date(syncedAt).getTime() : null;
  const ago = now != null && synced != null ? now - synced : null;
  const stale = ago != null && ago > STALE_MS;
  const cls = `live${pending ? ' is-busy' : ''}${stale ? ' is-stale' : ''}`;

  return (
    <span className={cls} title={t.title}>
      <span className="live-dot" aria-hidden="true" />
      <span>
        {synced == null
          ? t.waiting
          : ago == null
            ? t.live
            : stale
              ? t.stale(agoText(ago))
              : t.fresh(agoText(ago))}
      </span>
    </span>
  );
}
