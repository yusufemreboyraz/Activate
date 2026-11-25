import Link from 'next/link';

// Afiş: ACTI + a pink tilted VATE sticker. Sinyal: activate with a blinking cursor.
export function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="logo" aria-label="Activate, bugüne git">
      <span className="logo-afis only-afis" aria-hidden="true">
        ACTI<span className="logo-sticker">VATE</span>
      </span>
      <span className="logo-sinyal only-sinyal" aria-hidden="true">
        activate<span className="cursor" />
      </span>
    </Link>
  );
}
