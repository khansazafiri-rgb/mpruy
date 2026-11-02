// Urutan adegan lengkap (waktu mengikuti MP3 narasi).
import { SCENES } from './scenes.js';
import { SCENES2 } from './scenes2.js';
export const ALL = [...SCENES, ...SCENES2].sort((a, b) => a.t0 - b.t0);
