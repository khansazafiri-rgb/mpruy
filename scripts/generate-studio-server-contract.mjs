// Generated server contract is byte-for-byte reproducible from the canonical catalog + pure CJS core.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const source = fs.readFileSync(root + 'packages/studio-contract/availability.cjs', 'utf8');
const catalog = JSON.parse(fs.readFileSync(root + 'shared/studios/catalog.v1.json', 'utf8'));
const destination = root + 'apps/pocketbase/pb_hooks/lib/studio-contract.generated.js';
const output = '// GENERATED FILE. Do not edit. Run node scripts/generate-studio-server-contract.mjs.\n' + source +
  '\nmodule.exports.catalog = ' + JSON.stringify(catalog) + ';\n';
const clearanceDestination = root + 'apps/pocketbase/pb_hooks/lib/studio-clearance.generated.js';
const clearanceOutput = '// GENERATED FILE. Do not edit. Run node scripts/generate-studio-server-contract.mjs.\n' +
  fs.readFileSync(root + 'packages/studio-contract/clearance.cjs', 'utf8');
// Typed-anatomy grader (ESM source of truth) re-expressed as CommonJS for the PocketBase JSVM.
const typedSource = fs.readFileSync(root + 'packages/studio-contract/typed-anatomy.mjs', 'utf8');
const typedOutput = '// GENERATED FILE. Do not edit. Run node scripts/generate-studio-server-contract.mjs.\n\'use strict\';\n' +
  typedSource.replace(/^export (const|function) /gm, '$1 ') + '\nmodule.exports = { normalizeTerm, checkTypedAnswer };\n';
const outputs = [[destination, output], [clearanceDestination, clearanceOutput], [root + 'apps/pocketbase/pb_hooks/lib/typed-anatomy.generated.js', typedOutput]];
if (process.argv.includes('--check')) {
  for (const [file, text] of outputs) if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text) {
    console.error('Generated Studio server contract has drifted (' + file.slice(root.length) + '). Regenerate and commit it.');
    process.exitCode = 1;
  }
} else {
  for (const [file, text] of outputs) fs.writeFileSync(file, text);
}
