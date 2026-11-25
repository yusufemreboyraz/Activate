'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { signOutAction } from '@/app/actions';
import { Avatar } from '@/components/brand/Avatar';

export function UserMenu({ name, email, image, isAdmin }: { name: string; email: string; image: string | null; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const first = name.split(/\s+/)[0] ?? name;

  return (
    <div className="menu" ref={ref}>
      <button ref={btn} type="button" className="menu-btn" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>
        <Avatar name={name} src={image} />
        <span>{first}</span>
        <span aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="menu-pop" id={id}>
          <div className="menu-who"><b>{name}</b><span>{email}</span></div>
          {isAdmin && (
            <a className="menu-item" href="/api/slack/install">
              <span aria-hidden="true">＋</span> Slack workspace bağla
            </a>
          )}
          <form action={signOutAction}>
            <button type="submit" className="menu-item"><span aria-hidden="true">←</span> Çıkış yap</button>
          </form>
        </div>
      )}
    </div>
  );
}
