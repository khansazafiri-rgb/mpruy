// Jadwal bersama (panggung + audio). Waktu dalam detik video; 30 fps; 40,0 dtk. Audio pengguna (narator.wav, 9,28 dtk) masuk TEPAT di NAR0.
export const FPS = 30, DUR = 40.0, NAR0 = 20.0, NAR_LEN = 9.28;
export const BPM = 120, BEAT = 60 / BPM;
// agenda FK: [waktu masuk, jam, label]
export const AGENDA = [[3.0, '07.00', 'Kuliah'], [5.0, '10.00', 'Skill lab'], [7.0, '13.00', 'Diskusi kasus'], [9.0, '18.00', 'Tugas kelompok']];
export const TR = 0.30;   // lama transisi mosaik antar-adegan
// penanda adegan
export const S = { desk: [0, 3], kuliah: [3, 5], lab: [5, 7], kasus: [7, 9], kelompok: [9, 11], pulang: [11, 12.3], laptop: [12.3, 16], nilo: [16, 20], web: [20, 32], outro: [32, 40] };
// kata di audio (detik dari awal narator) -> dipakai menyelaraskan aksi web (hasil ASR audio/asr.json)
export const WORDS = { satuBabDulu: [2.12, 3.22], materi: [3.66, 4.56], flashcard: [4.86, 5.72], latihan: [5.96, 7.30], gratis: [7.70, 8.98] };
// rekaman web asli: [t0, t1, klip, bingkai0, bingkai1]; bingkai dipetakan linear antar t0..t1 (kecepatan 0,8x - 1,4x)
export const SEG = [
  [20.00, 23.00, 'pilih', 0, 66],       // mata kuliah -> Anatomi -> daftar BAB -> ketuk satu BAB
  [23.00, 23.35, 'pilih', 66, 78],      // dialog 3 langkah
  [23.35, 24.90, 'materi', 6, 52],      // Belajar materi (kata "Baca materi" 23,66)
  [24.90, 25.95, 'flashcard', 3, 52],   // Flashcard, lihat jawaban ("coba flashcard" 24,86 - 25,72)
  [25.95, 27.30, 'latihan', 2, 42],     // Latihan soal: dialog sesi ("latihan soal di MEDCOEL" 25,96 - 27,30)
  [27.30, 28.60, 'latihan', 42, 92],    // mulai, jawab, Cek jawaban
  [28.60, 30.60, 'latihan', 92, 150],   // pembahasan per opsi
  [30.60, 32.00, 'latihan', 150, 190],
  [32.00, 40.00, 'beranda', 0, 229],    // penutup: beranda web penuh
];
// peristiwa untuk SFX: ketukan jari di rekaman (bingkai klip -> detik video) dihitung di audio dari SEG dan data klip (rekam/cues.json)
