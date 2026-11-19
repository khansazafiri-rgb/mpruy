// Waktu bersama. timeline.json dibuat oleh audio/buat_timeline.py: dari ASR narasi sebenarnya bila ada dan cocok dengan naskah,
// atau DIPERKIRAKAN dari naskah (estimated = true -> hasil render berstatus DRAF). tn = detik narasi; t = tn + OFF.
const J = await (await fetch('timeline.json')).json();
export const OFF = 0.3;
export const A = J.anchors, KAL = J.kalimat, ESTIMATED = J.estimated;
export const EDU_END = J.edu_end;
export const O0 = EDU_END + OFF + 0.45;   // outro mulai (web asli terlihat)
export const MASTER_AT = O0 + 1.2;         // medcoel-outro-master.wav mulai setelah web terlihat
export const MASTER_LEN = 10.84;
export const DUR = Math.ceil((MASTER_AT + MASTER_LEN + 3.1) * 30) / 30;
