import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { JetBrains_Mono, Manrope, Space_Mono, Syne } from 'next/font/google';
import { parseTheme, THEME_COOKIE } from '@/lib/theme';
import { getI18n } from '@/lib/locale';
import './styles/tokens.css';
import './styles/base.css';
import './styles/app.css';

const syne = Syne({ subsets: ['latin', 'latin-ext'], variable: '--font-syne', display: 'swap' });
const manrope = Manrope({ subsets: ['latin', 'latin-ext'], variable: '--font-manrope', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin', 'latin-ext'], variable: '--font-jetbrains', display: 'swap' });
const spaceMono = Space_Mono({ subsets: ['latin', 'latin-ext'], weight: ['400', '700'], variable: '--font-spacemono', display: 'swap' });

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: { default: 'Activate', template: '%s · Activate' },
    description: t.meta.description,
    robots: { index: false, follow: false },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return { themeColor: theme === 'sinyal' ? '#1d2df0' : '#f1eee4' };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  const { locale, t } = await getI18n();
  return (
    <html lang={locale} data-theme={theme} className={`${syne.variable} ${manrope.variable} ${jetbrains.variable} ${spaceMono.variable}`}>
      <body>
        <a className="skip" href="#main">{t.skip}</a>
        {children}
      </body>
    </html>
  );
}
