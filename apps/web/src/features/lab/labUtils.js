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
    title: key ? cap(key) : 'Contoh gambar',
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
  return { total: questions.length, answered, correct, wrong, review };
}
