import { Component, lazy, Suspense } from 'react';
import { ProvenanceBanner } from './LabLayerExplorer';

// The WebGL viewer and three.js live in their own chunk: students who never open a 3D lesson never download them.
const Canvas = lazy(() => import('./LabModel3DCanvas'));

export function webglAvailable() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch { return false; }
}

class Boundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function Fallback({ block, reason }) {
  return <div className="card space-y-2 p-5" role="status"><p className="font-semibold">Model 3D tidak dapat ditampilkan</p><p className="text-sm text-ink-muted">{reason}</p>{block.fallback && <p className="text-sm">{block.fallback}</p>}</div>;
}

export default function LabModel3D({ block, asset }) {
  if (!asset?.url) return <Fallback block={block} reason="Berkas model belum tersedia." />;
  if (!webglAvailable()) return <Fallback block={block} reason="Peramban atau perangkat ini tidak mendukung WebGL." />;
  const fallback = <Fallback block={block} reason="Model gagal dimuat. Muat ulang halaman atau coba perangkat lain." />;
  return <section className="min-w-0 max-w-full space-y-3 overflow-hidden" aria-label={`Model 3D: ${block.title}`}>
    <header><h3 className="text-lg font-bold">{block.title}</h3></header>
    <ProvenanceBanner block={block} />
    <Boundary fallback={fallback}><Suspense fallback={<div className="grid h-64 place-items-center rounded-2xl border border-line bg-page text-sm text-ink-muted">Memuat penampil 3D…</div>}><Canvas block={block} asset={asset} /></Suspense></Boundary>
  </section>;
}
