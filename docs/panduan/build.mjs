// Membuat PDF dari docs/panduan/src/*.html memakai Chromium (Playwright).
// Pakai: node docs/panduan/build.mjs            (semua)
//        node docs/panduan/build.mjs 01-hermes   (satu)
// Chromium: PLAYWRIGHT_BROWSERS_PATH sudah diatur di lingkungan ini; di laptop
// jalankan `npx playwright install chromium` sekali.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, 'src');
const only = process.argv[2];
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');

const exe = fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {};
const browser = await chromium.launch(exe);
const files = fs.readdirSync(src).filter((f) => f.endsWith('.html') && (!only || f.startsWith(only)));
for (const f of files) {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(path.join(src, f)).href, { waitUntil: 'load' });
  await page.addStyleTag({ path: path.join(here, 'print.css') });
  await page.evaluate(() => document.fonts.ready);
  const title = await page.title();
  const out = path.join(here, f.replace(/\.html$/, '.pdf'));
  await page.pdf({
    path: out, format: 'A4', printBackground: true, displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `<div style="width:100%;font:8px Inter,sans-serif;color:#7a8a86;padding:0 17mm;display:flex;justify-content:space-between"><span>${title}</span><span>Halaman <span class="pageNumber"></span> dari <span class="totalPages"></span></span></div>`,
    preferCSSPageSize: true,
  });
  console.log('PDF:', path.relative(process.cwd(), out));
  await page.close();
}
await browser.close();
