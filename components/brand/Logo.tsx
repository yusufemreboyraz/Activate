import Link from 'next/link';

// The mark: a geometric "a" (ring bowl + stem) with the presence dot in its
// counter. Ring and stem take the ink colour, the dot the theme's "active"
// colour. Same drawing as app/icon.svg and brand/slack-icon.svg.
export function LogoMark({ className = 'logo-mark' }: { className?: string }) {
  return (
    <svg className={className} viewBox="11 14 40 40" aria-hidden="true" focusable="false">
      <circle cx="31" cy="34" r="15" fill="none" stroke="currentColor" strokeWidth="10" />
      <rect x="41" y="14" width="10" height="40" fill="currentColor" />
      <circle className="logo-dot" cx="31" cy="34" r="5" />
    </svg>
  );
}

// Afiş: mark + ACTIVATE in Syne. Sinyal: mark + activate with a blinking cursor.
// The Afiş word is written in capitals in the source: CSS upper-casing under
// lang="tr" would print "ACTİVATE".
export function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="logo" aria-label="Activate, bugüne git">
      <LogoMark />
      <span className="logo-word only-afis" aria-hidden="true">ACTIVATE</span>
      <span className="logo-word only-sinyal" aria-hidden="true">
        activate<span className="cursor" />
      </span>
    </Link>
  );
}
