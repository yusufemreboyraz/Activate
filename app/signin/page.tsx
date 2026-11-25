import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { signInWithSlack } from '@/app/actions';
import { auth } from '@/auth';
import { Logo } from '@/components/brand/Logo';
import { ThemeSwitch } from '@/components/shell/ThemeSwitch';
import { parseTheme, THEME_COOKIE } from '@/lib/theme';

export const metadata: Metadata = { title: 'Giriş' };

const ERRORS: Record<string, { title: string; body: string }> = {
  AccessDenied: {
    title: 'Bu Slack hesabı bağlı bir ekipte bulunamadı.',
    body: 'Activate’e bağlı bir Slack workspace’inde kullandığın hesapla giriş yap. Emin değilsen, Activate linkini paylaşan kişiye sor.',
  },
  OAuthCallbackError: { title: 'Slack girişi yarıda kaldı.', body: 'Slack onay ekranında iptal edilmiş olabilir. Tekrar dene.' },
  Configuration: { title: 'Giriş şu an çalışmıyor.', body: 'Sunucu tarafında bir ayar eksik. Yöneticine haber ver.' },
};
const FALLBACK = { title: 'Giriş tamamlanamadı.', body: 'Bir şey ters gitti. Tekrar dene; sürerse yöneticine yaz.' };

type Props = { searchParams: Promise<{ error?: string; callbackUrl?: string }> };

export default async function SignInPage({ searchParams }: Props) {
  const { error, callbackUrl } = await searchParams;
  if ((await auth())?.user) redirect('/');
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  const problem = error ? ERRORS[error] ?? FALLBACK : null;
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
        <Logo href="/signin" />
        <ThemeSwitch initial={theme} />
      </div>

      <div className="poster-main">
        <ol className="boot only-sinyal" aria-hidden="true">
          <li style={{ ['--i' as string]: 0 }}>activate</li>
          <li style={{ ['--i' as string]: 1 }}>slack bağlantısı <span className="ok">hazır</span></li>
          <li style={{ ['--i' as string]: 2 }}>giriş bekleniyor…</li>
        </ol>

        <h1 className="poster-title">
          <span className="only-afis"><span className="row">Kim</span><span className="row"><span className="stk">burada?</span></span></span>
          <span className="only-sinyal"><span className="row">activate<span className="cursor" aria-hidden="true" /></span></span>
        </h1>

        <p className="poster-lead">
          Activate, ekibinden kimin Slack’te <em>şu an aktif</em> olduğunu ve bugün ne kadar aktif kaldığını gösterir.
        </p>
        <p className="poster-privacy">Herkes yalnızca üyesi olduğu Slack ekiplerini görür. Şifre yok: Slack hesabınla girersin.</p>

        {problem && (
          <div className="alert is-error" role="alert">
            <b>{problem.title}</b>
            <span>{problem.body}</span>
          </div>
        )}

        <form action={signInWithSlack} className="poster-actions">
          <input type="hidden" name="next" value={next} />
          <button type="submit" className="btn btn-pop">Slack ile giriş yap</button>
        </form>
      </div>

      <div className="poster-foot">
        <span>activate</span>
        <span>Slack durumları 2 dakikada bir okunur · Slack’te aktif görünmek çalışmak demek değildir</span>
      </div>

      <div className="badge only-afis" aria-hidden="true">2 dk’da<br />bir<br />yenilenir</div>
    </main>
  );
}
