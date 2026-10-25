import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const en = require('../pb_hooks/lib/explanationEnglish.js');
const q = {
  qtype: 'A', stem: 'Fungsi nervus medianus?', answer: 'A',
  explanation: [
    { type: 'paragraph', text: 'Lesi nervus medianus menyebabkan gangguan pada 2 jari.' },
    { type: 'table', rows: [[{ text: 'Dosis 5 mg', image: 'https://example.test/5.png' }]] },
    { type: 'image', url: 'https://example.test/9.png', caption: 'Gambar nervus medianus' },
    { type: 'formula', text: 'CO = HR × SV' },
  ],
  options: [{ label: 'A', text: 'nervus medianus', explanation: 'ACh memengaruhi curah jantung.' }],
  subQuestions: [{ label: 'x', question: 'Pertanyaan?', validAnswers: ['kunci'], keyPoints: ['Poin 1'], keyPointsTitle: 'Poin penting', explanation: 'Tidak ada gangguan.' }],
};
const translated = {
  'explanation.0.text': 'A lesion of the nervus medianus affects 2 fingers.',
  'explanation.1.rows.0.0.text': 'A dose of 5 mg',
  'explanation.2.caption': 'Illustration of the nervus medianus',
  'options.0.explanation': 'ACh affects curah jantung.',
  'subQuestions.0.explanation': 'There is no impairment.',
  'subQuestions.0.keyPoints.0': 'Point 1',
  'subQuestions.0.keyPointsTitle': 'Key points',
};
const entries = () => en.segments(q).map((s) => ({ id: s.id, text: translated[s.id] }));

test('segments translate rich display text, including tables and essay points; never URLs, formulas or keys', () => {
  assert.equal(en.segments(q).length, 7);
  const result = en.apply(q, entries());
  assert.equal(result.explanation[0].text, translated['explanation.0.text']);
  assert.equal(result.explanation[1].rows[0][0].image, q.explanation[1].rows[0][0].image);
  assert.deepEqual(result.explanation[3], q.explanation[3]);
  assert.equal(result.subQuestions[0].keyPoints[0], 'Point 1');
  assert.equal(result.options[0].label, 'A');
  assert.equal(q.options[0].explanation, 'ACh memengaruhi curah jantung.');
  assert.ok(!('answer' in result));
  assert.ok(!('validAnswers' in result.subQuestions[0]));
});

test('protects Latin names, acronyms, units and explicit scientific glossary', () => {
  assert.deepEqual(en.validate(q, entries(), ['curah jantung', 'ACh']), []);
  const bad = entries().map((e) => ({ ...e, text: e.text.replace('nervus medianus', 'median nerve').replace('curah jantung', 'cardiac output') }));
  assert.match(en.validate(q, bad, ['curah jantung']).join(' '), /nervus medianus/);
  assert.match(en.validate(q, bad, ['curah jantung']).join(' '), /curah jantung/);
  const unit = entries().map((e) => ({ ...e, text: e.text.replace('5 mg', '5 grams') }));
  assert.match(en.validate(q, unit, []).join(' '), /mg/);
});

test('an acronym cannot be satisfied by a substring inside another identifier', () => {
  const question = { explanation: 'SREBP aktif saat kolesterol RE rendah.' };
  assert.ok(en.validate(question, [{ id: 'explanation', text: 'SREBP is active when ER cholesterol is low.' }], []).some((e) => e.includes('"RE"')));
  assert.deepEqual(en.validate(question, [{ id: 'explanation', text: 'SREBP is active when cholesterol in the RE is low.' }], []), []);
  assert.ok(en.hasTerm('SREBP; RE', 'RE'));
  assert.ok(!en.hasTerm('SREBP', 'RE'));
  assert.ok(!en.hasTerm('FcεRI', 'RI'));
  assert.deepEqual(en.requiredTerms('FcεRI', []), []);
  assert.deepEqual(en.requiredTerms('SREBP puis RE', ['RE']), ['RE', 'SREBP']);
  assert.ok(en.validate({ explanation: 'FcεRI' }, [{ id: 'explanation', text: 'FcεRI2' }], ['FcεRI']).length);
});

test('repeated option labels are not anatomical abbreviations; real artery names remain protected', () => {
  const labeled = { options: [{ label: 'A', text: 'A. defek lapang pandang' }, { label: 'B', text: 'B. nyeri mata' }] };
  const translated = [{ id: 'options.0.text', text: 'A. visual field defect' }, { id: 'options.1.text', text: 'B. eye pain' }];
  assert.deepEqual(en.requiredForSegment(labeled, en.segments(labeled, true)[0], []), []);
  assert.deepEqual(en.validate(labeled, translated, [], true), []);
  assert.ok(en.validate(labeled, translated, ['A. defek'], true).length, 'explicit glossary overrides label inference');
  const arterial = { options: [{ label: 'A', text: 'A. carotis communis' }, { label: 'B', text: 'nervus medianus' }] };
  assert.ok(en.requiredForSegment(arterial, en.segments(arterial, true)[0], []).includes('A. carotis communis'));
  const nested = { options: [{ label: 'A', text: 'A. A. carotis communis' }, { label: 'B', text: 'B. nervus medianus' }] };
  assert.ok(en.requiredForSegment(nested, en.segments(nested, true)[0], []).includes('A. carotis communis'));
  const request = JSON.parse(en.request(labeled, [], 'test-model', true).input[0].content);
  assert.deepEqual(request.segments[0].keep, []);
});

test('rejects missing, duplicate, blank and changed numeric values', () => {
  assert.ok(en.validate(q, entries().slice(1), []).length);
  const duplicate = entries(); duplicate[0] = duplicate[1];
  assert.ok(en.validate(q, duplicate, []).length);
  const blank = entries(); blank[0].text = '';
  assert.ok(en.validate(q, blank, []).length);
  const changed = entries(); changed[0].text = changed[0].text.replace('2', '3');
  assert.match(en.validate(q, changed, []).join(' '), /angka/);
});

test('preserves inline HTML, URLs and formula markup; permits decimal punctuation translation', () => {
  const rich = { explanation: 'Dosis <b>1,5 mg</b>, H~2~O https://example.test/42' };
  assert.deepEqual(en.validate(rich, [{ id: 'explanation', text: 'Dose <b>1.5 mg</b>, H~2~O https://example.test/42' }], []), []);
  assert.ok(en.validate(rich, [{ id: 'explanation', text: 'Dose 1.5 mg, H~2~O https://other.test/42' }], []).length);
});

test('source fingerprint input includes the clinical context, answer and subquestion keys', () => {
  assert.notDeepEqual(en.source(q), en.source({ ...q, stem: 'Soal berubah' }));
  assert.notDeepEqual(en.source(q), en.source({ ...q, answer: 'B' }));
  assert.notDeepEqual(en.source(q), en.source({ ...q, subQuestions: [] }));
  assert.deepEqual(en.terms(' n. medianus\nACh\nACh\n'), ['ACh', 'n. medianus']);
  assert.throws(() => en.terms(['a'.repeat(121)]));
});

test('generation sends the complete context and strict structured output contract without storage', () => {
  const r = en.request(q, ['curah jantung'], 'configured-model');
  assert.equal(r.model, 'configured-model'); assert.equal(r.store, false);
  assert.equal(r.text.format.strict, true);
  const input = JSON.parse(r.input[0].content);
  assert.equal(input.context.answer, 'A');
  assert.equal(input.context.options[0].text, 'nervus medianus');
  assert.ok(input.segments.some((s) => s.keep.includes('curah jantung')));
  assert.match(r.instructions, /negation/);
  assert.match(r.instructions, /untrusted/);
});

test('generation handles HTTP-success refusals, incomplete and malformed model output', () => {
  const content = { segments: entries(), notes: [] };
  const response = { status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(content) }] }] };
  assert.deepEqual(en.parseResponse(response), content);
  assert.throws(() => en.parseResponse({ ...response, status: 'incomplete' }));
  assert.throws(() => en.parseResponse({ status: 'completed', output: [{ content: [{ type: 'refusal' }] }] }));
  assert.throws(() => en.parseResponse({ status: 'completed', output: [{ content: [{ type: 'output_text', text: 'not json' }] }] }));
});
