// Conservative local similarity screen for a newly written viewer against the
// imported Atlas application. This is NOT a copyright originality certification:
// similarity can be nonliteral and origin/ownership require independent review.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const LEGACY_ROOT = path.join(ROOT, 'apps/anatomy');
const PILOT_ROOT = path.join(ROOT, 'apps/4d-lab');
const PILOT_FILES = [
  'src/independent-atlas/main.js',
  'src/independent-atlas/catalog.js',
  'src/independent-atlas/styles.css',
  'atlas-preview/index.html',
];
const TOKEN_WINDOW = 44;
const BLOCK_THRESHOLD = 90;
const sourceExt = /\.(js|jsx|css|html|mjs)$/i;
function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(p));
    else if (entry.isFile() && sourceExt.test(entry.name)) files.push(p);
  }
  return files;
}
export function sourceTokens(source) {
  // A lexical screen intentionally preserves literal text and identifiers;
  // whitespace differences do not conceal large copied blocks.
  return (source.match(/[a-zA-Z_$][\w$]*|\d+(?:\.\d+)?|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s]/g) || []);
}
export function longestSharedBlock(newTokens, oldTokens, width = TOKEN_WINDOW) {
  if (newTokens.length < width || oldTokens.length < width) return 0;
  const baseline = new Map();
  for (let i = 0; i <= oldTokens.length - width; i++) {
    const hash = oldTokens.slice(i, i + width).join('\u0001');
    const at = baseline.get(hash);
    if (at) at.push(i); else baseline.set(hash, [i]);
  }
  let best = 0;
  for (let i = 0; i <= newTokens.length - width; i++) {
    const matches = baseline.get(newTokens.slice(i, i + width).join('\u0001'));
    if (!matches) continue;
    for (const at of matches.slice(0, 12)) {
      let span = width;
      while (i + span < newTokens.length && at + span < oldTokens.length &&
        newTokens[i + span] === oldTokens[at + span]) span++;
      best = Math.max(best, span);
    }
  }
  return best;
}
export function inspectNewViewerCode() {
  const oldFiles = [
    ...walk(path.join(LEGACY_ROOT, 'src')),
    ...walk(path.join(LEGACY_ROOT, 'tools')),
    path.join(LEGACY_ROOT, 'index.html'),
  ].map(file => ({file, tokens: sourceTokens(fs.readFileSync(file, 'utf8'))}));
  const report = [];
  for (const rel of PILOT_FILES) {
    const full = path.join(PILOT_ROOT, rel);
    const newCode = fs.readFileSync(full, 'utf8');
    if (/from\s+['"][^'"]*apps\/anatomy\/src\//.test(newCode) ||
      /(?:import|fetch)\s*\(\s*['"]\/anatomy\/viewer\//.test(newCode)) {
      throw new Error('Pilot imports or fetches legacy Atlas Viewer application code: ' + rel);
    }
    const tokens = sourceTokens(newCode);
    let top = { oldFile: null, commonTokens: 0 };
    for (const old of oldFiles) {
      const commonTokens = longestSharedBlock(tokens, old.tokens);
      if (commonTokens > top.commonTokens)
        top = { oldFile: path.relative(ROOT, old.file), commonTokens };
    }
    report.push({file: 'apps/4d-lab/' + rel, ...top});
  }
  return { comparedLegacyFiles: oldFiles.length, blockThresholdTokens: BLOCK_THRESHOLD,
    matches: report, flagged: report.filter(r => r.commonTokens >= BLOCK_THRESHOLD) };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const result = inspectNewViewerCode();
    console.log(JSON.stringify(result, null, 2));
    if (result.flagged.length) {
      console.error('Potential large copied block: human code-provenance review required.');
      process.exitCode = 1;
    }
  } catch (e) { console.error(e); process.exitCode = 1; }
}
