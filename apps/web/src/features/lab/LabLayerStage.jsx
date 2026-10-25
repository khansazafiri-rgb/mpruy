import { Schematic } from './devSchematics';

// Draws resolved layers (asset image or built-in schematic) as stacked SVG groups, deepest first so the surface is on top.
// `items`: [{ id, name, href?, schematic?, visible, opacity, dx?, dy?, scale? }]. Rendering only; state lives in the callers.
export default function LabLayerStage({ items, viewBox = '0 0 400 400', label, selectedId = '', onSelect, showPlanes = false, showLabels = false, className = '' }) {
  const ordered = [...items].reverse();
  return <svg viewBox={viewBox} role="img" aria-label={label} className={`mx-auto block h-auto w-full ${className}`} style={{ maxHeight: '70vh' }}>
    {ordered.map((l) => {
      if (!l.visible) return null;
      const s = l.scale ?? 1; const dx = l.dx || 0; const dy = l.dy || 0; const sel = selectedId === l.id;
      return <g key={l.id} data-layer={l.id} opacity={l.opacity} transform={`translate(${200 + dx} ${200 + dy}) scale(${s}) translate(-200 -200)`} onClick={onSelect ? () => onSelect(l.id) : undefined} style={onSelect ? { cursor: 'pointer' } : undefined}>
        {showPlanes && <rect x="40" y="30" width="320" height="350" rx="16" fill="none" stroke={sel ? '#0b6b57' : '#7b8794'} strokeWidth={sel ? 5 : 2} strokeDasharray={sel ? undefined : '8 6'} opacity=".7" />}
        {l.schematic ? <Schematic id={l.schematic} /> : <image href={l.href} x="0" y="0" width="400" height="400" preserveAspectRatio="xMidYMid meet" />}
        {showLabels && <text x="372" y="62" textAnchor="end" fontSize="22" fontWeight="700" fill="#18313a" stroke="#fff" strokeWidth="5" paintOrder="stroke">{l.name}</text>}
      </g>;
    })}
  </svg>;
}
