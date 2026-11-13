// Perekam segmen Live 4D Lab asli (produksi) -> bingkai 15 fps di waktu keluaran + data penanda dari raster aplikasi.
//   node rekam.cjs <segmen> [kAwal kAkhir]      bingkai k berada pada t = k/15 detik (waktu video)
// Segmen: A (0-5.0) USG diperbesar; BC (5.0-12.4) probe + jendela + 3D + bandingkan normal; EF (17.4-32.4) USG lalu CT; H (38.6-49.4) layar USG+CT. (12.4-17.4 dan 32.4-38.6 = ilustrasi SVG, tanpa rekaman.)
// Interaksi = klik/drag sungguhan pada halaman produksi (kursor ikut tergambar). Bingkai dihasilkan deterministik (jam virtual, lihat lab4d.cjs).
const fs = require('fs'); const path = require('path');
const L = require('./lab4d.cjs');
const FPS = 15;
const OUT = process.env.REKAM_OUT || '/tmp/claude-0/efusi/frames';
const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const lerp = (a, b, x) => a + (b - a) * x;
const park = [1000, 945];

// ---- definisi segmen ---------------------------------------------------------------------------------------------
const SEG = {
  A: {
    t0: 0, t1: 5.0, mask: true,
    async setup(lab, h) { await h.pose(lab); await h.c('[data-testid="mon-us"]'); await h.c('[data-testid="expand"]'); },
    // sapuan probe halus (putar probe) -> citra berubah sejak bingkai pertama
    ang: (t) => ({ rotate: lerp(89, 96, ease(t / 5.0)), heelToe: 0, rock: lerp(30, 33, ease(t / 5.0)) }),
    actions: [],
  },
  BC: {
    t0: 5.0, t1: 12.4, mask: false, probe: true,
    // awal: probe di jendela RUQ/hepatorenal (pilihan jendela asli di drawer Panel), drawer tertutup
    async setup(lab, h) { await h.c('[data-testid="mon-us"]'); await h.c('[data-testid="panel-toggle"]'); await h.c('[data-testid="tab-probe"]'); await h.c('[data-testid="view-ruq"]'); await h.c('[data-testid="panel-close"]'); },
    ang: (t) => (t >= 8.0 ? { heelToe: lerp(35.5, 0, ease((t - 8.2) / 1.0)) } : null),
    actions: [
      { t: 5.60, sel: '[data-testid="pad-right"]', glide: 0.45 },
      { t: 6.30, sel: '[data-testid="pad-inferior"]', glide: 0.35 },
      { t: 6.90, sel: '[data-testid="panel-toggle"]', glide: 0.4 },
      { t: 7.52, sel: '[data-testid="view-right_flank"]', glide: 0.5 },
      { t: 8.20, sel: '[data-testid="panel-close"]', glide: 0.35 },
      { t: 9.25, sel: '[data-testid="panel-toggle"]', glide: 0.4 },
      { t: 9.70, sel: '[data-testid="ws-patho"]', glide: 0.3 },
      { t: 10.25, sel: '[data-testid="compare-toggle"]', glide: 0.35 },
      { t: 11.20, sel: '[data-testid="compare-toggle"]', glide: 0.35 },
      { t: 11.95, sel: '[data-testid="panel-close"]', glide: 0.3 },
    ],
  },
  EF: {
    t0: 17.4, t1: 32.4, mask: true,
    async setup(lab, h) { await h.pose(lab); await h.c('[data-testid="mon-us"]'); await h.c('[data-testid="expand"]'); },
    ang: (t) => ({ rotate: lerp(95, 97, ease((t - 17.4) / 15)), heelToe: 0, rock: lerp(32.3, 31, ease((t - 17.4) / 15)) }),
    actions: [{ t: 26.75, sel: '[data-testid="mon-ct"]', glide: 0.45 }],
  },
  H: {
    t0: 38.6, t1: 49.4, mask: true,
    async setup(lab, h) { await h.pose(lab); await h.c('[data-testid="mon-split"]'); },
    ang: (t) => ({ rotate: lerp(94, 98, ease((t - 38.6) / 10.8)), heelToe: 0, rock: lerp(32, 34, ease((t - 38.6) / 10.8)) }),
    actions: [],
  },
};

// ---- bantu -------------------------------------------------------------------------------------------------------
async function main() {
  const [seg, a, b] = process.argv.slice(2); const def = SEG[seg]; if (!def) throw new Error('segmen?');
  const kA = a !== undefined ? +a : Math.ceil(def.t0 * FPS), kB = b !== undefined ? +b : Math.floor(def.t1 * FPS);
  const dir = path.join(OUT, seg); fs.mkdirSync(dir, { recursive: true });
  const lab = await L.open({ dpr: +(process.env.DPR || 2) }); const p = lab.page;
  lab.V = 5000; let cur = park.slice(); lab.curLife = 0;
  const dt = 1000 / FPS;
  const adv = async (n = 1) => { for (let i = 0; i < n; i++) { lab.V += 700; await L.setPhase(lab, 6 + lab.V / 1000); await L.render(lab); } };
  const hideCur = () => p.evaluate(() => { if (window.__cur) { window.__cur.x = -100; window.__cur.y = -100; window.__cur.ring = -1; window.__cur.draw(); } });
  const h = {
    async c(sel) { try { await L.click(lab, sel); } catch (e) { console.error('miss', sel); } await adv(2); await p.mouse.move(...park); await hideCur(); },
    async angles(lab, o) { await L.ev(lab, (o) => { Object.assign(window.__lab.S.angles, o); }, o); await adv(2); },
    async pose(lab) {
      await p.selectOption('#scenarioSelect', 'effusion'); await adv(2);
      await h.c('[data-testid="view-right_flank"]');
      await p.selectOption('#assistLevel', { label: 'Hanya hover' }); await adv(1);
      await h.angles(lab, { rotate: 95, heelToe: 0 });
    },
  };
  await p.selectOption('#scenarioSelect', 'effusion'); await adv(2);
  await p.selectOption('#assistLevel', { label: 'Hanya hover' }); await adv(1);
  await def.setup(lab, h);
  await p.mouse.move(...park); await hideCur();

  // grid waktu: V (ms) dipakai untuk interaksi; fase jantung/napas = 6 + t (detik) agar kontinu antar segmen
  lab.V = 20000; const acts = def.actions.map((x) => ({ ...x, done: false }));
  let k0 = Math.ceil(def.t0 * FPS); const anchors = {};
  const af = path.join(dir, 'anchors.json'); if (fs.existsSync(af)) Object.assign(anchors, JSON.parse(fs.readFileSync(af, 'utf8')));
  // memutar ulang aksi yang waktunya sebelum kAwal (tanpa tangkapan) supaya keadaan UI sama
  for (let k = k0; k < kB; k++) {
    const t = k / FPS; lab.V += dt; const capture = k >= kA;
    if (process.env.REKAM_SKIP && capture && def.actions.length === 0 && fs.existsSync(path.join(dir, `f${String(k).padStart(4, '0')}.jpg`))) continue;
    await L.setPhase(lab, 6 + t);
    const ang = def.ang(t); if (ang) await L.ev(lab, (o) => Object.assign(window.__lab.S.angles, o), ang);
    // kursor / klik
    let did = false;
    for (const x of acts) {
      if (x.done) continue;
      if (x.need) { const ok = await p.evaluate((n) => !!document.querySelector('[data-testid="compare-toggle"]'), x.need); if (!ok && t >= x.t) { x.done = true; continue; } }
      const [tx, ty] = await L.center(lab, x.sel).catch(() => [null, null]);
      if (tx === null) continue;
      if (t >= x.t - x.glide && t < x.t) { const f = ease((t - (x.t - x.glide)) / x.glide); const sx = x.sx ?? (x.sx = cur[0] > 0 ? cur[0] : tx + 120), sy = x.sy ?? (x.sy = cur[1] > 0 && cur[1] < 900 ? cur[1] : ty + 90); const nx = lerp(sx, tx, f), ny = lerp(sy, ty, f); await p.mouse.move(nx, ny); cur = [nx, ny]; lab.curLife = 40; }
      else if (t >= x.t) {
        did = true; x.done = true; await p.mouse.move(tx, ty); await p.mouse.down(); await p.mouse.up(); cur = [tx, ty]; lab.curLife = 10; await p.evaluate(() => { window.__cur.ring = 0.05; window.__cur.draw(); });
        x.clickK = k;
      }
    }
    // anim cincin klik + sembunyikan kursor setelah beberapa bingkai
    if (lab.curLife > 0) { lab.curLife--; await p.evaluate((l) => { const c = window.__cur; if (c.ring >= 0) { c.ring += 0.11; if (c.ring > 1) c.ring = -1; } c.draw(); if (l === 0) { c.x = -100; c.y = -100; c.draw(); } }, lab.curLife); if (lab.curLife === 0) { cur = park.slice(); } }
    if (!capture && !did && lab.curLife === 0) continue;
    await L.render(lab);
    if (!capture) continue;
    const name = `f${String(k).padStart(4, '0')}`;
    await L.shot(lab, path.join(dir, name + '.jpg'), { q: 88 });
    const meta = await p.evaluate((want) => {
      const l = window.__lab, o = { ang: { ...l.S.angles } };
      const cv = document.querySelector('[data-testid="monitor-canvas"]'); const r = cv.getBoundingClientRect(); o.cv = [r.x, r.y, r.width, r.height]; o.layouts = JSON.parse(JSON.stringify(l.monitor.layouts || {}));
      if (want.mask) { try { const a = l.assist, ra = a.rasters.main; o.areas = {}; o.png = {}; for (const n of ['pleural_fluid', 'diaphragm', 'atelectasis']) { const i = a.G.indexOf(n); const ar = ra.areas[i]; o.areas[n] = ar; if (ar > 30) o.png[n] = ra.mask(i).toDataURL('image/png'); } } catch (e) { o.err = String(e); } }
      if (want.probe) { try { const sc = l.scene, THREE_V = sc.probe.position.clone(); sc.probe.getWorldPosition(THREE_V); THREE_V.project(sc.camera); const rr = sc.renderer.domElement.getBoundingClientRect(); o.probe = [rr.x + (THREE_V.x + 1) / 2 * rr.width, rr.y + (1 - THREE_V.y) / 2 * rr.height]; } catch (e) { o.perr = String(e); } }
      o.state = { view: l.S.view, scenario: l.S.scenario };
      o.ct = !!document.querySelector('[data-testid="mon-ct"].on, [data-testid="mon-ct"][aria-pressed="true"], [data-testid="mon-ct"].active');
      return o;
    }, { mask: def.mask, probe: !!def.probe });
    if (meta.png) { for (const n of Object.keys(meta.png)) { fs.writeFileSync(path.join(dir, `${name}_${n}.png`), Buffer.from(meta.png[n].split(',')[1], 'base64')); } delete meta.png; }
    anchors[k] = meta; if (k % 15 === 0) fs.writeFileSync(af, JSON.stringify(anchors));
    process.stdout.write(`${seg} k=${k} t=${t.toFixed(2)} ${meta.areas ? JSON.stringify(meta.areas) : ''}\n`);
  }
  fs.writeFileSync(path.join(dir, kA === Math.ceil(def.t0 * FPS) && kB === Math.floor(def.t1 * FPS) ? 'anchors.json' : `anchors_${kA}.json`), JSON.stringify(anchors));
  await lab.browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
