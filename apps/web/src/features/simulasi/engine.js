// Mesin Simulasi Dokter dalam bentuk fungsi murni (tanpa DOM), diporting dari
// prototipe v3 (app.js). Aturan penilaian sama persis dengan prototipe supaya
// penulis konten cukup mengubah data/catalog.js dan data/cases.js:
//   K = penting, U = bermanfaat, B = berisiko; selain itu "kurang perlu".
//   Flag katalog: g = tidak perlu alasan, inv = mahal/invasif, only:poli = hanya poli itu.
import { CATTXT } from './data/catalog.js';
import { CASES as BUILTIN_CASES, DX as BUILTIN_DX } from './data/cases.js';

// Kasus dan diagnosis aktif. Isinya diganti dari server (setContent) karena
// admin bisa mengubah kasus di dashboard; data/cases.js menjadi isi bawaan
// yang dipakai bila server belum menjawab. Objek diganti isinya di tempat
// supaya semua yang mengimpornya ikut melihat data terbaru.
export const CASES = { ...BUILTIN_CASES };
export const DX = { ...BUILTIN_DX };
export { BUILTIN_CASES, BUILTIN_DX };

export const POLI = {
  umum: 'Poli umum', bedah: 'Poli bedah', spog: 'Poli kandungan', anak: 'Poli anak', dalam: 'Poli penyakit dalam',
};
export const PAS_NAMES = { kakek: 'Pak Slamet', bapak: 'Pak Dimas', nenek: 'Bu Rukmini', ibuhamil: 'Bu Sari', ibu: 'Bu Wulan', anakp: 'Nadia', anakl: 'Raka' };
export const EXPR = ['master', 'nyeri', 'meringis', 'cemas', 'lemas', 'lega', 'sesak'];
export const SUS_EXPR = ['netral', 'senyum', 'serius'];
export const PHASES = [
  { key: 'anam', label: 'Anamnesis', short: 'Anamnesis' },
  { key: 'fisik', label: 'Pemeriksaan fisik', short: 'Fisik' },
  { key: 'penunjang', label: 'Penunjang', short: 'Penunjang' },
  { key: 'tata', label: 'Tatalaksana', short: 'Rencana' },
];
export const PHASE_NAME = Object.fromEntries(PHASES.map((p) => [p.key, p.label]));
export const RATE = { K: 'Penting', U: 'Bermanfaat', L: 'Kurang perlu', T: 'Tidak tepat', B: 'Berisiko', N: 'Tidak berlaku' };
/** Kasus yang bisa dimainkan (ruang tunggu tidak punya dokter, kasus khusus tutorial tidak diundi). */
export const PLAYABLE = [];
function refreshPlayable() {
  PLAYABLE.length = 0;
  Object.keys(CASES).filter((k) => !CASES[k].nodoc && !CASES[k].tutorialOnly && !CASES[k].inactive).forEach((k) => PLAYABLE.push(k));
}
refreshPlayable();

/** Poli sebuah kasus (menentukan latar, jas dokter, dan tindakan khusus poli). */
export function poliOf(key) { return (CASES[key] && CASES[key].poli) || key; }

/**
 * Ganti kasus dan diagnosis dengan data dari server ({ cases, dx }).
 * Kasus tutorial (umum) selalu tersedia: bila admin menonaktifkannya, versi
 * bawaan dipakai khusus untuk tutorial dan tidak ikut diundi.
 */
export function setContent({ cases, dx } = {}) {
  if (dx && Object.keys(dx).length) { Object.keys(DX).forEach((k) => delete DX[k]); Object.assign(DX, dx); }
  if (cases && Object.keys(cases).length) {
    Object.keys(CASES).forEach((k) => delete CASES[k]);
    Object.assign(CASES, cases);
    if (!CASES.umum) {
      CASES.umum = { ...BUILTIN_CASES.umum, tutorialOnly: true };
      [CASES.umum.dxOk, ...CASES.umum.ddx].forEach((k) => { if (!DX[k]) DX[k] = BUILTIN_DX[k]; });
    }
  }
  refreshPlayable();
}

const ASK = {
  rawat: 'Suster, pasien ini saya rawat inap. Tolong siapkan administrasinya.',
  rawat_icu: 'Suster, tolong koordinasikan perawatan intensif di ICU.',
  rujuk: 'Suster, pasien ini saya rujuk ke rumah sakit rujukan. Tolong siapkan suratnya.',
  observasi: 'Suster, tolong observasi pasien ini di ruang tindakan beberapa jam.',
  surat_sakit: 'Suster, tolong buatkan surat keterangan istirahat sakit.',
  pulang: 'Kondisi Anda cukup stabil. Anda boleh pulang dan kontrol ulang sesuai jadwal.',
  edukasi: 'Saya jelaskan tentang penyakit Anda, obatnya, dan tanda bahaya yang harus diwaspadai.',
  edukasi_rokok: 'Saya sarankan Anda berhenti merokok, dan saya bantu konselingnya.',
  edukasi_diet: 'Saya jelaskan pengaturan makan, termasuk pembatasan garam dan cairan.',
};

/* ---------- membaca katalog ---------- */
function lc(s) { return /^[A-Z][a-z]+\b/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
function flagsOf(f) {
  const o = { g: false, inv: false, only: null };
  f = (f || '').trim();
  if (f === 'g') o.g = true; else if (f === 'inv') o.inv = true; else if (f.indexOf('only:') === 0) o.only = f.slice(5).split('+');
  return o;
}
export function parseRows(s) {
  return (s || '').split(';').filter(Boolean).map((r) => { const i = r.indexOf('='); return [r.slice(0, i).trim(), r.slice(i + 1).trim()]; });
}
function eachLine(txt, fn) {
  let sub = '';
  (txt || '').split('\n').forEach((raw) => {
    const line = raw.trim();
    if (!line) return;
    if (line.charAt(0) === '#') { sub = line.slice(1).trim(); return; }
    fn(line.split('|'), sub);
  });
}

export const CAT = [];
export const BYID = {};
const add = (it) => { CAT.push(it); BYID[it.id] = it; };
eachLine(CATTXT.anam, (f, sub) => add({ id: f[0], tab: 'anam', sub, label: f[1], short: f[2], kind: 'pas', ask: f[1], tag: f[3] || '', why: f[4] || '', fl: flagsOf(f[5]), def: { say: f[6] || 'Tidak, Dok.', note: f[7] || `${f[2]} (-)` } }));
eachLine(CATTXT.fisik, (f, sub) => add({ id: f[0], tab: 'fisik', sub, label: f[1], short: f[1], kind: 'exam', ask: `Saya periksa ${lc(f[1])}.`, tag: f[4] || '', why: f[5] || '', fl: flagsOf(f[6]), def: { t: f[2], note: f[3] } }));
eachLine(CATTXT.fisik_card, (f, sub) => add({ id: f[0], tab: 'fisik', sub, label: f[1], short: f[1], kind: 'card', ask: `Suster, tolong ukur: ${lc(f[1])}.`, tag: f[4] || '', why: f[5] || '', fl: flagsOf(f[6]), def: { title: f[2], sub: f[7], rows: parseRows(f[3]), say: f[8], note: null } }));
eachLine(CATTXT.penunjang, (f, sub) => add({ id: f[0], tab: 'penunjang', sub, label: f[1], short: f[1], kind: 'card', ask: `Suster, tolong periksakan: ${lc(f[1])}.`, tag: f[4] || '', why: f[5] || '', fl: flagsOf(f[6]), def: { title: f[2], sub: f[7], rows: parseRows(f[3]), say: f[8], note: null } }));
eachLine(CATTXT.tata, (f, sub) => {
  const who = f[2];
  add({ id: f[0], tab: 'tata', sub, label: f[1], short: f[1], kind: 'tata', ask: who === 'sus' ? `Suster, tolong ${lc(f[1])}.` : `Saya sampaikan ke pasien: ${lc(f[1])}.`, tag: f[5] || '', why: f[6] || '', fl: flagsOf(f[7]), def: { who, say: f[3], note: f[4] } });
});
CAT.forEach((it) => { if (ASK[it.id]) it.ask = ASK[it.id]; });

/* ---------- konteks kasus ---------- */
function setOf(s) { const o = {}; (s || '').split(/\s+/).forEach((k) => { if (k) o[k] = 1; }); return o; }

/** Konteks satu kasus: data kasus dan himpunan K/U/B. */
export function caseCtx(key) {
  const C = CASES[key];
  return { key, poli: C.poli || key, C, Ks: setOf(C.K), Us: setOf(C.U), Bs: setOf(C.B) };
}

export function isNA(it, ctx) { return !!(it.fl.only && it.fl.only.indexOf(ctx.poli) < 0); }

/** Relevansi tindakan untuk kasus: K, U, L, T, B, atau N. */
export function rel(it, ctx) {
  if (isNA(it, ctx)) return 'N';
  if (ctx.Ks[it.id]) return 'K';
  if (ctx.Us[it.id]) return 'U';
  if (ctx.Bs[it.id]) return 'B';
  if (it.kind === 'tata' && it.tag === 'obs' && ctx.poli !== 'spog') return 'B';
  if (it.fl.inv) return 'T';
  if (it.fl.g && it.kind === 'pas') return 'U';
  return 'L';
}

export function answerOf(it, ctx) {
  const o = (ctx.C.A && ctx.C.A[it.id]) || {};
  const r = { ...it.def, ...o };
  if (typeof r.rows === 'string') r.rows = parseRows(r.rows);
  return r;
}

export function cardNote(a) { return a.note || `${a.title}: ${a.rows.map((r) => `${r[0]} ${r[1]}`).join('; ')}`; }
/** Bagian catatan SOAP untuk tindakan. */
export function secOf(it) { return it.kind === 'pas' ? 'S' : it.kind === 'tata' ? 'P' : 'O'; }
/** Tindakan spesifik meminta alasan sebelum dilakukan. */
export function needsReason(it, ctx) { return !it.fl.g && !isNA(it, ctx); }

/* ---------- alasan memilih tindakan (opsi diagnosis banding) ---------- */
export function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const byHash = (seed) => (a, b) => hash(seed + a) - hash(seed + b);

/** Opsi alasan untuk tindakan: 1-2 diagnosis banding yang terkait dan pengecoh, urutan tetap. */
export function reasonSet(it, ctx) {
  const tg = it.tag ? it.tag.split(',') : [];
  const seed = `${ctx.key}:${it.id}`;
  const ov = (k) => DX[k][1].split(',').some((t) => tg.indexOf(t) >= 0);
  const good = ctx.C.ddx.filter(ov).sort(byHash(`${seed}g`));
  const nGood = Math.min(good.length, 1 + (hash(seed) % 2));
  const picked = good.slice(0, nGood);
  const bad = Object.keys(DX).filter((k) => !ov(k)).sort(byHash(`${seed}d`));
  const opts = picked.concat(bad.slice(0, 4 - picked.length)).sort(byHash(`${seed}o`));
  return { opts, good };
}
export function judgeReason(rs, key) { return { key: key || null, ok: !!key && rs.good.indexOf(key) >= 0, good: rs.good }; }

/* ---------- dialog untuk satu tindakan ---------- */
/** Baris dialog dan catatan otomatis untuk tindakan. */
export function actionLines(it, ctx) {
  const { C } = ctx;
  const na = isNA(it, ctx);
  const a = answerOf(it, ctx);
  const ask = { w: 'dok', t: it.ask };
  let lines;
  let note = '';
  if (na) {
    if (it.kind === 'pas') lines = [ask, { w: 'pas', e: C.expr, t: 'Maaf Dok, pertanyaan itu tidak berlaku untuk saya.' }];
    else if (it.kind === 'exam') lines = [ask, { w: 'info', t: 'Pemeriksaan ini tidak sesuai dengan kondisi pasien.' }];
    else lines = [ask, { w: 'sus', e: 'serius', t: 'Maaf Dok, permintaan ini tidak sesuai dengan kondisi pasien, jadi tidak bisa saya lakukan.' }];
  } else if (it.kind === 'pas') {
    lines = [ask, { w: 'pas', t: a.say, e: a.e || C.expr }]; note = a.note;
  } else if (it.kind === 'exam') {
    lines = [ask, { w: 'info', t: a.t }]; note = a.note;
  } else if (it.kind === 'card') {
    lines = [ask, { w: 'sus', e: 'serius', t: a.say, card: { title: a.title, sub: a.sub, rows: a.rows } }]; note = cardNote(a);
  } else {
    lines = [ask, { w: a.who, e: a.who === 'sus' ? 'netral' : (a.e || 'lega'), t: a.say }]; note = a.note;
  }
  return { lines, note, na };
}

/* ---------- kelompok tindakan untuk panel ---------- */
const AREA_META = {
  'Keluhan utama dan riwayat penyakit sekarang': { label: 'Keluhan utama', desc: 'Riwayat penyakit sekarang', icon: 'message' },
  'Telaah sistem': { label: 'Telaah sistem', desc: 'Gejala per sistem organ', icon: 'list' },
  'Khusus kehamilan': { label: 'Khusus kehamilan', desc: 'Usia kehamilan, ANC, janin', icon: 'baby' },
  'Khusus anak': { label: 'Khusus anak', desc: 'Imunisasi, tumbuh kembang', icon: 'baby' },
  'Riwayat penyakit dahulu': { label: 'Riwayat dahulu', desc: 'Penyakit yang pernah ada', icon: 'history' },
  'Obat dan alergi': { label: 'Obat & alergi', desc: 'Obat rutin, kepatuhan', icon: 'pill' },
  'Riwayat keluarga': { label: 'Keluarga', desc: 'Penyakit dalam keluarga', icon: 'users' },
  'Riwayat sosial dan kebiasaan': { label: 'Sosial & kebiasaan', desc: 'Pekerjaan, rokok, pajanan', icon: 'home' },
};
const TELAAH = 'Telaah sistem: ';
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Kelompok tindakan untuk satu tahap. Tindakan yang tidak berlaku untuk pasien
 * ini (flag only:poli lain) disembunyikan supaya panel tetap ringkas.
 * Telaah sistem digabung menjadi satu kelompok dengan sub-sistem.
 */
export function areasFor(phase, ctx) {
  const list = [];
  const idx = {};
  CAT.filter((it) => it.tab === phase && !isNA(it, ctx)).forEach((it) => {
    const telaah = phase === 'anam' && it.sub.indexOf(TELAAH) === 0;
    const key = telaah ? 'Telaah sistem' : it.sub;
    if (!(key in idx)) {
      const m = AREA_META[key] || { label: key, desc: '', icon: phase };
      idx[key] = list.length;
      list.push({ key, label: m.label, desc: m.desc, icon: m.icon, items: [], systems: telaah ? [] : null });
    }
    const area = list[idx[key]];
    area.items.push(it);
    if (telaah) {
      const name = cap(it.sub.slice(TELAAH.length));
      let sys = area.systems.find((s) => s.name === name);
      if (!sys) { sys = { name, items: [] }; area.systems.push(sys); }
      sys.items.push(it);
    }
  });
  return list;
}

/** Semua tindakan yang berlaku untuk pasien ini, untuk pencarian. */
export function searchActions(q, ctx, limit = 60) {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return CAT.filter((i) => !isNA(i, ctx) && `${i.label} ${i.short} ${i.sub} ${i.id.replace(/_/g, ' ')}`.toLowerCase().indexOf(s) >= 0).slice(0, limit);
}

/* ---------- refleksi diagnosis ---------- */
/**
 * Setelah menetapkan diagnosis kerja: "diagnosis banding apa yang masih perlu
 * kamu singkirkan?". Dinilai dari daftar ddx yang ditulis untuk tiap kasus
 * (diagnosis banding yang masuk akal), jadi tidak perlu data baru.
 * Opsi: 2 dari ddx kasus (selain diagnosis yang dipilih) + 2 pengecoh, urutan tetap.
 */
export function ddxOptions(ctx, dx) {
  const seed = `${ctx.key}:ddx:${dx}`;
  const good = ctx.C.ddx.filter((k) => k !== dx).sort(byHash(`${seed}g`)).slice(0, 2);
  const bad = Object.keys(DX).filter((k) => k !== dx && ctx.C.ddx.indexOf(k) < 0).sort(byHash(`${seed}b`)).slice(0, 4 - good.length);
  return good.concat(bad).sort(byHash(`${seed}o`));
}
export function judgeDdx(ctx, dx, key) {
  return { key: key || null, ok: !!key && key !== dx && ctx.C.ddx.indexOf(key) >= 0 };
}

/* ---------- penilaian (sama dengan prototipe) ---------- */
export function score({ ctx, done, actions, dx }) {
  const { C } = ctx;
  const okDx = !!dx && dx === C.dxOk;
  const nearDx = !okDx && !!dx && C.ddx.indexOf(dx) >= 0;
  const keyAll = Object.keys(ctx.Ks).filter((id) => BYID[id] && !isNA(BYID[id], ctx));
  const keyDone = keyAll.filter((id) => done[id]);
  const cnt = { K: 0, U: 0, L: 0, T: 0, B: 0, N: 0 };
  actions.forEach((a) => { cnt[a.rel]++; });
  const asked = actions.filter((a) => a.reason);
  const reasonOk = asked.filter((a) => a.reason.ok).length;
  const sDx = okDx ? 30 : nearDx ? 12 : 0;
  const sKey = keyAll.length ? Math.round((40 * keyDone.length) / keyAll.length) : 0;
  const sRsn = asked.length ? Math.round((20 * reasonOk) / asked.length) : 0;
  const sEff = Math.max(0, Math.round(10 - 0.5 * cnt.L - 2 * cnt.T - 4 * cnt.B));
  const total = Math.min(100, sDx + sKey + sRsn + sEff);
  return {
    total, okDx, nearDx, keyAll, keyDone, missed: keyAll.filter((id) => !done[id]), cnt, asked: asked.length, reasonOk,
    parts: { dx: sDx, key: sKey, reason: sRsn, eff: sEff },
  };
}

export function reasonText(it, r) {
  const verb = it.kind === 'tata' ? 'menangani dugaan ' : 'menilai kemungkinan ';
  const gnames = r.good.map((k) => DX[k][0]);
  if (!r.key) {
    return { ok: false, t: `Alasanmu: tidak ada dugaan khusus. ${gnames.length ? `Padahal tindakan ini berkaitan dengan ${gnames.join(' atau ')} pada kasus ini.` : 'Tindakan yang spesifik sebaiknya punya tujuan yang jelas.'}` };
  }
  if (r.ok) return { ok: true, t: `Alasanmu: ${verb}${DX[r.key][0]}. Masuk akal untuk tindakan ini.` };
  return { ok: false, t: `Alasanmu: ${verb}${DX[r.key][0]}. Tindakan ini kurang berhubungan dengan ${DX[r.key][0]}.${gnames.length ? ` Yang lebih sesuai: ${gnames.join(' atau ')}.` : ' Tidak ada diagnosis banding kasus ini yang terkait erat dengannya.'}` };
}

export function whyText(it, rt) {
  const w = it.why || '';
  if (rt === 'L') return `Tidak ada indikasi kuat pada kasus ini. ${w}`;
  if (rt === 'T') return `Mahal atau invasif tanpa indikasi yang jelas pada kasus ini. ${w}`;
  if (rt === 'B') return `Berisiko atau merugikan pada kasus ini. ${w}`;
  if (rt === 'N') return 'Tidak berlaku untuk pasien ini.';
  return w;
}

/* ---------- gambar ---------- */
export const asset = (name) => `/simulasi/${name}.webp`;
export function doctorSprite(ctx, gender) {
  if (ctx.C.nodoc) return null;
  if (gender === 'P' && ctx.poli !== 'umum') return 'DOK_P_umum_netral';
  return `DOK_${gender}_${ctx.poli}_netral`;
}
/** Nama gambar yang perlu dimuat untuk satu kasus saja. */
export function caseSprites(ctx, gender) {
  const n = EXPR.map((e) => `PAS_${ctx.C.pas}_${e}`).concat(SUS_EXPR.map((e) => `SUS_${e}`), [`BG_${ctx.poli}`]);
  const d = doctorSprite(ctx, gender);
  if (d) n.push(d);
  return n;
}

/** Kasus acak, tidak mengulang kasus sebelumnya. rnd untuk pengujian. */
export function pickCase(prev, rnd = Math.random) {
  const pool = PLAYABLE.filter((k) => k !== prev);
  return pool[Math.floor(rnd() * pool.length) % pool.length];
}

export function fmtClock(sec) { const m = Math.floor(sec / 60); const s = sec % 60; return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`; }
