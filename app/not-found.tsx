import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';

export default function NotFound() {
  return (
    <main id="main" className="poster">
      <div className="poster-top"><Logo /></div>
      <div className="poster-main">
        <h1 className="poster-title"><span className="row">Sayfa</span><span className="row"><span className="stk">yok.</span></span></h1>
        <p className="poster-lead">Bu bağlantıda bir sayfa bulunamadı. Bağlantı eski ya da eksik olabilir.</p>
        <div className="poster-actions"><Link className="btn" href="/">Bugüne dön</Link></div>
      </div>
      <div className="poster-foot"><span>activate</span></div>
    </main>
  );
}
