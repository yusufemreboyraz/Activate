import { getI18n } from '@/lib/locale';

export async function Footer() {
  const { t } = await getI18n();
  return (
    <footer className="foot">
      <div className="foot-in">
        <span><b>activate</b></span>
        <span>{t.footer.poll}</span>
        <span>{t.footer.honest}</span>
      </div>
    </footer>
  );
}
