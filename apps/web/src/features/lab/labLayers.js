// Pure logic for layered anatomy views (Layer Explorer and Exploded View). No React, no rendering.
// Layers are ordered SUPERFICIAL -> DEEP. Depth works like a dissection: at depth d, layers shallower than d are
// peeled away and layer d is the surface. A learner can also switch layers on/off by hand (manual mode).

export const clamp01 = (n) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 1);
export const clampDepth = (d, count) => Math.max(0, Math.min(Math.max(0, count - 1), Math.round(Number.isFinite(d) ? d : 0)));

export const ORIGIN_LABEL = {
  curated_annotation: 'Anotasi anatomi terkurasi',
  illustrative_schematic: 'Skema ilustratif',
  dataset_segmentation: 'Segmentasi dari dataset',
  development_schematic: 'Skema pengembangan',
};

export function autoVisibility(layers, depth) {
  return Object.fromEntries(layers.map((l, i) => [l.id, i >= depth]));
}

// manual: null (follow depth) or { [id]: boolean }; opacity: { [id]: 0..1 } overrides the layer's default.
export function effectiveLayers(layers, { depth = 0, manual = null, opacity = {} } = {}) {
  const auto = autoVisibility(layers, depth);
  return layers.map((layer, index) => ({
    ...layer,
    index,
    visible: manual ? manual[layer.id] === true : auto[layer.id],
    opacity: clamp01(opacity[layer.id] ?? layer.opacity ?? 1),
  }));
}

// First manual edit starts from what the learner currently sees, then flips one layer.
export function toggleLayer(layers, depth, manual, id) {
  const start = manual || autoVisibility(layers, depth);
  return { ...start, [id]: !start[id] };
}

export function stepDepth(depth, count, dir) { return clampDepth(depth + dir, count); }

export function layerCaption(layers, depth) {
  const i = clampDepth(depth, layers.length);
  return `Lapisan ${i + 1} dari ${layers.length}: ${layers[i]?.name || ''}`;
}

export function guidedDepth(layers, step) {
  const i = layers.findIndex((l) => l.id === step?.layer);
  return i < 0 ? 0 : i;
}

// Exploded view: layers separate vertically around the middle of the stack; superficial on top.
// explode 0 = collapsed (all layers overlap), 1 = fully separated. `gap` (0..1) scales the total spread.
export function explodeOffsets(count, explode, gap, height) {
  const e = clamp01(explode); const spread = height * clamp01(gap);
  const step = count > 1 ? spread / (count - 1) : 0;
  return Array.from({ length: count }, (_, i) => {
    const dy = (i - (count - 1) / 2) * step * e;
    return { dy, dx: dy * 0.22 };
  });
}

// Dim everything but the selected structure; with nothing selected every layer keeps its own opacity.
export function highlightOpacity(layerOpacity, selectedId, id) {
  if (!selectedId || selectedId === id) return layerOpacity;
  return layerOpacity * 0.28;
}

// Keyboard shortcuts for the depth control: arrows/PageUp/PageDown/Home/End. Returns the new depth or null.
export function depthFromKey(key, depth, count) {
  if (key === 'ArrowRight' || key === 'ArrowDown' || key === 'PageDown') return stepDepth(depth, count, 1);
  if (key === 'ArrowLeft' || key === 'ArrowUp' || key === 'PageUp') return stepDepth(depth, count, -1);
  if (key === 'Home') return 0;
  if (key === 'End') return Math.max(0, count - 1);
  return null;
}
