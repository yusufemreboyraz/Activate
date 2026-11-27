import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { signInWithLink } from '@/app/actions';
import { Logo } from '@/components/brand/Logo';
import { LangSwitch } from '@/components/shell/LangSwitch';
import { ThemeSwitch } from '@/components/shell/ThemeSwitch';
import { getI18n } from '@/lib/locale';
import { parseTheme, THEME_COOKIE } from '@/lib/theme';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.meta.linkSignIn };
}

// Reached from the /activate reply in Slack. The token is only used when the
// button is pressed (POST), never on page load.
export default async function LinkSignIn({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  const { locale, t: msg } = await getI18n();
  const tl = msg.link;
  return (
    <main id="main" className="poster">
      <div className="poster-top">
        <Logo href="/signin" locale={locale} />
        <div className="poster-switches">
          <LangSwitch initial={locale} />
          <ThemeSwitch initial={theme} locale={locale} />
        </div>
      </div>
      <div className="poster-main">
        <h1 className="poster-title" style={{ ['--chars' as string]: 7 }}>
          <span className="row">{tl.title[0]}</span>
          <span className="row"><span className="stk">{tl.title[1]}</span></span>
        </h1>
        <p className="poster-lead">{tl.lead}</p>
        {t ? (
          <form action={signInWithLink} className="poster-actions">
            <input type="hidden" name="token" value={t} />
            <button type="submit" className="btn btn-pop">{tl.button}</button>
          </form>
        ) : (
          <div className="alert is-error" role="alert">
            <b>{tl.missingTitle}</b>
            <span>{tl.missingBody}</span>
          </div>
        )}
      </div>
      <div className="poster-foot"><span>activate</span></div>
    </main>
  );
}
