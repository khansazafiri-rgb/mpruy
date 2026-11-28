// Panggung video "Cegukan: kenapa bunyinya hik" — renderFrame(t) deterministik (t = detik video = detik narasi).
// Server statis dari akar repo (port 8135): python3 -m http.server 8135   lalu buka /video/cegukan-hik/stage/index.html?t=12.5
import * as S from './scenes.js';
await document.fonts.load('800 40px "Plus Jakarta Sans"'); await document.fonts.load('700 30px "Plus Jakarta Sans"'); await document.fonts.ready;
const $ = (id) => document.getElementById(id);
export async function renderFrame(t) { const out = await S.frame(t); $('A').innerHTML = out.A || ''; $('U').innerHTML = out.U || ''; }
window.renderFrame = renderFrame; window.__ready = true;
const q = new URLSearchParams(location.search); if (q.has('t')) await renderFrame(+q.get('t'));
