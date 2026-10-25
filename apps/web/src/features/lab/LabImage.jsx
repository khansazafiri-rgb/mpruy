import { useState } from 'react';

export default function LabImage({ asset, question = false, point, onPoint, region }) {
  const [zoom, setZoom] = useState(1);
  const [layers, setLayers] = useState({ anatomy: false, abnormality: false });
  const [broken, setBroken] = useState(false);
  function keyPoint(e) {
    const moves = { ArrowLeft: [-0.02, 0], ArrowRight: [0.02, 0], ArrowUp: [0, -0.02], ArrowDown: [0, 0.02] };
    if (!onPoint || !moves[e.key]) return;
    e.preventDefault(); const [dx, dy] = moves[e.key];
    onPoint({ x: Math.max(0, Math.min(1, (point?.x ?? 0.5) + dx)), y: Math.max(0, Math.min(1, (point?.y ?? 0.5) + dy)) });
  }
  const overlay = (r) => ({ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.width * 100}%`, height: `${r.height * 100}%` });
  return <figure className="space-y-3">
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <label className="flex items-center gap-2">Zoom <input aria-label="Zoom gambar" type="range" min="1" max="3" step="0.25" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} /> {Math.round(zoom * 100)}%</label>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setZoom(1); if (onPoint) onPoint(null); }}>Reset</button>
      {!question && ['abnormality', 'anatomy'].map((k) => <label key={k} className="flex items-center gap-2"><input type="checkbox" checked={layers[k]} onChange={(e) => setLayers({ ...layers, [k]: e.target.checked })} />{k === 'anatomy' ? 'Anatomi' : 'Temuan'}</label>)}
    </div>
    <div className="max-h-[65vh] overflow-auto rounded-2xl border border-line bg-page" tabIndex={0} aria-label="Area gambar; gulir untuk menggeser saat diperbesar">
      <div style={{ width: `${zoom * 100}%` }} className="relative">
        <img src={asset.url} alt={asset.alt} className="block h-auto w-full" draggable={false} onError={() => setBroken(true)} />
        {onPoint && !broken && <div role="button" tabIndex={0} aria-label="Pilih titik pada gambar dengan klik atau tombol panah" className="absolute inset-0 cursor-crosshair focus:outline focus:outline-2 focus:outline-brand" onKeyDown={keyPoint} onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onPoint({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }); }} />}
        {!question && (asset.annotations || []).filter((a) => layers[a.layer]).map((a) => <div key={a.id} style={overlay(a.region)} className="pointer-events-none absolute rounded border-2 border-amber-500 bg-amber-300/20"><span className="absolute left-0 top-0 rounded bg-amber-100 px-1 text-xs text-black">{a.label}</span></div>)}
        {region && <div className="pointer-events-none absolute border-4 border-brand bg-brand/20" style={overlay(region)} />}
        {point && <div className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-coral shadow" style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }} />}
      </div>
    </div>
    {broken && <p role="alert" className="text-coral">Gambar gagal dimuat. Muat ulang halaman atau hubungi admin.</p>}
    <figcaption className="text-xs leading-relaxed text-ink-muted">{asset.synthetic && <strong>Ilustrasi sintetis, bukan gambar pasien. </strong>}{asset.license?.citation || asset.license?.source} · {asset.license?.license}{asset.license?.source_url?.startsWith('https://') && <> · <a href={asset.license.source_url} target="_blank" rel="noreferrer" className="underline">Sumber & lisensi</a></>}</figcaption>
    {onPoint && <p className="text-sm text-ink-muted" aria-live="polite">{point ? `Titik: ${Math.round(point.x * 100)}%, ${Math.round(point.y * 100)}%.` : 'Klik gambar atau fokuskan area gambar lalu gunakan tombol panah.'} Geser dengan bilah gulir saat diperbesar.</p>}
  </figure>;
}
