// Urutan adegan lengkap (waktu mengikuti narasi). Adegan dengan panel rekaman asli tidak memakai transisi iris/wipe (panel HTML tidak ikut terpotong); pakai kilatan putih.
import { SCENES_P1 } from './scenesP1.js';
import { SCENES_P2 } from './scenesP2.js';
export const ALL = [...SCENES_P1, ...SCENES_P2].sort((a, b) => a.t0 - b.t0);
export const FLASH_AT = [4.04, 7.2, 20.5, 23.5, 25.36, 32.88, 37.7];
