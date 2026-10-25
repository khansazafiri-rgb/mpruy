import { Schematic } from './devSchematics';

// Draws resolved layers (asset image or built-in schematic) as stacked SVG groups, deepest first so the surface is on top.
// `items`: [{ id, name, href?, schematic?, visible, opacity, dx?, dy?, sx?, sy?, x0?, y0?, labelX? }].
// Layers are authored on a 400x400 canvas; (x0, y0) is where that canvas's centre lands in the viewBox and
// (sx, sy) flatten it for the oblique exploded view. Hidden layers stay mounted at opacity 0 so showing/hiding and
// exploding are smooth transitions (disabled under prefers-reduced-motion). Rendering only; state lives in the callers.
export default function LabLayerStage({ items, viewBox = '0 0 400 400', label, selectedId = '', onSelect, showPlanes = false, showLabels = false, className = '' }) {
  const ordered = [...items].reverse();
  return <svg viewBox={viewBox} role="img" aria-label={label} className={`mx-auto block h-auto w-full ${className}`} style={{ maxHeight: '70vh' }}>
    {ordered.map((l) => {
      const sx = l.sx ?? 1; const sy = l.sy ?? 1; const cx = (l.x0 ?? 200) + (l.dx || 0); const cy = (l.y0 ?? 200) + (l.dy || 0); const sel = selectedId === l.id;
      return <g key={l.id} data-layer={l.id} data-visible={l.visible ? 'true' : 'false'} aria-hidden={!l.visible} className="lab-layer" onClick={onSelect && l.visible ? () => onSelect(l.id) : undefined} style={{ opacity: l.visible ? l.opacity : 0, pointerEvents: l.visible ? 'auto' : 'none', cursor: onSelect ? 'pointer' : undefined, transition: 'opacity .35s ease' }}>
        <g className="lab-layer-move" style={{ transform: `translate(${cx}px, ${cy}px) scale(${sx}, ${sy}) translate(-200px, -200px)`, transition: 'transform .4s ease' }}>
          {showPlanes && <rect x="40" y="30" width="320" height="350" rx="16" fill="none" stroke={sel ? '#0b6b57' : '#7b8794'} strokeWidth={sel ? 4 : 1.5} strokeDasharray={sel ? undefined : '8 6'} vectorEffect="non-scaling-stroke" opacity=".8" />}
          {l.schematic ? <Schematic id={l.schematic} /> : <image href={l.href} x="0" y="0" width="400" height="400" preserveAspectRatio="xMidYMid meet" />}
        </g>
        {showLabels && l.labelX !== undefined && <text x={l.labelX} y={cy + 5} fontSize="15" fontWeight={sel ? 700 : 500} fill="#18313a" stroke="#fff" strokeWidth="4" paintOrder="stroke" style={{ transition: 'y .4s ease' }}>{l.name}</text>}
      </g>;
    })}
  </svg>;
}
