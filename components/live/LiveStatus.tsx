'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

const REFRESH_MS = 30_000;
const STALE_MS = 6 * 60_000; // three missed 2-minute polls

function agoTr(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} sn önce`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m} dk önce` : `${Math.round(m / 60)} saat önce`;
}

// Re-renders the page every 30 seconds while the tab is visible, and shows how
// fresh the data is. The data itself changes every 2 minutes (Slack poll).
export function LiveStatus({ syncedAt }: { syncedAt: string | null }) {
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
    <span className={cls} title="Veri Slack'ten 2 dakikada bir okunur; sayfa 30 saniyede bir yenilenir.">
      <span className="live-dot" aria-hidden="true" />
      <span>
        {synced == null
          ? 'İlk veri bekleniyor'
          : ago == null
            ? 'Canlı'
            : stale
              ? `Son veri ${agoTr(ago)}`
              : pending
                ? 'Güncelleniyor'
                : `Canlı · ${agoTr(ago)} güncellendi`}
      </span>
    </span>
  );
}
