// Generated server contract is byte-for-byte reproducible from the canonical catalog + pure CJS core.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const source = fs.readFileSync(root + 'packages/studio-contract/availability.cjs', 'utf8');
const catalog = JSON.parse(fs.readFileSync(root + 'shared/studios/catalog.v1.json', 'utf8'));
const destination = root + 'apps/pocketbase/pb_hooks/lib/studio-contract.generated.js';
const output = '// GENERATED FILE. Do not edit. Run node scripts/generate-studio-server-contract.mjs.\n' + source +
  '\nmodule.exports.catalog = ' + JSON.stringify(catalog) + ';\n';
if (process.argv.includes('--check')) {
  if (!fs.existsSync(destination) || fs.readFileSync(destination, 'utf8') !== output) {
    console.error('Generated Studio server contract has drifted. Regenerate and commit it.');
    process.exitCode = 1;
  }
} else {
  fs.writeFileSync(destination, output);
}
