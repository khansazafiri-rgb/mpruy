// Render beberapa frame uji ke satu lembar kontak: node shot.mjs t1 t2 ...
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ts = process.argv.slice(2).map(Number);
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1080, height: 1920 } })).newPage();
p.on('pageerror', (e) => console.log('pageerror', e.message)); p.on('console', (m) => { if (m.type() === 'error') console.log('console.error', m.text().slice(0, 300)); });
await p.goto('http://127.0.0.1:8124/video/ada-satu-yang-kamu-lupa/stage/index.html'); await p.waitForFunction(() => window.__ready, null, { timeout: 30000 });
for (const t of ts) { try { await p.evaluate((x) => window.renderFrame(x), t); await p.screenshot({ path: `/tmp/claude-0/-home-user/b8bb04db-053d-57ed-b659-c0adcb7e475f/scratchpad/vid2/shot_${t}.jpg`, type: 'jpeg', quality: 85 }); } catch (e) { console.log('gagal', t, e.message.slice(0, 200)); } }
await b.close();
