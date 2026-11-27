import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { signInWithSlack } from '@/app/actions';
import { auth } from '@/auth';
import { Logo } from '@/components/brand/Logo';
import { LangSwitch } from '@/components/shell/LangSwitch';
import { ThemeSwitch } from '@/components/shell/ThemeSwitch';
import { getI18n } from '@/lib/locale';
import { parseTheme, THEME_COOKIE } from '@/lib/theme';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.meta.signIn };
}

type Props = { searchParams: Promise<{ error?: string; callbackUrl?: string }> };

export default async function SignInPage({ searchParams }: Props) {
  const { error, callbackUrl } = await searchParams;
  if ((await auth())?.user) redirect('/');
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  const { locale, t } = await getI18n();
  const ts = t.signin;
  const problem = error ? ts.errors[error] ?? ts.fallback : null;
  let next = '/';
  try {
    if (callbackUrl) {
      const u = new URL(callbackUrl, 'https://x.invalid');
      next = u.pathname + u.search;
    }
  } catch { /* keep "/" */ }

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
        <ol className="boot only-sinyal" aria-hidden="true">
          <li style={{ ['--i' as string]: 0 }}>{ts.boot1} <span className="ok">{ts.ready}</span></li>
          <li style={{ ['--i' as string]: 1 }}>{ts.boot2}</li>
        </ol>

        <h1 className="poster-title" style={{ ['--chars' as string]: 8 }}>
          <span className="only-afis"><span className="row">{ts.title[0]}</span><span className="row"><span className="stk">{ts.title[1]}</span></span></span>
          <span className="only-sinyal"><span className="row">activate<span className="cursor" aria-hidden="true" /></span></span>
        </h1>

        <p className="poster-lead">
          {ts.leadBefore}<em>{ts.leadEm}</em>{ts.leadAfter}
        </p>
        <p className="poster-privacy">{ts.privacy}</p>

        {problem && (
          <div className="alert is-error" role="alert">
            <b>{problem.title}</b>
            <span>{problem.body}</span>
          </div>
        )}

        <form action={signInWithSlack} className="poster-actions">
          <input type="hidden" name="next" value={next} />
          <button type="submit" className="btn btn-pop">{ts.button}</button>
        </form>
        <p className="poster-fine">
          {ts.fineBefore}<b>/activate</b>{ts.fineAfter}
        </p>
      </div>

      <div className="poster-foot">
        <span>activate</span>
        <span>{ts.foot}</span>
      </div>

      <div className="badge only-afis" aria-hidden="true">{ts.badge[0]}<br />{ts.badge[1]}<br />{ts.badge[2]}</div>
    </main>
  );
}
