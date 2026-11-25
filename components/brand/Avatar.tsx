/* eslint-disable @next/next/no-img-element -- Slack CDN avatars; next/image adds nothing for a 46px print. */
import { initials } from '@/lib/format';

export function Avatar({ name, src, className = '' }: { name: string; src?: string | null; className?: string }) {
  return (
    <span className={`avatar ${src ? 'has-img' : ''} ${className}`} aria-hidden="true">
      {src ? <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" /> : initials(name)}
    </span>
  );
}
