// Copies the pre-quarantine originals out of Git history into the PRIVATE, gitignored folder
// local-data/licensing-quarantine/originals/ (for licence review or re-processing only).
// It never writes into public/, dist/ or any served folder.
//   node licensing/tools/restore-originals.mjs [--commit b931e1b]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const args = process.argv.slice(2);
const commit = args.includes('--commit') ? args[args.indexOf('--commit') + 1] : 'b931e1b';
const OUT = path.join(ROOT, 'local-data/licensing-quarantine/originals');
const policy = JSON.parse(fs.readFileSync(path.join(ROOT, 'licensing/quarantine-policy.json'), 'utf8'));
const ignored = (() => { try { execFileSync('git', ['-C', ROOT, 'check-ignore', '-q', OUT]); return true; } catch { return false; } })();
if (!ignored) throw new Error(`${OUT} is not gitignored: refusing to write originals there`);
for (const f of policy.quarantinedFiles) {
  const dest = path.join(OUT, f.path);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const bytes = execFileSync('git', ['-C', ROOT, 'show', `${commit}:${f.path}`], { maxBuffer: 64 << 20 });
  fs.writeFileSync(dest, bytes);
  console.log('restored (private)', path.relative(ROOT, dest), bytes.length, 'bytes');
}
