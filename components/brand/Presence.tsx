import type { Presence as P } from '@/lib/dashboard';
import { messages, type Locale } from '@/lib/i18n';

// One state, printed twice: a sticker for Afiş, a mark and a word for Sinyal.
// The word is always there, so colour never carries the state alone.
export function Presence({ value, locale, className = '' }: { value: P; locale: Locale; className?: string }) {
  const word = messages(locale).presence[value];
  return (
    <span className={`presence ${className}`}>
      <span className={`sticker only-afis is-${value}`}>
        {value === 'active' && <span aria-hidden="true">●</span>}
        {word}
      </span>
      <span className={`sig only-sinyal is-${value}`}>
        <span className="sig-mark" aria-hidden="true">{value === 'active' ? '●' : '○'}</span>
        <span className="sr-only">{word}</span>
      </span>
    </span>
  );
}
