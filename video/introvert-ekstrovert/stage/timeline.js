// Urutan adegan lengkap (waktu mengikuti MP3 narasi).
import { SCENES_A } from './scenesA.js';
import { SCENES_B } from './scenesB.js';
export const ALL = [...SCENES_A, ...SCENES_B].sort((a, b) => a.t0 - b.t0);
