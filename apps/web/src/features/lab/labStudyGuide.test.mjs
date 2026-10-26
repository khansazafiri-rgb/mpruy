import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { URL, fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const web = fileURLToPath(new URL('../../../', import.meta.url));
const content = JSON.parse(await readFile(new URL('../../../../../tools/lab-ingest/content/identification-guides.json', import.meta.url), 'utf8'));
const dir = await mkdtemp(path.join(web, '.guide-test-'));
try {
  const outfile = path.join(dir, 'render.mjs');
  await build({ stdin: { contents: `import React from 'react'; import { renderToStaticMarkup } from 'react-dom/server';
    import LabLesson, { buildBlocks } from './src/features/lab/LabLesson.jsx';
    export { buildBlocks }; export const render = (d) => renderToStaticMarkup(<LabLesson d={d} ctx={{ modality: 'Citra' }} />);`,
    resolveDir: web, loader: 'jsx' }, outfile, bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', packages: 'external', define: { 'import.meta.env': '{}' },
    loader: { '.svg': 'text' }, alias: { '@': path.join(web, 'src') }, external: ['react', 'react-dom/server', 'react-router-dom', 'lucide-react', 'three'] });
  const { render, buildBlocks } = await import(pathToFileURL(outfile));
  const fixture = (guide) => ({ data: { studyGuide: guide, mode: 'lesson', blocks: [], lab: { rows: [], matches: [] }, references: [] },
    assets: guide.profiles.map((p, i) => ({ id: `image-${i}`, title: p.title, url: 'https://example.test/fixture.png', alt: 'Fixture', dataset: { name: guide.dataset, label: p.key }, annotations: [], license: { source: 'MedMNIST', license: 'CC BY 4.0' } })), questions: [], legacyQuestions: [] });
  test('both authored guides render before images, with class cues beside the gallery', () => {
    for (const guide of Object.values(content)) {
      const d = fixture(guide); const blocks = buildBlocks(d); const types = blocks.map((b) => b.type);
      assert.ok(types.indexOf('study_guide') < types.indexOf('image_gallery'));
      const html = render(d);
      assert.ok(html.includes(guide.title)); assert.ok(html.includes('Ciri yang perlu dicari'));
      assert.ok(html.includes('Sumber pembelajaran')); assert.ok(html.includes('Sumber dan lisensi gambar'));
      assert.ok(html.includes('data-guide-layout="cards"')); assert.ok(html.includes('data-guide-layout="table"'));
      for (const profile of guide.profiles) assert.ok(html.includes(profile.features[0].text));
      assert.ok(!html.includes('observedFeatures')); assert.ok(!html.includes('Pada gambar ini tampak'));
    }
  });
  test('guidance is optional for legacy lessons and excluded from practice presentation', () => {
    const d = fixture(content.bloodmnist); delete d.data.studyGuide;
    assert.ok(!buildBlocks(d).some((b) => b.type === 'study_guide')); assert.doesNotThrow(() => render(d));
    d.data.studyGuide = content.bloodmnist; d.data.mode = 'practice';
    const blocks = buildBlocks(d); assert.ok(!blocks.some((b) => b.type === 'study_guide'));
    assert.equal(blocks.find((b) => b.type === 'image_gallery').guide, null);
  });
  test('rendering code has no runtime AI or live-search dependency', async () => {
    for (const filename of ['LabStudyGuide.jsx', 'LabImageGallery.jsx']) {
      const code = await readFile(new URL(filename, import.meta.url), 'utf8');
      assert.ok(!/\bfetch\s*\(|\bOpenAI\b|api\.openai|web_search|chat\/completions/.test(code));
    }
  });
} finally {
  await rm(dir, { recursive: true, force: true });
}
