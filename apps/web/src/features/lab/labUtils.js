// Fungsi murni untuk Lab (tanpa React) supaya mudah diuji dan dipakai ulang oleh blok visual lain.

// Label kelas contoh (mis. normal / pneumonia). Aset lama tidak punya field label,
// jadi dibaca dari judul "... · normal" atau alt "... label dataset 'normal'".
export function assetLabel(asset) {
  // Structured dataset metadata is authoritative; title/alt parsing remains only for content created by the older importer.
  if (asset?.dataset?.label) return String(asset.dataset.label).trim().toLowerCase();
  if (asset?.label) return String(asset.label).trim().toLowerCase();
  const fromTitle = /·\s*([^·]+?)\s*$/.exec(asset?.title || '');
  if (fromTitle) return fromTitle[1].toLowerCase();
  const fromAlt = /label dataset '([^']+)'/i.exec(asset?.alt || '');
  return fromAlt ? fromAlt[1].toLowerCase() : '';
}

// Blood source labels stay English in provenance; gallery headings use the teaching labels.
const bloodLabels = { basophil: 'Basofil', eosinophil: 'Eosinofil', erythroblast: 'Eritroblas',
  'immature granulocytes': 'Granulosit imatur', lymphocyte: 'Limfosit', monocyte: 'Monosit',
  neutrophil: 'Neutrofil', platelet: 'Trombosit' };
const pathLabels = { adipose: 'Jaringan adiposa', background: 'Latar belakang', debris: 'Debris jaringan',
  lymphocytes: 'Limfosit', mucus: 'Mukus', 'smooth muscle': 'Otot polos',
  'normal colon mucosa': 'Mukosa kolon normal', 'cancer-associated stroma': 'Stroma terkait kanker',
  'colorectal adenocarcinoma epithelium': 'Epitel adenokarsinoma kolorektal' };
const octLabels = { 'choroidal neovascularization': 'Choroidal neovascularization (CNV)',
  'diabetic macular edema': 'Diabetic macular edema (DME)', drusen: 'Drusen', normal: 'Normal' };
const teachingLabels = { BloodMNIST: bloodLabels, PathMNIST: pathLabels, OCTMNIST: octLabels };
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

// Kelompokkan aset per label. "normal" selalu di depan; tanpa label -> satu kelompok umum.
export function groupAssets(assets = [], modality = '') {
  const order = []; const map = new Map();
  for (const asset of assets) {
    const key = assetLabel(asset);
    if (!map.has(key)) { map.set(key, []); order.push(key); }
    map.get(key).push(asset);
  }
  order.sort((a, b) => (a === 'normal' ? -1 : b === 'normal' ? 1 : 0));
  return order.map((key) => ({
    key,
    title: teachingLabels[map.get(key)[0]?.dataset?.name]?.[key] || (key ? cap(key) : 'Contoh gambar'),
    subtitle: key ? modality : '',
    items: map.get(key).map((asset, i) => ({ asset, caseNo: i + 1 })),
  }));
}

// Ukuran gambar yang pas: rasio asli, maks 900px lebar, ~70% tinggi layar,
// dan tidak diperbesar lebih dari `maxUpscale` kali ukuran aslinya.
export function fittedSize(nw, nh, boxW, viewH, { maxW = 900, maxVh = 0.7, maxUpscale = 2.5 } = {}) {
  if (!nw || !nh) return null;
  const limitW = Math.min(boxW > 0 ? boxW : maxW, maxW, nw * maxUpscale);
  const limitH = Math.min((viewH > 0 ? viewH : 800) * maxVh, nh * maxUpscale);
  const scale = Math.min(limitW / nw, limitH / nh);
  return { w: Math.max(1, Math.round(nw * scale)), h: Math.max(1, Math.round(nh * scale)) };
}

// Hanya lapisan anotasi yang benar-benar ada; urutannya Anatomi lalu Temuan.
export function annotationLayers(asset) {
  const have = new Set((asset?.annotations || []).map((a) => a.layer));
  return ['anatomy', 'abnormality'].filter((k) => have.has(k));
}

export function objectHref(slug, pathSlug) {
  return `/lab/objek/${slug}${pathSlug ? `?jalur=${encodeURIComponent(pathSlug)}` : ''}`;
}

// Posisi sebuah materi di dalam jalur; null bila materi bukan bagian jalur tersebut.
export function pathNeighbors(steps = [], slug) {
  const index = steps.findIndex((s) => s.slug === slug);
  if (index < 0) return null;
  return { index, total: steps.length, prev: steps[index - 1] || null, next: steps[index + 1] || null };
}

// Jejak navigasi: dari jalur bila materi dibuka lewat Guided Learning, selain itu dari Explore.
export function crumbs({ title, domain, domainTitle, modality, pathway }) {
  const out = [{ label: 'Lab', to: '/lab' }];
  if (pathway) {
    out.push({ label: 'Guided Learning', to: '/lab?mode=guided' }, { label: pathway.title, to: `/lab/jalur/${pathway.slug}` });
  } else {
    if (domain) out.push({ label: domainTitle || domain, to: `/lab?domain=${encodeURIComponent(domain)}` });
    if (modality) out.push({ label: modality, to: `/lab?q=${encodeURIComponent(modality)}` });
  }
  out.push({ label: title });
  return out;
}

// Ringkasan sesi latihan: soal pilihan dinilai; soal esai (penilaian mandiri) tidak dihitung benar/salah.
export function sessionSummary(questions, answers) {
  let correct = 0; let wrong = 0; let answered = 0; const review = [];
  for (const q of questions) {
    const r = answers[q.id]?.result;
    if (!r) { review.push(q.id); continue; }
    answered += 1;
    if (r.correct === true) correct += 1;
    else if (r.correct === false) { wrong += 1; review.push(q.id); }
  }
  return { total: questions.length, answered, correct, wrong, unanswered: questions.length - answered, review };
}

// ---- Guided Learning journey -------------------------------------------------------------------------------
// status: new (nothing yet) | active | done. `resume` is the step to continue with; it is null when the pathway is
// complete, so a finished pathway never offers to "continue" from lesson 1.
export function pathwayState(steps = [], completed = [], lastObject = '') {
  const total = steps.length; const done = steps.filter((s) => completed.includes(s.slug)).length;
  const status = total > 0 && done >= total ? 'done' : done > 0 || lastObject ? 'active' : 'new';
  const next = steps.find((s) => !completed.includes(s.slug)) || null;
  const last = steps.find((s) => s.slug === lastObject);
  const resume = status === 'done' ? null : status === 'new' ? steps[0] || null : last && !completed.includes(last.slug) ? last : next;
  return { status, total, done, next, resume };
}
export function stepState(step, completed = [], resume = null) {
  if (completed.includes(step.slug)) return 'done';
  return resume && resume.slug === step.slug ? 'current' : 'todo';
}

// ---- Practice navigator --------------------------------------------------------------------------------------
// current | correct | wrong | answered (self-assessed) | skipped (visited, left unanswered) | new
export function navStatus(q, { answers = {}, visited = new Set(), currentId = '' } = {}) {
  if (q.id === currentId) return 'current';
  const r = answers[q.id]?.result;
  if (r) return r.correct === true ? 'correct' : r.correct === false ? 'wrong' : 'answered';
  return visited.has(q.id) ? 'skipped' : 'new';
}
export function sessionTitle(summary, review) {
  if (review) return 'Tinjauan selesai';
  return summary.answered >= summary.total ? 'Sesi latihan selesai' : 'Sesi diakhiri';
}
export function summaryLine(s) { return `${s.correct} benar · ${s.wrong} salah · ${s.unanswered} belum dijawab`; }

// Pure practice objects (data.mode = practice, or questions with no lesson material of their own) open straight into case 1.
export function isPracticeFirst(d) { return d?.kind === 'practice' && (d.questions || []).length > 0; }
