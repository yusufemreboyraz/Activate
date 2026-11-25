import Link from 'next/link';

export default function NotFoundInApp() {
  return (
    <section className="empty">
      <h1 className="empty-big" style={{ ['--chars' as string]: 11 }}>Sayfa bulunamadı.</h1>
      <p>Bu bağlantıdaki kişi ya da sayfa yok. Bağlantı eski olabilir ya da bu kişi senin ekiplerinden birinde değil.</p>
      <div className="empty-actions"><Link className="btn" href="/">Bugüne dön</Link></div>
    </section>
  );
}
