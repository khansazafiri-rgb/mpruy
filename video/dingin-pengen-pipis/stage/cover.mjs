// Cover 1080x1920: Raka menggigil di kelas sambil melirik tanda toilet. Pemakaian: node cover.mjs out.jpg  (server statis di akar repo, port 8140)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const out = process.argv[2] || 'cover.jpg';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1080, height: 1920 } })).newPage();
p.on('pageerror', (e) => console.log('pageerror', e.message)); p.on('console', (m) => { if (m.type() === 'error') console.log('console', m.text()); });
await p.goto('http://127.0.0.1:8140/video/dingin-pengen-pipis/stage/cover.html'); await p.waitForFunction(() => window.__ready);
await p.screenshot({ path: out, type: 'jpeg', quality: 95 });
await b.close();
