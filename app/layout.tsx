import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { JetBrains_Mono, Manrope, Space_Mono, Syne } from 'next/font/google';
import { parseTheme, THEME_COOKIE } from '@/lib/theme';
import './styles/tokens.css';
import './styles/base.css';
import './styles/app.css';

const syne = Syne({ subsets: ['latin', 'latin-ext'], variable: '--font-syne', display: 'swap' });
const manrope = Manrope({ subsets: ['latin', 'latin-ext'], variable: '--font-manrope', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin', 'latin-ext'], variable: '--font-jetbrains', display: 'swap' });
const spaceMono = Space_Mono({ subsets: ['latin', 'latin-ext'], weight: ['400', '700'], variable: '--font-spacemono', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Activate', template: '%s · Activate' },
  description: 'Ekibin Slack’te ne zaman aktif olduğunu canlı gösterir.',
  robots: { index: false, follow: false },
};

export async function generateViewport(): Promise<Viewport> {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return { themeColor: theme === 'sinyal' ? '#1d2df0' : '#f1eee4' };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html lang="tr" data-theme={theme} className={`${syne.variable} ${manrope.variable} ${jetbrains.variable} ${spaceMono.variable}`}>
      <body>
        <a className="skip" href="#main">İçeriğe geç</a>
        {children}
      </body>
    </html>
  );
}
