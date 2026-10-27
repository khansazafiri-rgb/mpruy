// Susunan akademik MEDCOEL Lab. Siswa menelusuri Disiplin → Topik → Modul;
// nama dataset (MedMNIST, dll.) hanya muncul di rincian sumber, bukan di navigasi.
//
// Konten lama memakai kunci domain (imaging, histology, ...) dan nama lama
// ("Medical Imaging", "Anatomi Interaktif"). Konten authoring memakai judul katalog.
// Keduanya dipetakan ke nama kanonik di bawah supaya tampil di satu tempat.

export const DISCIPLINES = [
  { key: 'pencitraan-medis', title: 'Pencitraan Medis', legacy: ['imaging'], aliases: ['pencitraan medis', 'medical imaging', 'imaging', 'radiologi'] },
  { key: 'oftalmologi', title: 'Oftalmologi', legacy: [], aliases: ['oftalmologi', 'ophthalmology'] },
  { key: 'histologi-histopatologi', title: 'Histologi & Histopatologi', legacy: ['histology'], aliases: ['histologi & histopatologi', 'histologi dan histopatologi', 'histologi', 'histopatologi', 'histology'] },
  { key: 'patologi-klinik', title: 'Patologi Klinik', legacy: ['clinical_pathology'], aliases: ['patologi klinik', 'clinical pathology'] },
  { key: 'mikrobiologi', title: 'Mikrobiologi', legacy: ['microbiology'], aliases: ['mikrobiologi', 'microbiology'] },
  { key: 'parasitologi', title: 'Parasitologi', legacy: ['parasitology'], aliases: ['parasitologi', 'parasitology'] },
  { key: 'anatomi', title: 'Anatomi', legacy: ['anatomy'], aliases: ['anatomi', 'anatomi interaktif', 'anatomy'] },
];

const squash = (value) => String(value || '').normalize('NFKC').toLocaleLowerCase().replace(/\bdan\b/g, ' ').replace(/[^a-z0-9]+/g, '');
const BY_ALIAS = new Map(DISCIPLINES.flatMap((d) => [...d.aliases, d.title].map((alias) => [squash(alias), d])));
const BY_LEGACY = new Map(DISCIPLINES.flatMap((d) => d.legacy.map((key) => [key, d])));

export const disciplineByKey = (key) => DISCIPLINES.find((d) => d.key === key) || null;

// Nama kanonik untuk kunci domain lama; kunci tak dikenal dikembalikan apa adanya.
export function legacyDomainTitle(key) {
  return BY_LEGACY.get(key)?.title || key || '';
}

// Disiplin kanonik sebuah item Explore (materi lama berkunci domain, modul authored berjudul domain).
export function disciplineOf(item) {
  return BY_LEGACY.get(item?.domain) || BY_ALIAS.get(squash(item?.domainTitle)) || null;
}

// Kelompokkan item per disiplin (urutan kanonik) lalu per topik (urutan pertama muncul).
// Disiplin tanpa item masuk `soon`. Item dari disiplin yang tidak dikenal tidak dibuang:
// ditaruh setelah disiplin kanonik supaya konten terbit tidak pernah hilang dari Explore.
export function groupByDiscipline(items = []) {
  const buckets = new Map(); const order = [];
  const add = (key, title, item) => {
    if (!buckets.has(key)) { buckets.set(key, { key, title, topics: new Map(), count: 0 }); order.push(key); }
    const bucket = buckets.get(key); const topic = String(item.modality || '').trim();
    if (!bucket.topics.has(topic)) bucket.topics.set(topic, []);
    bucket.topics.get(topic).push(item); bucket.count += 1;
  };
  for (const item of items) {
    const d = disciplineOf(item);
    if (d) add(d.key, d.title, item);
    else add(`lain:${squash(item.domainTitle || item.domain) || 'umum'}`, item.domainTitle || legacyDomainTitle(item.domain) || 'Topik lain', item);
  }
  const rank = (key) => { const i = DISCIPLINES.findIndex((d) => d.key === key); return i < 0 ? DISCIPLINES.length : i; };
  const groups = order.map((key) => buckets.get(key)).sort((a, b) => rank(a.key) - rank(b.key))
    .map((g) => ({ key: g.key, title: g.title, count: g.count, topics: [...g.topics].map(([title, list]) => ({ title, items: list })) }));
  const soon = DISCIPLINES.filter((d) => !buckets.has(d.key));
  return { groups, soon };
}
