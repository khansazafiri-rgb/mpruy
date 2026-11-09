import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectNewViewerCode, longestSharedBlock, sourceTokens } from '../../../licensing/tools/scan-atlas-code-origin.mjs';

test('block-overlap screen detects literal copied code despite whitespace differences', () => {
  const source = sourceTokens('function calculate(){ const distance = 10 + 20; return distance * distance; }');
  const copy = sourceTokens('function calculate ( ) { const distance=10 + 20 ;return distance * distance; }');
  assert.equal(longestSharedBlock(copy, source, 12), source.length);
  assert.equal(longestSharedBlock(['unrelated'], source, 12), 0);
});
test('independent pilot screens against existing imported NC Atlas source for large copied token blocks', () => {
  const audit = inspectNewViewerCode();
  assert.ok(audit.comparedLegacyFiles >= 20);
  assert.equal(audit.matches.length, 5);
  assert.deepEqual(audit.flagged, [], 'potential literal copy requires a review before pilot is accepted');
  for (const item of audit.matches) assert.ok(item.commonTokens < audit.blockThresholdTokens, item.file);
});
