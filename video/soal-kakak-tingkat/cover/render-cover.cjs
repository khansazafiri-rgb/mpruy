// node render-cover.cjs  -> cover.png (1080x1920), cover-profil-3x4.png (crop tengah 1080x1440), cover-pratinjau-profil.png (grid 3 kolom + panduan area aman)
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const url = 'http://127.0.0.1:8128/video/soal-kakak-tingkat/cover/cover.html';
  await p.goto(url); await p.waitForFunction(() => window.__ready); await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(__dirname, 'cover.png') });
  await p.goto(url + '?guide'); await p.waitForFunction(() => window.__ready); await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(__dirname, 'cover-panduan-area-aman.png') });
  await b.close();
})();
