// Browser QA for the Lab redesign against a LOCAL dev stack (vite :3000 + PocketBase :8090), after seed.mjs.
//   node scripts/lab-qa/seed.mjs q1 && node scripts/lab-qa/qa.mjs q1 1280 820 390 360 320
// Checks layout (no page overflow, controls inside the viewport, stacked vs side-by-side), flows and interactions.
// Exits non-zero when any check fails. Mobile widths use touch emulation (isMobile + hasTouch).
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../', import.meta.url));
const { chromium } = require('playwright');
const [run, ...widths] = process.argv.slice(2);
const API = process.env.LAB_QA_API || 'http://127.0.0.1:8090'; const WEB = process.env.LAB_QA_WEB || 'http://127.0.0.1:3000';
const OUT = process.env.LAB_QA_OUT || '';
let failed = 0; const check = (name, ok, extra = '') => { if (!ok) failed += 1; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' · ' + extra : ''}`); };
const login = async (identity, password) => (await (await fetch(`${API}/api/collections/users/auth-with-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identity, password }) })).json());
const student = await login(process.env.LAB_QA_STUDENT || 'mahasiswa.dev', process.env.LAB_QA_STUDENT_PW || 'bcgBeAwX');
const admin = await login(process.env.LAB_QA_ADMIN || 'admin.dev', process.env.LAB_QA_ADMIN_PW || 'gR2ahVZe');
const svg = (n) => `<svg xmlns="http://www.w3.org/2000/svg" width="224" height="224"><rect width="224" height="224" fill="#222"/><ellipse cx="80" cy="115" rx="45" ry="75" fill="${/pneumonia/.test(n) ? '#bbb' : '#555'}"/><ellipse cx="144" cy="115" rx="45" ry="75" fill="${/pneumonia/.test(n) ? '#bbb' : '#555'}"/></svg>`;
function glb() {
  const pos = new Float32Array([-1,-1,-1, 1,-1,-1, 1,1,-1, -1,1,-1, -1,-1,1, 1,-1,1, 1,1,1, -1,1,1]); const idx = new Uint16Array([0,1,2,0,2,3, 4,6,5,4,7,6, 0,4,5,0,5,1, 3,2,6,3,6,7, 0,3,7,0,7,4, 1,5,6,1,6,2]);
  const bin = Buffer.concat([Buffer.from(pos.buffer), Buffer.from(idx.buffer)]);
  let json = JSON.stringify({ asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ name: 'cube', mesh: 0 }], meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }], accessors: [{ bufferView: 0, componentType: 5126, count: 8, type: 'VEC3', min: [-1,-1,-1], max: [1,1,1] }, { bufferView: 1, componentType: 5123, count: 36, type: 'SCALAR' }], bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 96, target: 34962 }, { buffer: 0, byteOffset: 96, byteLength: 72, target: 34963 }], buffers: [{ byteLength: 168 }] });
  while (json.length % 4) json += ' '; const jb = Buffer.from(json); const h = Buffer.alloc(12); h.write('glTF'); h.writeUInt32LE(2, 4); h.writeUInt32LE(12 + 8 + jb.length + 8 + bin.length, 8);
  const c1 = Buffer.alloc(8); c1.writeUInt32LE(jb.length, 0); c1.writeUInt32LE(0x4e4f534a, 4); const c2 = Buffer.alloc(8); c2.writeUInt32LE(bin.length, 0); c2.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([h, c1, jb, c2, bin]);
}
const browser = await chromium.launch();
async function open(width, who) {
  const mobile = width <= 500;
  const ctx = await browser.newContext({ viewport: { width, height: mobile ? 780 : 900 }, ...(mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) });
  await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), ['pocketbase_auth', JSON.stringify({ token: who.token, record: who.record })]);
  const page = await ctx.newPage(); const requested = []; page.on('request', (r) => requested.push(r.url()));
  await page.route('https://example.test/**', (r) => { const u = r.request().url(); if (u.endsWith('cube.glb')) return r.fulfill({ body: glb(), contentType: 'model/gltf-binary', headers: { 'access-control-allow-origin': '*' } }); if (u.endsWith('missing.glb')) return r.fulfill({ status: 404, body: 'x', headers: { 'access-control-allow-origin': '*' } }); return r.fulfill({ body: svg(u), contentType: 'image/svg+xml' }); });
  return { ctx, page, requested, mobile };
}
const settle = async (page) => { await page.waitForTimeout(300); await page.waitForSelector('h1, h2, h3', { timeout: 20000 }); await page.waitForTimeout(400); };
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const box = async (loc) => (await loc.first().boundingBox());
const inside = (b, w) => b && b.x >= -1 && b.x + b.width <= w + 1;
const shot = async (page, name) => { if (OUT) await page.screenshot({ path: `${OUT}-${name}.png`, fullPage: true }); };

for (const width of widths.map(Number)) {
  const tag = `w${width}`; const { ctx, page, requested, mobile } = await open(width, student);
  const J = `qa-jalur-${run}`;
  // ---------------- home ----------------
  await page.goto(`${WEB}/lab`); await settle(page); await shot(page, `${tag}-home`);
  check(`${tag} home: no page overflow`, (await overflow(page)) <= 0, String(await overflow(page)));
  check(`${tag} home: one Explore/Guided switch`, (await page.getByRole('tab', { name: 'Explore' }).count()) === 1 && (await page.getByRole('button', { name: 'Explore' }).count()) === 0);
  { const h = await box(page.locator('main header').first().or(page.locator('header').nth(1))); check(`${tag} home: hero is compact (title block ends early)`, h.y + h.height < (mobile ? 190 : 230), String(Math.round(h.y + h.height))); }
  await page.goto(`${WEB}/lab?q=${encodeURIComponent('Mengenali bentuk')}`); await settle(page);
  check(`${tag} home: synthetic demo content is not listed`, (await page.getByText('Mengenali bentuk pada gambar').count()) === 0);
  await page.goto(`${WEB}/lab?mode=guided`); await settle(page);
  check(`${tag} guided list: demo onboarding pathway hidden`, (await page.getByText('Mulai mengenal MEDCOEL Lab').count()) === 0);
  // The dev database accumulates QA pathways with the same title, so page through the list until ours shows up.
  for (let i = 0; i < 6 && !(await page.locator(`a[href="/lab/jalur/${J}"]`).count()); i++) { const nextBtn = page.getByRole('button', { name: 'Berikutnya' }); if (!(await nextBtn.isEnabled())) break; await nextBtn.click(); await page.waitForTimeout(500); }
  check(`${tag} guided list: new pathway shows 'Belum mulai'`, await page.locator(`a[href="/lab/jalur/${J}"]`).getByText('Belum mulai').isVisible());
  await page.goto(`${WEB}/lab?q=${encodeURIComponent('Latihan CXR')}`); await settle(page);
  check(`${tag} home: practice card labelled 'Latihan · 4 kasus'`, await page.getByText('Latihan · 4 kasus').first().isVisible());
  await page.goto(`${WEB}/lab?q=${encodeURIComponent('Chest X-Ray')}`); await settle(page);
  check(`${tag} home: lesson card labelled 'Materi · …'`, await page.getByText(/^Materi · Medical Imaging/).first().isVisible());
  // ---------------- pathway (new) ----------------
  await page.goto(`${WEB}/lab/jalur/${J}`); await settle(page); await shot(page, `${tag}-path-new`);
  check(`${tag} pathway(new): primary CTA is 'Mulai', no 'Lanjutkan'`, (await page.getByRole('link', { name: /^Mulai$/ }).count()) === 1 && (await page.getByText(/Lanjutkan/).count()) === 0);
  check(`${tag} pathway: no page overflow`, (await overflow(page)) <= 0);
  await page.getByRole('link', { name: /^Mulai$/ }).click(); await settle(page); await shot(page, `${tag}-lesson`);
  // ---------------- lesson: compare-first ----------------
  check(`${tag} lesson: compact context line`, await page.getByText(/CXR Dasar · Langkah 1 dari 2/).first().isVisible());
  check(`${tag} lesson: no giant breadcrumbs / duplicate back links`, (await page.getByRole('navigation', { name: 'Jejak halaman' }).count()) === 0);
  const normal = page.getByRole('region', { name: /^Normal, 6 contoh/ }); const pneu = page.getByRole('region', { name: /^Pneumonia, 6 contoh/ });
  const bn = await box(normal); const bp = await box(pneu);
  check(`${tag} lesson: Normal and Pneumonia viewers ${width >= 768 ? 'side by side' : 'stacked'}`, width >= 768 ? Math.abs(bn.y - bp.y) < 6 && bp.x > bn.x + 100 : bp.y > bn.y + bn.height - 6);
  check(`${tag} lesson: no old thumbnail strip, no compare toggle needed`, (await page.locator('ul.snap-x').count()) === 0 && (await page.getByRole('button', { name: /Bandingkan Normal vs Pneumonia/ }).count()) === 0);
  await page.getByRole('button', { name: 'Normal berikutnya' }).click(); await page.getByRole('button', { name: 'Normal berikutnya' }).click();
  check(`${tag} lesson: independent navigation (Normal 3/6, Pneumonia 1/6)`, (await normal.getByText('3 / 6').isVisible()) && (await pneu.getByText('1 / 6').isVisible()));
  await pneu.getByRole('button', { name: 'Pneumonia berikutnya' }).click(); await pneu.getByRole('button', { name: 'Pneumonia berikutnya' }).click(); await pneu.getByRole('button', { name: 'Pneumonia berikutnya' }).click();
  check(`${tag} lesson: pneumonia moves alone (Normal 3/6, Pneumonia 4/6)`, (await normal.getByText('3 / 6').isVisible()) && (await pneu.getByText('4 / 6').isVisible()));
  check(`${tag} lesson: nav buttons are at least 44px`, (await box(normal.getByRole('button', { name: 'Normal berikutnya' }))).height >= 43);
  check(`${tag} lesson: source & licence collapsed by default`, (await page.locator('details[open]').count()) === 0 && (await page.getByText('Sumber & lisensi').first().isVisible()));
  check(`${tag} lesson: no page overflow`, (await overflow(page)) <= 0, String(await overflow(page)));
  const fab = page.locator('.chat-fab'); const nav = page.locator('nav.bottom-nav');
  if (mobile && (await fab.isVisible()) && (await nav.isVisible())) { const f = await box(fab); const n = await box(nav); check(`${tag} lesson: chat button sits above the bottom nav`, f.y + f.height <= n.y + 1, `${Math.round(f.y + f.height)} vs ${Math.round(n.y)}`); }
  await page.getByRole('button', { name: 'Tandai selesai' }).click(); await page.waitForTimeout(400);
  // ---------------- pathway (active) ----------------
  await page.goto(`${WEB}/lab/jalur/${J}`); await settle(page); await shot(page, `${tag}-path-active`);
  check(`${tag} pathway(active): 'Lanjutkan' targets the practice step, not step 1`, await page.getByRole('link', { name: /Lanjutkan: Latihan CXR/ }).isVisible());
  await page.goto(`${WEB}/lab`); await settle(page);
  check(`${tag} home: Continue Learning is first and points at this pathway`, (await page.locator(`section[aria-label="Lanjutkan belajar"] a[href*="jalur=${J}"]`).count()) === 1 && (await box(page.locator('section[aria-label="Lanjutkan belajar"]'))).y < (await box(page.getByRole('tablist', { name: 'Cara belajar Lab' }))).y);
  // ---------------- practice ----------------
  await page.goto(`${WEB}/lab/jalur/${J}`); await settle(page); await page.getByRole('link', { name: /Lanjutkan: Latihan CXR/ }).click(); await settle(page);
  check(`${tag} practice: opens straight on Kasus 1 / 4 (no landing page)`, await page.getByText('Kasus 1 / 4').first().isVisible() && (await page.getByRole('button', { name: 'Mulai latihan' }).count()) === 0);
  const yImg = (await box(page.locator('figure img').first())).y; const yQ = (await box(page.getByRole('heading', { name: /paling sesuai/ }))).y; const yOpt = (await box(page.getByRole('radiogroup'))).y; const ySubmit = (await box(page.getByRole('button', { name: 'Periksa jawaban' }))).y;
  check(`${tag} practice: order image → question → options → submit`, yImg < yQ && yQ < yOpt && yOpt < ySubmit, [yImg, yQ, yOpt, ySubmit].map(Math.round).join('<'));
  check(`${tag} practice: source collapsed, no dataset note, no repeated disclaimers`, (await page.locator('details[open]').count()) === 0 && !(await page.getByText('Image classification training image').isVisible()) && !(await page.getByText(/tidak menambah poin/).isVisible()));
  check(`${tag} practice: chat button ${mobile ? 'hidden during practice' : 'unaffected'}`, mobile ? !(await fab.isVisible()) : true);
  check(`${tag} practice: question image fits and no overflow`, inside(await box(page.locator('figure img').first()), width) && (await overflow(page)) <= 0, String(await overflow(page)));
  await shot(page, `${tag}-practice`);
  const toggle = page.getByRole('button', { name: /^Soal \d+ \/ 4/ }); if (await toggle.isVisible()) await toggle.click();
  check(`${tag} practice: navigator has 4 numbered cases`, (await page.getByRole('button', { name: /^Soal \d+, / }).count()) === 4);
  await page.locator('[role=radiogroup]').getByText('Normal').first().click(); await page.getByRole('button', { name: 'Periksa jawaban' }).click(); await page.getByText('Jawaban tepat').waitFor();
  check(`${tag} practice: concise feedback, no dataset filler`, (await page.getByText('Jawaban: Normal').isVisible()) && (await page.getByText(/Ground-truth|tingkat-gambar/).filter({ visible: true }).count()) === 0);
  await shot(page, `${tag}-practice-feedback`);
  if (!(await page.getByRole('button', { name: /^Soal 3, / }).isVisible())) await page.getByRole('button', { name: /^Soal \d+ \/ 4/ }).click();
  await page.getByRole('button', { name: /^Soal 3, / }).click();
  check(`${tag} practice: navigator jumps to case 3`, await page.getByText('Kasus 3 / 4').first().isVisible());
  await page.locator('[role=radiogroup]').getByText('Pneumonia').first().click(); await page.getByRole('button', { name: 'Periksa jawaban' }).click(); await page.getByText('Belum tepat').waitFor();
  check(`${tag} practice: wrong answer shows 'Belum tepat' + correct answer`, await page.getByText('Jawaban: Normal').isVisible());
  await page.getByRole('button', { name: 'Akhiri latihan' }).click();
  check(`${tag} practice: ending early says 'Sesi diakhiri' with exact counts`, (await page.getByRole('heading', { name: 'Sesi diakhiri' }).isVisible()) && (await page.getByText('1 benar · 1 salah · 2 belum dijawab').isVisible()));
  let prog = await (await fetch(`${API}/api/medcoel/lab/pathways/${J}`, { headers: { Authorization: student.token } })).json();
  check(`${tag} practice: ending early does not complete the lesson`, prog.progress.completed.length === 1);
  await shot(page, `${tag}-summary`);
  await page.getByRole('button', { name: /^Tinjau 3 soal/ }).click();
  check(`${tag} review: 'Tinjau · Kasus 1 / 3' with way back`, (await page.getByText('Tinjau · Kasus 1 / 3').isVisible()) && (await page.getByRole('button', { name: 'Kembali ke ringkasan' }).isVisible()) && (await page.getByRole('button', { name: 'Keluar review' }).isVisible()));
  await page.getByRole('button', { name: 'Kembali ke ringkasan' }).click();
  check(`${tag} review: back to summary`, await page.getByRole('heading', { name: 'Sesi diakhiri' }).isVisible());
  await page.getByRole('button', { name: 'Ulangi dari awal' }).click();
  for (let i = 0; i < 4; i++) { await page.locator('[role=radiogroup]').getByText('Normal').first().click(); await page.getByRole('button', { name: 'Periksa jawaban' }).click(); await page.getByText('Jawaban tepat').waitFor(); await page.getByRole('button', { name: /Berikutnya →|Lihat hasil/ }).click(); await page.waitForTimeout(250); }
  check(`${tag} summary: all answered → 'Sesi latihan selesai'`, await page.getByRole('heading', { name: 'Sesi latihan selesai' }).isVisible());
  prog = await (await fetch(`${API}/api/medcoel/lab/pathways/${J}`, { headers: { Authorization: student.token } })).json();
  check(`${tag} progress: finishing practice completes the practice object`, prog.progress.completed.length === 2);
  // ---------------- pathway (completed) ----------------
  await page.goto(`${WEB}/lab/jalur/${J}`); await settle(page); await shot(page, `${tag}-path-done`);
  check(`${tag} pathway(done): '✓ Jalur selesai' and NO 'Lanjutkan'`, (await page.getByText('✓ Jalur selesai').isVisible()) && (await page.getByText(/Lanjutkan/).count()) === 0 && (await page.getByRole('link', { name: /^Mulai$/ }).count()) === 0);
  check(`${tag} pathway(done): secondary actions`, (await page.getByRole('link', { name: 'Lihat kembali materi' }).isVisible()) && (await page.getByRole('button', { name: 'Ulangi jalur' }).isVisible()));
  await page.goto(`${WEB}/lab`); await settle(page);
  check(`${tag} home: a completed pathway is not offered as Continue Learning`, (await page.locator(`section[aria-label="Lanjutkan belajar"] a[href*="jalur=${J}"]`).count()) === 0);
  await page.goto(`${WEB}/lab/jalur/${J}`); await settle(page); await page.getByRole('button', { name: 'Ulangi jalur' }).click(); await page.waitForTimeout(800);
  check(`${tag} pathway: 'Ulangi jalur' resets to 'Mulai'`, await page.getByRole('link', { name: /^Mulai$/ }).isVisible());
  check(`${tag} no 3D chunk requested on ordinary Lab pages`, !requested.some((u) => /LabModel3DCanvas/.test(u)));
  // ---------------- 3D (real-device layout rules) ----------------
  await page.goto(`${WEB}/lab/objek/qa-3d-ok-${run}`); await settle(page); await page.waitForSelector('canvas', { timeout: 20000 }); await page.waitForTimeout(900); await shot(page, `${tag}-3d`);
  check(`${tag} 3D: chunk loaded only now`, requested.some((u) => /LabModel3DCanvas/.test(u)));
  const cv = await box(page.locator('canvas')); check(`${tag} 3D: canvas fully inside the viewport`, inside(cv, width), JSON.stringify({ x: Math.round(cv.x), w: Math.round(cv.width) }));
  check(`${tag} 3D: no horizontal page scroll`, (await overflow(page)) <= 0, String(await overflow(page)));
  const hint = page.getByText(mobile ? /Seret 1 jari untuk memutar/ : /Seret untuk memutar · Scroll untuk zoom/); const hb = await box(hint); check(`${tag} 3D: ${mobile ? 'touch' : 'desktop'} instruction shown and inside`, (await hint.isVisible()) && inside(hb, width), JSON.stringify(hb));
  const other = page.getByText(mobile ? /Scroll untuk zoom/ : /Seret 1 jari/); check(`${tag} 3D: ${mobile ? 'desktop' : 'touch'} instruction not shown`, (await other.count()) === 0, (await other.allTextContents()).join('|'));
  const sBtn = page.getByRole('button', { name: 'Kubus', exact: true }); await sBtn.click(); await page.waitForTimeout(300);
  check(`${tag} 3D: structure button, panel and opacity slider stay inside`, inside(await box(sBtn), width) && inside(await box(page.getByRole('slider', { name: 'Opasitas Kubus' })), width) && (await overflow(page)) <= 0);
  const cvNow = await box(page.locator('canvas'));
  check(`${tag} 3D: structure panel is ${width < 1024 ? 'below' : 'beside'} the canvas`, width < 1024 ? (await box(sBtn)).y > cvNow.y + cvNow.height - 2 : (await box(sBtn)).x > cvNow.x + cvNow.width - 2);
  check(`${tag} 3D: touch targets ≥ 44px`, (await box(sBtn)).height >= 43 && (await box(page.getByRole('button', { name: /Reset tampilan/ }))).height >= 43);
  await page.getByRole('button', { name: /Reset tampilan/ }).click();
  if (mobile) { await page.setViewportSize({ width: 780, height: Math.min(width, 420) }); await page.waitForTimeout(500); const cv2 = await box(page.locator('canvas')); check(`${tag} 3D: canvas follows orientation change`, inside(cv2, 780) && (await overflow(page)) <= 0 && cv2.width > cv.width + 100, `${Math.round(cv.width)} → ${Math.round(cv2.width)}`); await page.setViewportSize({ width, height: 780 }); }
  await page.goto(`${WEB}/lab/objek/qa-3d-rusak-${run}`); await settle(page); await page.waitForTimeout(1200);
  check(`${tag} 3D: failure shows fallback inside the page`, (await page.getByText(/Berkas model tidak dapat dibaca|Model gagal dimuat/).first().isVisible()) && (await overflow(page)) <= 0);
  await ctx.close();
  // ---------------- admin ----------------
  const a = await open(width, admin); const p = a.page;
  await p.goto(`${WEB}/admin/lab`); await settle(p);
  await p.locator('select').first().selectOption({ label: 'QA visual (v1)' }); await p.waitForTimeout(700);
  await p.getByLabel('Pilih semua').check(); check(`${tag} admin: select all counts items`, await p.getByText(/^\d+ item dipilih$/).isVisible());
  await p.getByLabel('Tipe').selectOption('objects'); await p.waitForTimeout(300);
  check(`${tag} admin: changing a filter clears the hidden selection`, (await p.getByText('0 item dipilih').isVisible()) && (await p.getByRole('button', { name: 'Validasi pilihan (0)' }).isDisabled()));
  check(`${tag} admin: three clear steps Preview / Validasi / Terbitkan`, (await p.getByText('1 · Preview').isVisible()) && (await p.getByText('2 · Validasi').isVisible()) && (await p.getByText('3 · Terbitkan').isVisible()) && (await p.getByRole('button', { name: /Periksa pilihan/ }).count()) === 0);
  await p.getByLabel('Pilih semua').check(); await p.getByRole('button', { name: /Validasi pilihan/ }).click(); await p.waitForTimeout(700);
  check(`${tag} admin: published items reported as already published, not '0 siap'`, (await p.getByText('Sudah terbit').first().isVisible()) && (await p.getByText(/sudah terbit\. Tidak ada yang perlu diterbitkan/).isVisible()));
  check(`${tag} admin: no page overflow`, (await overflow(p)) <= 0, String(await overflow(p)));
  await p.locator('select').first().selectOption({ label: 'QA anatomi (dev) (dev)' }); await p.waitForTimeout(600);
  await p.getByRole('button', { name: 'Validasi content pack' }).click(); await p.waitForTimeout(800);
  check(`${tag} admin: dev pack cannot be published`, (await p.getByText('Tidak dapat diterbitkan').isVisible()) && (await p.getByText(/skema pengembangan/i).first().isVisible()));
  await p.getByRole('button', { name: 'Preview' }).first().click(); await p.waitForSelector('[role=dialog][aria-label="Preview admin"] [aria-label^="Layer Explorer"]'); await p.waitForTimeout(500);
  const dlg = p.getByRole('dialog', { name: 'Preview admin' }); await shot(p, `${tag}-admin-preview`);
  check(`${tag} admin: preview is a focused drawer with the admin banner`, (await dlg.getByText(/Preview admin · siswa tidak melihat halaman ini/).isVisible()) && inside(await box(dlg), width));
  check(`${tag} admin: dev banner visible in preview`, await dlg.getByText('DEVELOPMENT SCHEMATIC — NOT FOR MEDICAL TEACHING').first().isVisible());
  // layer explorer: wheel navigation
  const stage = dlg.locator('[aria-label^="Layer Explorer"] [aria-label^="Area visual"]'); await stage.scrollIntoViewIfNeeded();
  check(`${tag} layer: starts at layer 1`, await dlg.getByText('Lapisan 1 dari 8: Kulit').first().isVisible());
  const prevented = (deltaY) => stage.evaluate((el, dy) => !el.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, cancelable: true, bubbles: true })), deltaY);
  check(`${tag} layer: wheel up at the superficial end is released to the page`, (await prevented(-120)) === false);
  check(`${tag} layer: wheel down over the picture is captured`, (await prevented(120)) === true);
  await p.waitForTimeout(150); check(`${tag} layer: wheel moved one layer deeper`, await dlg.getByText('Lapisan 2 dari 8: Fasia superfisial').first().isVisible());
  if (!mobile) { await stage.hover(); await p.mouse.wheel(0, 130); await p.waitForTimeout(300); check(`${tag} layer: real mouse wheel works too`, await dlg.getByText('Lapisan 3 dari 8: M. pektoralis mayor').first().isVisible()); }
  const before = await dlg.getByText(/^Lapisan \d dari 8/).first().textContent();
  await dlg.locator('[aria-label^="Exploded view"]').scrollIntoViewIfNeeded(); await p.mouse.wheel(0, 120); await p.waitForTimeout(250);
  check(`${tag} layer: wheel outside the picture does not change depth`, (await dlg.getByText(/^Lapisan \d dari 8/).first().textContent()) === before);
  const slider = dlg.getByRole('slider', { name: /Kedalaman lapisan/ }); await slider.focus(); await slider.press('End');
  check(`${tag} layer: slider/keyboard fallback reaches the deepest layer`, await dlg.getByText('Lapisan 8 dari 8: Jantung / mediastinum').first().isVisible());
  await dlg.getByRole('button', { name: 'Lapisan lebih superfisial' }).click();
  check(`${tag} layer: previous-layer button`, await dlg.getByText('Lapisan 7 dari 8: Paru').first().isVisible());
  check(`${tag} layer: secondary controls collapsed by default`, (await dlg.locator('details[open]').count()) === 0);
  // exploded view at 100%
  const xv = dlg.locator('[aria-label^="Exploded view"]'); await xv.getByRole('button', { name: 'Uraikan penuh' }).click(); await p.waitForTimeout(700);
  const rects = await xv.locator('[data-layer][data-visible="true"] rect[vector-effect]').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => ({ top: r.top, bottom: r.bottom })).sort((a, b) => a.top - b.top));
  let gap = Infinity; for (let i = 1; i < rects.length; i++) gap = Math.min(gap, rects[i].top - rects[i - 1].bottom);
  check(`${tag} exploded: 100% sheets do not overlap`, rects.length === 8 && gap >= -0.5, `min gap ${gap.toFixed(1)}px`);
  await xv.getByRole('button', { name: 'Pleura parietal' }).click(); check(`${tag} exploded: selecting a structure shows its description`, await xv.getByText('Melapisi dinding dada bagian dalam.').isVisible());
  check(`${tag} admin preview: no page overflow`, (await overflow(p)) <= 0 && inside(await box(xv), width));
  await shot(p, `${tag}-admin-exploded`);
  await a.ctx.close();
}
await browser.close(); console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nall checks passed'); process.exit(failed ? 1 : 0);
