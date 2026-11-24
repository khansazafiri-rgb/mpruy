// Copy of apps/4d-lab/tools/bp3d-review-materials.mjs (MEDCOEL-authored presentation colours). tests/bp3d.test.js keeps the two identical.
// Presentation only. Official geometry and neutral source GLBs are immutable.
// MEDCOEL educational palette: distinguish organs and tissue classes, not an in-vivo colour claim.
// Unknown/ambiguous source identities retain a neutral material.
export const TISSUE_MATERIALS = Object.freeze({
  bone: { color: 0xe9dcc3, roughness: 0.80 },
  muscle: { color: 0xad4e50, roughness: 0.78 },
  fascia: { color: 0xd4bda9, roughness: 0.83 },
  adipose: { color: 0xf0cf65, roughness: 0.78 },
  mesentery: { color: 0xe4c58a, roughness: 0.82 },
  peritoneum: { color: 0xe2c8b0, roughness: 0.83 },
  cartilage: { color: 0x9ebfc8, roughness: 0.72 },
  ligament: { color: 0xc4b28f, roughness: 0.83 },
  tendon: { color: 0xe1d1b4, roughness: 0.79 },
  nerve: { color: 0xe7bd50, roughness: 0.78 },
  brain: { color: 0xcaa7a0, roughness: 0.78 },
  spinalCord: { color: 0xe1c6b0, roughness: 0.80 },
  artery: { color: 0xd43e48, roughness: 0.71 },
  vein: { color: 0x3e6cbb, roughness: 0.73 },
  vessel: { color: 0xa58b91, roughness: 0.83 },
  heart: { color: 0xa93949, roughness: 0.74 },
  heartValve: { color: 0xe4c9a8, roughness: 0.78 },
  lung: { color: 0xd991a0, roughness: 0.79 },
  airway: { color: 0xd1b9b3, roughness: 0.76 },
  pleura: { color: 0xd4b5b4, roughness: 0.80 },
  liver: { color: 0x854538, roughness: 0.77 },
  gallbladder: { color: 0x769d54, roughness: 0.76 },
  kidney: { color: 0x9e4553, roughness: 0.77 },
  urinary: { color: 0xcfa48d, roughness: 0.79 },
  stomach: { color: 0xcb897e, roughness: 0.78 },
  intestine: { color: 0xd39c87, roughness: 0.80 },
  pancreas: { color: 0xd2a366, roughness: 0.82 },
  spleen: { color: 0x875279, roughness: 0.78 },
  endocrine: { color: 0xc28460, roughness: 0.81 },
  reproductive: { color: 0xc2878e, roughness: 0.79 },
  organ: { color: 0xc69e8c, roughness: 0.82 },
  lymphatic: { color: 0x4b9c72, roughness: 0.78 },
  joint: { color: 0xa7b7bd, roughness: 0.82 },
  unknown: { color: 0xc8cbd0, roughness: 0.85 },
});
export const SYSTEM_MATERIALS = Object.freeze({
  skeletal: 0xe9dcc3, muscular: 0xad4e50, joints: 0x9ebfc8,
  cardiovascular: 0xd43e48, lymphatic: 0x4b9c72, visceral: 0xc69e8c,
  nervous: 0xe7bd50,
});
export const NEUTRAL_MATERIAL = Object.freeze({ color: 0xc8cbd0, roughness: 0.85 });

export function tissueClass({ name = '', system = '', group = '' } = {}) {
  const words = String(name).toLowerCase().replace(/[^a-z]+/g, ' ');
  // Explicit fat and serosal tissue before intestinal/organ rules.
  // Do not recolor vessels, nerves or lymph nodes simply because they traverse fat.
  if (!/\b(artery|arteries|vein|veins|nerve|nerves|lymph node|lymph nodes|lymphatic vessel)\b/.test(words)) {
    if (/\b(adipose tissue|adipose body|fat pad|fat pads|fat body|fatty tissue|subcutaneous fat|visceral fat|perirenal fat|pararenal fat|epicardial fat|orbital fat|buccal fat|fat)\b/.test(words)) return 'adipose';
    if (/\b(mesentery|mesenterium|mesocolon|omentum|omenta|mesoappendix)\b/.test(words)) return 'mesentery';
    if (/\b(peritoneum|peritoneal fold|peritoneal folds|serosa)\b/.test(words)) return 'peritoneum';
  }
  // Vessel identity wins over the name of the organ it supplies. Do not
  // interpret a generic vessel or a nerve canal as a named organ.
  if (system === 'cardiovascular') {
    if (/\b(artery|arteries|arterial|arteriole|aorta)\b/.test(words)) return 'artery';
    if (/\b(vein|veins|venous|venule|vena cava)\b/.test(words)) return 'vein';
    if (group === 'arterial') return 'artery';
    if (group === 'venous') return 'vein';
    if (/\b(valve|leaflet|chordae tendineae)\b/.test(words)) return 'heartValve';
    if (group === 'heart' || /\b(heart|atrium|atria|ventricle|ventricular|myocardium|myocardial|papillary muscle|endocardium|epicardium)\b/.test(words)) return 'heart';
    return 'vessel';
  }
  if (system === 'nervous') {
    if (/\b(central canal|ventricular system|cavity|ventricle|ventricles)\b/.test(words)) return 'unknown';
    if (/\b(nerve|nerves|nerve plexus|ganglion|ganglia|nerve root)\b/.test(words)) return 'nerve';
    if (/\b(spinal cord|medulla spinalis)\b/.test(words)) return 'spinalCord';
    if (/\b(brain|forebrain|midbrain|hindbrain|cerebrum|cerebral|cerebellum|cerebellar|thalamus|hypothalamus|pons|medulla oblongata|fornix)\b/.test(words)) return 'brain';
    return 'unknown';
  }
  if (system === 'lymphatic') {
    if (/\bspleen\b/.test(words)) return 'spleen';
    return 'lymphatic';
  }
  if (system === 'visceral') {
    if (/\b(artery|arteries|arteriole)\b/.test(words)) return 'artery';
    if (/\b(vein|veins|venule)\b/.test(words)) return 'vein';
    if (/\b(nerve|nerves)\b/.test(words)) return 'nerve';
    if (/\b(cartilage|cartilages)\b/.test(words)) return 'cartilage';
    if (/\b(lung|lungs|pulmonary lobe|bronchopulmonary segment|alveolus|alveoli)\b/.test(words)) return 'lung';
    if (/\b(pleura|pleural)\b/.test(words)) return 'pleura';
    if (/\b(trachea|tracheal|bronchus|bronchi|bronchial|bronchiole|larynx|laryngeal|epiglottis|nasal cavity)\b/.test(words)) return 'airway';
    if (/\b(gallbladder|gall bladder|cystic duct|bile duct)\b/.test(words)) return 'gallbladder';
    if (/\b(liver|hepatic lobe)\b/.test(words)) return 'liver';
    if (/\b(kidney|renal cortex|renal medulla|renal pyramid)\b/.test(words)) return 'kidney';
    if (/\b(ureter|urethra|urinary bladder|renal pelvis|renal calyx)\b/.test(words)) return 'urinary';
    if (/\b(pancreas|pancreatic)\b/.test(words)) return 'pancreas';
    if (/\bspleen\b/.test(words)) return 'spleen';
    if (/\b(stomach|gastric wall|gastric fundus|pylorus)\b/.test(words)) return 'stomach';
    if (/\b(intestine|intestinal|duodenum|jejunum|ileum|colon|rectum|caecum|cecum|appendix|oesophagus|esophagus)\b/.test(words)) return 'intestine';
    if (group === 'endocrine' || /\b(thyroid gland|parathyroid|adrenal|suprarenal|pituitary|hypophysis|pineal gland)\b/.test(words)) return 'endocrine';
    if (group === 'reproductive') return 'reproductive';
    if (group === 'respiratory') return 'airway';
    if (group === 'urinary') return 'urinary';
    return 'organ';
  }
  if (/\b(tendon|tendons|aponeurosis)\b/.test(words)) return 'tendon';
  if (/\b(ligament|ligaments)\b/.test(words)) return 'ligament';
  if (/\b(cartilage|cartilages|meniscus|menisci)\b/.test(words)) return 'cartilage';
  if (/\b(fascia|fasciae|retinaculum)\b/.test(words)) return 'fascia';
  if (/\b(nerve|nerves)\b/.test(words)) return 'nerve';
  if (/\b(muscle|muscles)\b/.test(words)) return 'muscle';
  if (system === 'skeletal') return 'bone';
  if (system === 'muscular') return 'muscle';
  if (system === 'joints') return 'joint';
  return 'unknown';
}

export function materialFor(entry, mode = 'tissue') {
  if (mode === 'neutral') return NEUTRAL_MATERIAL;
  if (mode === 'system') return { color: SYSTEM_MATERIALS[entry.system] ?? NEUTRAL_MATERIAL.color, roughness: 0.85 };
  if (mode !== 'tissue') throw new Error('Unknown review material mode');
  return TISSUE_MATERIALS[tissueClass(entry)];
}
