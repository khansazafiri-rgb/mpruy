// Urutan adegan lengkap (waktu mengikuti narasi).
import { SCENES_M1 } from './scenesM1.js';
import { SCENES_M2 } from './scenesM2.js';
export const ALL = [...SCENES_M1, ...SCENES_M2].sort((a, b) => a.t0 - b.t0);
