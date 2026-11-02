// Study groups describe the meshes supplied by Z-Anatomy, not additional assets.
export const REGIONS = [
  ["whole", "Seluruh tubuh", "Semua regio"],
  ["headNeck", "Kepala & leher", "Tengkorak, wajah, dan leher"],
  ["thorax", "Toraks", "Dada dan mediastinum"],
  ["abdomen", "Abdomen", "Dinding perut dan organnya"],
  ["pelvis", "Pelvis", "Panggul dan perineum"],
  ["upperLimb", "Ekstremitas atas", "Bahu sampai ujung jari"],
  ["lowerLimb", "Ekstremitas bawah", "Pinggul sampai jari kaki"],
  ["back", "Punggung", "Kolumna vertebralis dan otot punggung"],
];
export const GROUPS = [
  {
    id: "muscular",
    label: "Otot & fasia",
    source: "muscular",
    color: "#d79583",
    layers: [
      "Fasia & jaringan ikat",
      "Otot superfisial",
      "Otot intermedia",
      "Otot profunda",
    ],
  },
  {
    id: "skeletal",
    label: "Rangka",
    source: "skeletal",
    color: "#eee3ce",
    layers: ["Tulang"],
  },
  {
    id: "joints",
    label: "Sendi & ligamen",
    source: "joints",
    color: "#b6c8d0",
    layers: ["Struktur sendi"],
  },
  {
    id: "arterial",
    label: "Arteri",
    source: "cardiovascular",
    color: "#ee7b83",
    layers: ["Arteri kecil", "Arteri regional", "Pembuluh besar"],
  },
  {
    id: "venous",
    label: "Vena",
    source: "cardiovascular",
    color: "#80a8ef",
    layers: ["Vena perifer", "Vena regional", "Vena sentral"],
  },
  {
    id: "heart",
    label: "Jantung",
    source: "cardiovascular",
    color: "#e88d9d",
    layers: ["Struktur jantung"],
  },
  {
    id: "nervous",
    label: "Saraf & indra",
    source: "nervous",
    color: "#e4c875",
    layers: [
      "Cabang perifer",
      "Saraf utama & pleksus",
      "Saraf pusat & indra",
    ],
  },
  {
    id: "lymphatic",
    label: "Sistem limfatik",
    source: "lymphatic",
    color: "#9fcbaa",
    layers: ["Organ limfoid"],
  },
  {
    id: "respiratory",
    label: "Sistem pernapasan",
    source: "visceral",
    color: "#b8a5da",
    layers: ["Struktur pernapasan"],
  },
  {
    id: "digestive",
    label: "Sistem pencernaan",
    source: "visceral",
    color: "#dfb483",
    layers: ["Struktur pencernaan"],
  },
  {
    id: "urinary",
    label: "Sistem kemih",
    source: "visceral",
    color: "#ca9f7a",
    layers: ["Struktur kemih"],
  },
  {
    id: "reproductive",
    label: "Sistem reproduksi",
    source: "visceral",
    color: "#d79eaf",
    layers: ["Struktur pria yang tersedia"],
  },
  {
    id: "endocrine",
    label: "Sistem endokrin",
    source: "visceral",
    color: "#b5abdb",
    layers: ["Kelenjar endokrin"],
  },
];
export function groupFor(name, source) {
  const n = name.toLowerCase();
  if (source === "cardiovascular") {
    if (
      /atrium|ventricle|leaflet|valve|papillary|chordae|heart|aortic sinus/.test(
        n,
      )
    )
      return "heart";
    if (/vein|venous|vena |sinus/.test(n)) return "venous";
    return "arterial";
  }
  if (source !== "visceral") return source;
  if (/hypophysis|parathyroid|pineal|suprarenal|thyroid gland/.test(n))
    return "endocrine";
  if (/kidney|renal pelvis|ureter|urethra|urinary bladder/.test(n))
    return "urinary";
  if (/penis|testis|prostate|seminal|epididymis|deferens|ejaculatory/.test(n))
    return "reproductive";
  if (/lung|bronch|trachea|pleura|epiglottis|nasal cavity/.test(n))
    return "respiratory";
  return "digestive";
}
const COVERING =
  /fascia|aponeurosis|retinacul|septum|bursa|tendon|tendinous|sheath|ligament|linea alba|tarsus|iliopectineal arch|iliotibial tract|trochlea/;
const SUPERFICIAL =
  /platysma|frontalis|occipitalis|temporoparietalis|orbicularis|corrugator|depressor|levator (anguli|labii|nasolabialis)|mentalis|nasalis|procerus|risorius|zygomaticus|trapezius|latissimus|pectoralis major|deltoid|external abdominal oblique|rectus abdominis|gluteus maximus|tensor fasciae|sartorius|rectus femoris|gracilis|gastrocnemius|palmaris longus|superficial head/;
const INTERMEDIATE =
  /sternocleidomastoid|sternohyoid|omohyoid|sternothyroid|thyrohyoid|digastric|stylohyoid|mylohyoid|superficial part of masseter|temporalis|splenius|rhomboid|levator scapulae|pectoralis minor|serratus anterior|external intercostal|internal abdominal oblique|biceps|triceps|brachioradialis|flexor carpi|extensor carpi|extensor digitorum|flexor digitorum superficialis|gluteus medius|adductor longus|vastus (lateralis|medialis)|semitendinosus|semimembranosus|soleus|fibularis longus|tibialis anterior/;
export function layerFor(name, group) {
  const n = name.toLowerCase();
  if (group === "muscular")
    return COVERING.test(n)
      ? 0
      : SUPERFICIAL.test(n)
        ? 1
        : INTERMEDIATE.test(n)
          ? 2
          : 3;
  if (group === "nervous") {
    if (
      /brain|cerebr|cerebell|spinal cord|medulla|pons|thalam|hypothalam|ventricle|mening|dura|arachnoid|pia mater|eye|retina|lens|cornea|optic|cochlea|vestibul|tympan|ossicle|sclera|choroid|iris|pupil|olfactory/.test(
        n,
      )
    )
      return 2;
    if (
      /plexus|sciatic|femoral nerve|median nerve|ulnar nerve|radial nerve|tibial nerve|common fibular|vagus|phrenic|trigeminal|facial nerve|hypoglossal|accessory nerve|sympathetic trunk/.test(
        n,
      )
    )
      return 1;
    return 0;
  }
  if (group === "arterial" || group === "venous") {
    if (
      /aorta|vena cava|pulmonary (arter|vein|trunk)|brachiocephalic|common carotid|subclavian/.test(
        n,
      )
    )
      return 2;
    if (
      /(axillary|brachial|radial|ulnar|femoral|popliteal|tibial|iliac|jugular|renal|hepatic|portal|mesenteric|coronary|carotid|vertebral|basilar) (artery|vein)|saphenous|cephalic vein|basilic vein/.test(
        n,
      )
    )
      return 1;
    return 0;
  }
  return 0;
}
export function visibleBySettings(meta, settings) {
  const entry = settings.groups[meta.group];
  return (
    !!entry?.enabled &&
    meta.layer >= entry.removed &&
    (settings.region === "whole" || meta.regions.includes(settings.region))
  );
}
export function initialSettings() {
  return {
    region: "whole",
    groups: Object.fromEntries(
      GROUPS.map((g) => [
        g.id,
        { enabled: ["muscular", "skeletal"].includes(g.id), removed: 0 },
      ]),
    ),
  };
}
export const ALIASES = {
  ulna: ["tulang hasta"],
  radius: ["tulang pengumpil"],
  femur: ["tulang paha"],
  tibia: ["tulang kering"],
  fibula: ["tulang betis"],
  humerus: ["lengan atas"],
  heart: ["jantung", "cor"],
  stomach: ["lambung", "gaster"],
  liver: ["hati", "hepar"],
  lung: ["paru", "pulmo"],
  kidney: ["ginjal", "ren"],
  brain: ["otak"],
  oesophagus: ["esofagus", "kerongkongan"],
  trachea: ["trakea"],
  thyroid: ["tiroid"],
  pancreas: ["pankreas"],
  colon: ["usus besar"],
  jejunum: ["usus halus"],
  duodenum: ["usus dua belas jari"],
  platysma: ["platisma"],
  sternocleidomastoid: ["scm"],
  scapula: ["belikat"],
  clavicle: ["selangka"],
  sternum: ["dada"],
  patella: ["tempurung lutut"],
};
