// Memeriksa semua prasyarat:  npm run check
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { piperVoicePath } from './tts.mjs';
import { KIT } from './lib.mjs';
import path from 'node:path';

let bad = 0;
const ok = (m) => console.log('  ok   ', m);
const no = (m, fix) => { bad++; console.log('  GAGAL', m, fix ? `\n         -> ${fix}` : ''); };
const run = (c, a) => spawnSync(c, a, { encoding: 'utf8' });

console.log('Memeriksa kit video MEDCOEL');
const node = parseInt(process.versions.node);
node >= 20 ? ok(`Node ${process.versions.node}`) : no(`Node ${process.versions.node} terlalu lama`, 'pasang Node.js 22');
const ff = run('ffmpeg', ['-version']);
ff.error ? no('ffmpeg tidak ada', 'sudo apt-get install ffmpeg') : ok(ff.stdout.split('\n')[0]);
const venv = path.join(KIT, '.venv', 'bin', 'piper');
const pcmd = process.env.PIPER_CMD ? process.env.PIPER_CMD.split(/\s+/)[0] : fs.existsSync(venv) ? venv : 'piper';
const pp = run(pcmd, ['--help']);
pp.error ? no('Piper tidak ada', 'bash scripts/setup.sh') : ok(`Piper (${pcmd})`);
const voice = piperVoicePath();
fs.existsSync(voice) ? ok(`Suara: ${path.basename(voice)}`) : no(`Model suara tidak ada: ${voice}`, 'bash scripts/setup.sh');
try {
  const { chromium } = await import('playwright');
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  await b.close(); ok('Chromium (Playwright) bisa dijalankan');
} catch (e) { no(`Chromium gagal: ${String(e.message).split('\n')[0]}`, 'npx playwright install --with-deps chromium'); }
console.log(bad ? `\n${bad} masalah. Perbaiki lalu ulangi.` : '\nSemua siap. Coba: npm run video -- scenes/kenalan-kori.json --draft');
process.exit(bad ? 1 : 0);
