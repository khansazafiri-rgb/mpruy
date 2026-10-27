import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { URL, fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { lessonChapters, practiceBanks } from './labAuthoredView.js';

const web = fileURLToPath(new URL('../../../', import.meta.url));
const dir = await mkdtemp(path.join(web, '.authored-test-'));
try {
  const outfile = path.join(dir, 'render.mjs');
  await build({ stdin: { contents: `import React from 'react'; import { renderToStaticMarkup } from 'react-dom/server';
    import LabAuthoredContent from './src/features/lab/LabAuthoredContent.jsx';
    import LabQuestion from './src/features/lab/LabQuestion.jsx';
    import LabImage from './src/features/lab/LabImage.jsx';
    export const renderModule = (m, mode) => renderToStaticMarkup(<LabAuthoredContent module={m} initialMode={mode} />);
    export const renderQuestion = (q, saved) => renderToStaticMarkup(<LabQuestion question={q} saved={saved} />);
    export const renderImage = (asset) => renderToStaticMarkup(<LabImage asset={asset} />);`,
    resolveDir: web, loader: 'jsx' }, outfile, bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', packages: 'external',
    define: { 'import.meta.env': '{}' }, loader: { '.svg': 'text' }, alias: { '@': path.join(web, 'src') },
    external: ['react', 'react-dom/server', 'react-router-dom', 'lucide-react', 'three'],
    plugins: [{ name: 'question-view-stub', setup(builder) {
      builder.onResolve({ filter: /^@\/components\/QuestionView$/ }, () => ({ path: 'question-view-stub', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'import React from "react"; export const OptionList = () => <div>Choices</div>;', loader: 'jsx' }));
    } }] });
  const { renderModule, renderQuestion, renderImage } = await import(pathToFileURL(outfile));
  const source = { key: 'aao-oct', title: 'AAO — OCT', url: 'https://example.org/oct', citation: 'Citation', disclosure: 'Reference only', license: 'Linked reference' };
  const question = { id: 'q1', key: 'q1', type: 'image_identification', prompt: 'Kategori mana?', options: [{ label: 'A', text: 'Normal' }, { label: 'B', text: 'DME' }], answerPath: 'lab/modules/oct/questions/bank/q1/answer' };
  const module = { key: 'oct', title: 'Dasar OCT', summary: 'Ringkas.', preview: false, assets: {}, sources: { 'aao-oct': source },
    guides: { guide: { title: 'Cara identifikasi', steps: [{ title: 'Amati', text: 'Cari pola. [Sumber: AAO — OCT]' }], sources: ['aao-oct'] } },
    chapters: [{ key: 'first', title: 'Belajar OCT', sections: [{ key: 'one', title: 'Contoh', blocks: [
      { key: 'guide', type: 'identification_guide', guide: 'guide' },
      { key: 'table', type: 'identification_table', title: 'Bandingkan', columns: ['Kelas', 'Ciri'], rows: [['Normal', 'Teratur. [Sumber: AAO — OCT]']] },
      { key: 'practice', type: 'practice', bank: 'bank', title: 'Latihan' },
    ] }] }], questionBanks: { bank: [question] }, pathways: [] };

  test('lesson and active practice render separately with clickable numbered sources', () => {
    assert.equal(lessonChapters(module)[0].sections[0].blocks.length, 2);
    assert.equal(practiceBanks(module)[0].questions.length, 1);
    const learn = renderModule(module, 'learn');
    assert.ok(learn.includes('Cara identifikasi') && learn.includes('Bandingkan'));
    assert.ok(learn.includes('href="#oct-source-aao-oct"'));
    assert.ok(learn.includes('id="oct-source-aao-oct"'));
    assert.ok(learn.includes('Reference only') && learn.includes('Linked reference'));
    assert.ok(!learn.includes('[Sumber:'));
    assert.ok(!learn.includes('Kategori mana?'));
    const practice = renderModule(module, 'practice');
    assert.ok(practice.includes('Kategori mana?'));
    assert.ok(!practice.includes('Cara identifikasi') && !practice.includes('Bandingkan'));
    assert.ok(!practice.includes('Reference only'));
    assert.ok(!practice.includes('[Sumber:'));
  });

  test('answer and explanation stay hidden until server result exists', () => {
    const hidden = renderQuestion(question);
    assert.ok(!hidden.includes('Jawaban:') && !hidden.includes('Penjelasan klinis'));
    const shown = renderQuestion(question, { response: 'B', result: { correct: false, answer: 'A', explanation: 'Penjelasan klinis' } });
    assert.ok(shown.includes('Jawaban:') && shown.includes('Penjelasan klinis'));
  });

  test('image viewer keeps zoom and source controls', () => {
    const html = renderImage({ url: 'https://example.org/image.png', alt: 'OCT', annotations: [], license: { license: 'CC BY' } });
    assert.ok(html.includes('aria-label="Perbesar"'));
    assert.ok(html.includes('aria-label="Zoom gambar"'));
    assert.ok(html.includes('plus/minus untuk zoom'));
    assert.ok(html.includes('Sumber &amp; lisensi'));
  });
} finally {
  await rm(dir, { recursive: true, force: true });
}
