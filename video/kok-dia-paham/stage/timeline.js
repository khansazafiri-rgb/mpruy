// Urutan adegan lengkap (waktu mengikuti narasi). Adegan panel rekaman asli tidak memakai transisi iris/wipe (panel HTML tidak ikut terpotong); pakai kilatan putih.
import { SCENES_K1 } from './scenesK1.js';
import { SCENES_K2 } from './scenesK2.js';
export const ALL = [...SCENES_K1, ...SCENES_K2].sort((a, b) => a.t0 - b.t0);
export const FLASH_AT = [61.14, 62.38, 64.3, 66.52, 67.92, 69.56, 74.88];
