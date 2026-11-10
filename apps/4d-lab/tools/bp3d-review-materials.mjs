// Presentation only. Official geometry and neutral source GLBs are immutable.
// Classification uses explicit catalog system/group and structure terminology;
// uncertain identities retain a neutral tissue class for human review.
export const TISSUE_MATERIALS = Object.freeze({
  bone: { color: 0xddd1b9, roughness: 0.91 },
  muscle: { color: 0xa95c61, roughness: 0.94 },
  cartilage: { color: 0x9eb9b9, roughness: 0.86 },
  ligament: { color: 0xb9a887, roughness: 0.93 },
  tendon: { color: 0xc6bba2, roughness: 0.89 },
  nerve: { color: 0xd5b976, roughness: 0.93 },
  artery: { color: 0xb66b67, roughness: 0.9 },
  vein: { color: 0x758ea9, roughness: 0.9 },
  vessel: { color: 0xa58b91, roughness: 0.91 },
  organ: { color: 0xbba186, roughness: 0.94 },
  lymphatic: { color: 0x8da78c, roughness: 0.9 },
  joint: { color: 0x9facad, roughness: 0.9 },
  unknown: { color: 0xc8cbd0, roughness: 0.92 },
});
export const SYSTEM_MATERIALS = Object.freeze({
  skeletal: 0xe8d8b6, muscular: 0xbd626d, joints: 0x75b6c4,
  cardiovascular: 0xcc6671, lymphatic: 0x77bd8e, visceral: 0xd2a36b,
});
export const NEUTRAL_MATERIAL = Object.freeze({ color: 0xc8cbd0, roughness: 0.92 });

export function tissueClass({ name = '', system = '', group = '' } = {}) {
  const words = String(name).toLowerCase().replace(/[^a-z]+/g, ' ');
  const has = word => new RegExp('\\b' + word + 's?\\b').test(words);
  // Explicit identity wins over a broad system label. Unknown terms stay
  // neutral; do not guess artery versus vein from a generic vessel name.
  if (has('tendon')) return 'tendon';
  if (has('ligament')) return 'ligament';
  if (has('cartilage')) return 'cartilage';
  if (has('nerve')) return 'nerve';
  if (has('muscle')) return 'muscle';
  if (system === 'cardiovascular') {
    if (has('artery') || /\barteries\b/.test(words) || group === 'arterial') return 'artery';
    if (has('vein') || group === 'venous') return 'vein';
    if (group === 'heart') return 'organ';
    return 'vessel';
  }
  if (system === 'skeletal') return 'bone';
  if (system === 'muscular') return 'muscle';
  if (system === 'joints') return 'joint';
  if (system === 'lymphatic') return 'lymphatic';
  if (system === 'visceral') return 'organ';
  return 'unknown';
}

export function materialFor(entry, mode = 'tissue') {
  if (mode === 'neutral') return NEUTRAL_MATERIAL;
  if (mode === 'system') return { color: SYSTEM_MATERIALS[entry.system] ?? NEUTRAL_MATERIAL.color, roughness: 0.92 };
  if (mode !== 'tissue') throw new Error('Unknown review material mode');
  return TISSUE_MATERIALS[tissueClass(entry)];
}
