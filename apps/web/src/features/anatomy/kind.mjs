// Structure "kind": the thing a structure is (tooth, rib, vertebra, nerve, artery, ligament...).
// System and region alone are too coarse for quiz distractors: teeth sit in the skeletal system,
// so a tooth question used to get skull bones as distractors and the answer was obvious.
// The kind is read from the anatomical head noun of the English name ("X of Y" -> head of X).

const PLURAL = {
  arteries: 'artery', veins: 'vein', nerves: 'nerve', nodes: 'node', muscles: 'muscle', ligaments: 'ligament',
  joints: 'joint', gyri: 'gyrus', sulci: 'sulcus', branches: 'branch', ribs: 'rib', bones: 'bone', bursae: 'bursa',
  glands: 'gland', ducts: 'duct', tendons: 'tendon', phalanges: 'phalanx', capsules: 'capsule', teeth: 'tooth',
};
// Head nouns that already name a kind on their own, per catalogue group. Anything else in these groups
// falls back to the group's generic kind (e.g. "Clavicle" -> bone, "Extensor digitorum" -> muscle).
const OWN = {
  skeletal: ['rib', 'vertebra', 'phalanx', 'cartilage', 'cells', 'concha', 'sacrum', 'coccyx', 'hyoid', 'sternum'],
  muscular: ['fascia', 'retinaculum', 'tendon', 'bursa', 'sheath', 'aponeurosis', 'head', 'part', 'belly', 'septum', 'raphe'],
  joints: ['ligament', 'capsule', 'disc', 'meniscus', 'labrum', 'membrane', 'pulposus', 'joint', 'bursa'],
  arterial: ['branch', 'arch', 'trunk', 'anastomosis', 'network', 'plexus'],
  venous: ['sinus', 'branch', 'arch', 'network', 'plexus'],
  heart: [],
  nervous: ['nerve', 'branch', 'gyrus', 'sulcus', 'lobule', 'nucleus', 'tract', 'plexus', 'ganglion', 'ventricle', 'peduncle', 'gland', 'eyeball', 'cortex'],
  lymphatic: ['node', 'tonsil', 'thymus'],
  digestive: ['gland', 'duct', 'segment', 'colon', 'tooth'],
  respiratory: ['bronchus', 'lobe', 'segment'],
};
// Brain and sense-organ parts keep their own head noun (body, nucleus, canaliculus...), never "nerve".
const GENERIC = { skeletal: 'bone', muscular: 'muscle', joints: 'joint', arterial: 'artery', venous: 'vein', lymphatic: 'node' };

const clean = (name) => String(name || '').toLowerCase()
  .replace(/\s*\((left|right)\)\s*$/, '')
  .replace(/\([^)]*\)/g, ' ')
  .replace(/\b[ctls]\d{1,2}(\s*-\s*[ctls]?\d{1,2})?\b/g, ' ')
  .replace(/[*.,]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export function structureKind(row) {
  const raw = String(row?.name || '').toLowerCase();
  const name = clean(row?.name);
  const group = row?.group || row?.system || '';
  if (/\bnerve \((i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii)\)/.test(raw)) return 'cranial-nerve';
  if (/\b(incisors?|canines?|premolars?|molars?|tooth|teeth)\b/.test(name)) return 'tooth';
  if (/\bvertebra\b/.test(name)) return 'vertebra';
  if (/^costal cartilage\b/.test(name)) return 'costal-cartilage';
  if (/\bsegmental bronchus\b/.test(name)) return 'segmental-bronchus';
  if (/\bsegment of liver\b/.test(name)) return 'liver-segment';
  if (/\bphalanx\b/.test(name)) return 'phalanx';
  if (/\b(metacarpal|metatarsal)\b/.test(name) && /\bbone\b/.test(name)) return 'metapodial';
  const before = name.split(' of ')[0].trim();
  let head = before.split(' ').pop() || '';
  head = PLURAL[head] || head;
  if (['artery', 'vein', 'nerve', 'muscle', 'ligament', 'node', 'bone'].includes(head)) return head;
  if ((OWN[group] || []).includes(head)) return group + ':' + head;
  return GENERIC[group] || group + ':' + (head || 'structure');
}
