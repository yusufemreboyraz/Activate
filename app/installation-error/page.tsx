import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';

export const metadata: Metadata = { title: 'Bağlanamadı' };

const MESSAGES: Record<string, string> = {
  access_denied: 'Slack onay ekranında “İptal” seçildi. Hazır olduğunda tekrar başlat.',
  invalid_state: 'Bağlantı isteğinin süresi doldu. “Tekrar dene” ile yeniden başlat.',
  not_signed_in: 'Kurulumu tamamlamak için önce Activate’e Slack ile giriş yap.',
  team_not_allowed: 'Bu Slack workspace’i Activate’e bağlamaya izin verilmiyor.',
  token_exchange_failed: 'Slack yetkilendirmeyi tamamlamadı. Tekrar dene.',
  no_code: 'Slack’ten yetkilendirme kodu gelmedi. Tekrar dene.',
  config_error: 'Sunucu tarafında bir ayar eksik. Yöneticine haber ver.',
};

export default async function InstallError({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const message = (error && MESSAGES[error]) || 'Beklenmedik bir hata oluştu. Tekrar dene; sürerse yöneticine yaz.';
  return (
    <main id="main" className="poster">
      <div className="poster-top"><Logo /></div>
      <div className="poster-main">
        <h1 className="poster-title" style={{ ['--chars' as string]: 12 }}><span className="row"><span className="stk">Bağlanamadı.</span></span></h1>
        <div className="alert is-error" role="alert"><b>Slack workspace’i Activate’e bağlanmadı.</b><span>{message}</span></div>
        <div className="poster-actions">
          <a className="btn btn-pop" href="/api/slack/install">Tekrar dene</a>
          <Link className="btn btn-ghost" href="/">Bugüne dön</Link>
        </div>
      </div>
      <div className="poster-foot"><span>activate</span></div>
    </main>
  );
}
