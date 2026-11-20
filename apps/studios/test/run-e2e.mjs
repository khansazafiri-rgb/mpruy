// Runs every studio browser test (standalone builds, software WebGL). Build first: node scripts/build-all.mjs [--private]
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const dir = new URL('.', import.meta.url).pathname;
let failed = 0;
for (const f of readdirSync(dir).filter(f => f.endsWith('.e2e.mjs')).sort()) {
  const r = spawnSync(process.execPath, [dir + f, ...process.argv.slice(2)], { stdio: 'inherit' });
  if (r.status !== 0) { failed++; console.error('FAILED', f); }
}
process.exit(failed ? 1 : 0);
