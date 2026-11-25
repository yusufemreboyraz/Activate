export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" style={{ display: 'grid', gap: 28 }}>
      <span className="sr-only">Yükleniyor</span>
      <div className="only-afis" style={{ display: 'grid', gap: 18 }}>
        <div className="skel skel-line" />
        <div className="skel skel-hero" />
        <div className="skel-tiles">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skel skel-tile" />)}
        </div>
      </div>
      <p className="only-sinyal spin" aria-hidden="true"><i className="braille" /> yükleniyor</p>
    </div>
  );
}
