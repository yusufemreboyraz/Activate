import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { signInWithLink } from '@/app/actions';
import { Logo } from '@/components/brand/Logo';
import { ThemeSwitch } from '@/components/shell/ThemeSwitch';
import { parseTheme, THEME_COOKIE } from '@/lib/theme';

export const metadata: Metadata = { title: 'Slack bağlantısıyla giriş' };

// Reached from the /activate reply in Slack. The token is only used when the
// button is pressed (POST), never on page load.
export default async function LinkSignIn({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <main id="main" className="poster">
      <div className="poster-top">
        <Logo href="/signin" />
        <ThemeSwitch initial={theme} />
      </div>
      <div className="poster-main">
        <h1 className="poster-title" style={{ ['--chars' as string]: 7 }}>
          <span className="row">Slack’ten</span>
          <span className="row"><span className="stk">geldin.</span></span>
        </h1>
        <p className="poster-lead">Bağlantın hazır. Tek dokunuşla Activate’e gir; bağlantı bir kez kullanılabilir ve 10 dakika geçerlidir.</p>
        {t ? (
          <form action={signInWithLink} className="poster-actions">
            <input type="hidden" name="token" value={t} />
            <button type="submit" className="btn btn-pop">Activate’e gir</button>
          </form>
        ) : (
          <div className="alert is-error" role="alert">
            <b>Bağlantı eksik.</b>
            <span>Slack’te /activate yazıp gelen bağlantıyı aç.</span>
          </div>
        )}
      </div>
      <div className="poster-foot"><span>activate</span></div>
    </main>
  );
}
