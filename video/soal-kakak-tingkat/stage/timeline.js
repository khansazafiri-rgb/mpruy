// Urutan adegan lengkap (waktu mengikuti narasi). Adegan dengan panel rekaman asli tidak memakai transisi iris/wipe (panel HTML tidak ikut terpotong); pakai kilatan putih.
import { SCENES_S1 } from './scenesS1.js';
import { SCENES_S2 } from './scenesS2.js';
export const ALL = [...SCENES_S1, ...SCENES_S2].sort((a, b) => a.t0 - b.t0);
export const FLASH_AT = [6.4, 8.9, 25.54, 29.5, 31.9, 35.18, 39.9, 42.12, 45.94];
