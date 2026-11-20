// Model EKG SKEMATIK untuk belajar konsep konduksi. Gelombang dibentuk dari jumlah kurva Gauss (P, Q, R, S, T)
// dengan interval yang dapat diatur. Ini BUKAN rekaman pasien, bukan model elektrofisiologi tervalidasi,
// dan tidak boleh dipakai untuk diagnosis. Rentang normal mengikuti angka buku ajar umum (PR 120–200 ms,
// QRS < 120 ms, laju sinus 60–100/menit) dan dipakai hanya untuk penjelasan.

export const PAPER = { mmPerSecond: 25, mmPerMv: 10, smallBoxMs: 40, bigBoxMs: 200 };
export const NORMAL = { hr: [60, 100], pr: [120, 200], qrs: [80, 120] };

export const RHYTHMS = [
  { key: 'sinus', title: 'Irama sinus normal', hr: 75, pr: 160, qrs: 90,
    points: ['Setiap P diikuti QRS, setiap QRS didahului P.', 'Laju 60–100/menit, jarak R–R teratur.', 'PR 120–200 ms, QRS sempit (< 120 ms).'] },
  { key: 'bradikardia', title: 'Sinus bradikardia', hr: 46, pr: 170, qrs: 90,
    points: ['Pola sama dengan irama sinus: P–QRS 1:1.', 'Laju di bawah 60/menit: jarak R–R lebih dari 5 kotak besar.'] },
  { key: 'takikardia', title: 'Sinus takikardia', hr: 125, pr: 140, qrs: 85,
    points: ['P–QRS tetap 1:1, R–R teratur.', 'Laju di atas 100/menit: jarak R–R kurang dari 3 kotak besar.', 'Pada laju tinggi gelombang T bisa mendekati P berikutnya.'] },
  { key: 'avb1', title: 'Blok AV derajat 1', hr: 70, pr: 290, qrs: 90,
    points: ['Setiap P tetap diikuti QRS.', 'PR memanjang tetap (> 200 ms, lebih dari 1 kotak besar).', 'Perlambatan terjadi di nodus AV.'] },
  { key: 'wenckebach', title: 'Blok AV derajat 2 tipe I (Wenckebach)', hr: 80, pr: 180, qrs: 90, wenckebach: { step: 70, cycle: 4 },
    points: ['PR makin panjang dari denyut ke denyut.', 'Lalu satu gelombang P tidak diikuti QRS (denyut “jatuh”).', 'Siklus berulang; R–R tidak teratur berkelompok.'] },
];
export const rhythmByKey = (key) => RHYTHMS.find((r) => r.key === key) || RHYTHMS[0];

const P_DUR = 90; // ms
const qtFor = (rr) => Math.round(400 * Math.sqrt(rr / 1000)); // Bazett-shaped QT so T stays plausible at every rate

/** Beats over [0, durationMs): { p, qrs|null, t|null, pr, rr } — atrial timing is regular (sinus); AV conduction varies. */
export function beats(rhythm, durationMs = 6000) {
  const rr = Math.round(60000 / rhythm.hr), out = [];
  for (let i = 0, p = 200; p < durationMs; i++, p += rr) {
    let pr = rhythm.pr, conducted = true;
    if (rhythm.wenckebach) {
      const k = i % rhythm.wenckebach.cycle;
      if (k === rhythm.wenckebach.cycle - 1) conducted = false; else pr = rhythm.pr + k * rhythm.wenckebach.step;
    }
    const qrs = conducted ? p + pr : null;
    out.push({ p, pr: conducted ? pr : null, qrs, qrsDur: rhythm.qrs, t: conducted ? qrs + qtFor(rr) - 120 : null, qt: qtFor(rr), rr });
  }
  return out;
}

const g = (t, mu, sigma, a) => a * Math.exp(-((t - mu) ** 2) / (2 * sigma * sigma));
/** Voltage (mV) at time t (ms). */
export function sample(list, t) {
  let v = 0;
  for (const b of list) {
    if (t < b.p - 200 || t > b.p + 1400) continue;
    v += g(t, b.p + P_DUR / 2, P_DUR / 5, 0.15);
    if (b.qrs != null) {
      const w = b.qrsDur / 90;
      v += g(t, b.qrs + 12 * w, 7 * w, -0.12) + g(t, b.qrs + 40 * w, 9 * w, 1.1) + g(t, b.qrs + 66 * w, 8 * w, -0.28);
      v += g(t, b.t, 55, 0.3);
    }
  }
  return v;
}

/** What the conduction system is doing at time t: drives the diagram highlight and the phase legend. */
export function phaseAt(list, t) {
  for (const b of list) {
    if (t >= b.p && t < b.p + 20) return { key: 'sa', beat: b };
    if (t >= b.p + 20 && t < b.p + P_DUR) return { key: 'atria', beat: b };
    if (b.qrs == null) { if (t >= b.p + P_DUR && t < b.p + P_DUR + 160) return { key: 'blocked', beat: b }; continue; }
    if (t >= b.p + P_DUR && t < b.qrs - 25) return { key: 'av', beat: b };
    if (t >= b.qrs - 25 && t < b.qrs) return { key: 'his', beat: b };
    if (t >= b.qrs && t < b.qrs + b.qrsDur) return { key: 'ventricles', beat: b };
    if (t >= b.qrs + b.qrsDur && t < b.t - 60) return { key: 'plateau', beat: b };
    if (t >= b.t - 60 && t < b.t + 90) return { key: 'repol', beat: b };
  }
  return { key: 'rest', beat: null };
}

export const PHASES = {
  sa: { wave: 'Awal P', part: 'Nodus SA', text: 'Nodus sinoatrial melepas impuls: awal setiap denyut sinus.' },
  atria: { wave: 'Gelombang P', part: 'Atrium', text: 'Depolarisasi atrium menyebar dari kanan ke kiri.' },
  av: { wave: 'Segmen PR', part: 'Nodus AV', text: 'Impuls diperlambat di nodus AV sehingga ventrikel terisi dulu. Garis tampak datar.' },
  his: { wave: 'Akhir PR', part: 'Berkas His', text: 'Impuls masuk berkas His menuju cabang kanan dan kiri.' },
  ventricles: { wave: 'Kompleks QRS', part: 'Cabang berkas & Purkinje', text: 'Depolarisasi ventrikel yang cepat lewat serabut Purkinje.' },
  plateau: { wave: 'Segmen ST', part: 'Ventrikel', text: 'Ventrikel seluruhnya terdepolarisasi: garis kembali mendatar.' },
  repol: { wave: 'Gelombang T', part: 'Ventrikel', text: 'Repolarisasi ventrikel.' },
  blocked: { wave: 'P tanpa QRS', part: 'Nodus AV (terblok)', text: 'Impuls atrium tidak diteruskan nodus AV: tidak ada QRS untuk gelombang P ini.' },
  rest: { wave: 'Garis dasar', part: '—', text: 'Fase istirahat listrik di antara denyut.' },
};

/** Measurements a learner would read off the strip (ms and per minute). */
export function measure(rhythm, durationMs = 6000) {
  const list = beats(rhythm, durationMs), conducted = list.filter((b) => b.qrs != null);
  const prs = conducted.map((b) => b.pr);
  const qrsTimes = conducted.map((b) => b.qrs);
  const rrs = qrsTimes.slice(1).map((q, i) => q - qrsTimes[i]);
  const meanRR = rrs.length ? rrs.reduce((a, b) => a + b, 0) / rrs.length : 0;
  return {
    atrialRate: rhythm.hr,
    ventricularRate: meanRR ? Math.round(60000 / meanRR) : 0,
    prMin: Math.min(...prs), prMax: Math.max(...prs), qrs: rhythm.qrs,
    regular: rrs.length > 1 && Math.max(...rrs) - Math.min(...rrs) < 20,
    dropped: list.length - conducted.length,
    rateFromBoxes: meanRR ? Math.round(300 / (meanRR / PAPER.bigBoxMs)) : 0,
  };
}

/** SVG path (mm units) for a strip: x = 25 mm/s, y = 10 mm/mV, baseline at `base` mm. */
export function stripPath(list, durationMs, base = 20, stepMs = 4) {
  let d = '';
  for (let t = 0; t <= durationMs; t += stepMs) {
    const x = (t / 1000) * PAPER.mmPerSecond, y = base - sample(list, t) * PAPER.mmPerMv;
    d += (t ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2);
  }
  return d;
}

/** Deterministic practice round: `n` questions with 4 options each from a seed (no answer is sent anywhere). */
export function practiceRound(seed = 1, n = 5) {
  let s = seed >>> 0 || 1;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const order = RHYTHMS.map((r) => [rnd(), r]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  return Array.from({ length: n }, (_, i) => {
    const answer = order[i % order.length];
    const others = RHYTHMS.filter((r) => r.key !== answer.key).map((r) => [rnd(), r]).sort((a, b) => a[0] - b[0]).slice(0, 3).map((x) => x[1]);
    const options = [answer, ...others].map((r) => [rnd(), r]).sort((a, b) => a[0] - b[0]).map((x) => x[1].key);
    return { answer: answer.key, options };
  });
}
