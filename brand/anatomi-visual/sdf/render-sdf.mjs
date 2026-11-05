// Merender jantung SDF ke PNG (WebGL2 lewat Chromium + SwiftShader). Pemakaian:
//   node render-sdf.mjs [keluaran.png] [--scale=0.5] [--mode=0|1|2] [--beat=0..1] [--flow=0..1]
// Layar dirender per kotak (tile) supaya tidak melewati batas waktu GPU perangkat lunak.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { buildFragment, buildHtml } from './heart-sdf.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const out = args.find((a) => !a.startsWith('--')) || path.join(here, '..', 'out', 'heart-sdf.png');
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? parseFloat(a.split('=')[1]) : d; };
const SCALE = opt('scale', 1), MODE = opt('mode', 0), BEAT = opt('beat', 0), FLOW = opt('flow', 0);
const W = Math.round(1080 * SCALE), H = Math.round(1920 * SCALE);
const ZOOM = opt('zoom', 1.34) * SCALE;
const frag = buildFragment();
if (args.includes('--dump')) fs.writeFileSync(path.join(here, 'heart.frag'), frag);

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: W, height: H } });
p.on('pageerror', (e) => console.log('pageerror', e.message));
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('console', m.text().slice(0, 400)); });
await p.setContent(buildHtml(W, H));
const t0 = Date.now();
const res = await p.evaluate(async ({ frag, W, H, MODE, BEAT, FLOW, ZOOM }) => {
  const c = document.getElementById('c');
  const gl = c.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false, alpha: true, premultipliedAlpha: false });
  if (!gl) return { err: 'tanpa WebGL2' };
  const vs = `#version 300 es\nin vec2 a; void main(){ gl_Position=vec4(a,0.,1.); }`;
  const mk = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); return sh; };
  let prog;
  try { prog = gl.createProgram(); gl.attachShader(prog, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, frag)); gl.linkProgram(prog); if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog)); } catch (e) { return { err: String(e.message).slice(0, 1500) }; }
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n) => gl.getUniformLocation(prog, n);
  gl.uniform2f(U('uRes'), W, H); gl.uniform1f(U('uBeat'), BEAT); gl.uniform1f(U('uFlow'), FLOW); gl.uniform1i(U('uMode'), MODE); gl.uniform1f(U('uScale'), ZOOM);
  gl.viewport(0, 0, W, H); gl.disable(gl.BLEND);
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.SCISSOR_TEST);
  const T = 160;
  for (let y = 0; y < H; y += T) for (let x = 0; x < W; x += T) {
    gl.scissor(x, y, Math.min(T, W - x), Math.min(T, H - y));
    gl.uniform2f(U('uTileOrigin'), 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.finish();
    await new Promise((r) => setTimeout(r, 0));
  }
  return { png: c.toDataURL('image/png') };
}, { frag, W, H, MODE, BEAT, FLOW, ZOOM });
if (res.err) { console.log('GAGAL', res.err); await b.close(); process.exit(1); }
fs.writeFileSync(out, Buffer.from(res.png.split(',')[1], 'base64'));
console.log('ok', out, W + 'x' + H, ((Date.now() - t0) / 1000).toFixed(1) + ' dtk');
await b.close();
