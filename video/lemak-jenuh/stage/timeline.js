// Urutan adegan lengkap (waktu mengikuti narasi). Adegan dengan panel rekaman asli tidak memakai transisi iris/wipe; pakai kilatan putih.
import { SCENES_L1 } from './scenesL1.js';
import { SCENES_L2 } from './scenesL2.js';
import { SCENES_L3 } from './scenesL3.js';
export const ALL = [...SCENES_L1, ...SCENES_L2, ...SCENES_L3].sort((a, b) => a.t0 - b.t0);
export const FLASH_AT = [94.46, 96.68];
