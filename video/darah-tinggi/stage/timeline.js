// Urutan adegan lengkap (waktu mengikuti narasi).
import { SCENES_D1 } from './scenesD1.js';
import { SCENES_D2 } from './scenesD2.js';
import { SCENES_D3 } from './scenesD3.js';
export const ALL = [...SCENES_D1, ...SCENES_D2, ...SCENES_D3].sort((a, b) => a.t0 - b.t0);
export const FLASH_AT = [];
