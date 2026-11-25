import type { Presence as P } from '@/lib/dashboard';

const WORD: Record<P, string> = { active: 'aktif', away: 'uzakta', unknown: 'bilinmiyor' };

// One state, printed twice: a sticker for Afiş, a mark and a word for Sinyal.
// The word is always there, so colour never carries the state alone.
export function Presence({ value, className = '' }: { value: P; className?: string }) {
  return (
    <span className={`presence ${className}`}>
      <span className={`sticker only-afis is-${value}`}>
        {value === 'active' && <span aria-hidden="true">●</span>}
        {WORD[value]}
      </span>
      <span className={`sig only-sinyal is-${value}`}>
        <span className="sig-mark" aria-hidden="true">{value === 'active' ? '●' : '○'}</span>
        <span className="sr-only">{WORD[value]}</span>
      </span>
    </span>
  );
}

export function presenceWord(value: P): string {
  return WORD[value];
}
