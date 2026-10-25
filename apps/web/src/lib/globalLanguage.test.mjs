import assert from 'node:assert/strict';
import test from 'node:test';
import { transformSync } from '@babel/core';
import bilingual from '../i18n/compile.mjs';
import english from '../i18n/en.js';
import { translate } from '../i18n/translate.js';
import { getLanguage, setLanguage, subscribe } from '../i18n/store.js';
import { presentSim } from '../features/simulasi/localize.js';
import { withQuestionLanguage } from './explanationLanguage.js';
import { caseCtx, searchActions } from '../features/simulasi/engine.js';

const slots = (s) => [...s.matchAll(/\{(\d+)\}/g)].map((m) => m[1]).sort();
test('every whole-message translation preserves interpolation slots and has content', () => {
  assert.ok(Object.keys(english).length >= 1400);
  for (const [source, target] of Object.entries(english)) {
    assert.ok(target.trim(), source);
    assert.deepEqual(slots(target), slots(source), source);
  }
  assert.equal(translate('Ujian 3 hari lagi', 'en'), 'Exam in 3 days');
  assert.equal(translate('Soal 1, Benar', 'en'), 'Question 1, Correct');
  assert.equal(translate('Hai, Mei! Aku Kori.', 'en'), "Hi, Mei! I'm Kori.");
  assert.equal(translate('Terjadi kesalahan. Coba lagi.', 'id'), 'Terjadi kesalahan. Coba lagi.');
  assert.equal(translate('nervus medianus', 'en'), 'nervus medianus');
  assert.equal(translate('constructor', 'en'), 'constructor');
  assert.equal(translate('/api/medcoel/attempts/1', 'en'), '/api/medcoel/attempts/1');
  assert.equal(translate('Custom content never translated word by word', 'en'), 'Custom content never translated word by word');
});

test('the Indonesian-only store updates subscribers without replacing session state', () => {
  let updates = 0; const session = { answer: 'B', remaining: 173, notes: 'my note' };
  const off = subscribe(() => { updates++; });
  setLanguage('en'); assert.equal(getLanguage(), 'id');
  setLanguage('id'); assert.equal(getLanguage(), 'id');
  assert.equal(updates, 2); assert.deepEqual(session, { answer: 'B', remaining: 173, notes: 'my note' }); off();
});

test('the compiler localizes nested authored JSX and accessibility labels, not form values, user text, keys or event actions', () => {
  const src = `export default function Demo(){const [v,set]=useState('santai'); return <div><input value={v} placeholder="Cari tindakan"/><button onClick={()=>set('santai')}>Beranda</button>{items.map(it=><span aria-label="Catatan">{it.label}</span>)}<div translate="no">{message}</div></div>}`;
  const out = transformSync(src, { filename: '/src/Demo.jsx', parserOpts: { plugins: ['jsx'] }, plugins: [bilingual], configFile: false, babelrc: false }).code;
  assert.match(out, /__useLanguage\(\)/);
  assert.match(out, /__uiText\("Beranda"\)/);
  assert.match(out, /__uiText\(it.label\)/);
  assert.match(out, /placeholder=\{__uiText\("Cari tindakan"\)\}/);
  assert.match(out, /value=\{v\}/);
  assert.match(out, /set\('santai'\)/);
  assert.match(out, /translate="no">\{message\}/);
  assert.equal((out.match(/__useLanguage\(\)/g) || []).length, 1);
});

test('question switching changes reviewed presentation only and leaves answers and scoring data intact', () => {
  const q = { id: 'q', answer: 'B', stem: 'Sumber', options: [{ label: 'B', text: 'nervus medianus' }], subQuestions: [{ label: 'A', accepted: ['kunci'] }], questionEnglish: { stem: 'English question', options: [{ label: 'B', text: 'nervus medianus' }], subQuestions: [{ label: 'A', question: 'English subquestion' }] } };
  const view = withQuestionLanguage(q, 'en');
  assert.equal(view.id, q.id); assert.equal(view.answer, 'B');
  assert.equal(view.stem, 'English question'); assert.deepEqual(view.subQuestions[0].accepted, ['kunci']);
  assert.ok(!('explanation' in view)); assert.equal(q.stem, 'Sumber');
});

test('simulation localization keeps raw timer, actions, notes and clinical grading keys unchanged', () => {
  const C = { id: 'Pak A, 25 tahun', K: 'ku vital', U: 'dl', B: 'pulang', dxOk: 'pneumonia', intro: [{ t: 'Saya demam.' }], A: {} };
  const english = { ...C, id: 'Pak A, 25 years old', intro: [{ t: 'I have a fever.' }] };
  C.english = { data: english };
  const pick = () => {};
  const raw = { s: { ctx: { key: 'case', C }, left: 300, dx: 'pneumonia', done: { ku: true }, log: [{ text: 'Saya demam.' }], card: null }, pick };
  const view = presentSim(raw, 'en');
  assert.equal(view.pick, pick); assert.equal(view.s.left, 300); assert.equal(view.s.dx, 'pneumonia');
  assert.deepEqual(view.s.done, { ku: true }); assert.equal(view.s.ctx.C.K, 'ku vital');
  assert.equal(view.translateClinical('Saya demam.'), 'I have a fever.');
  english.A = { onset: { say: 'For a few days.' }, durasi: { say: 'It lasts a few days.' } };
  assert.equal(view.translateClinical('Beberapa hari.', { translationAction: 'onset', translationRole: 1 }), 'For a few days.');
  assert.equal(view.translateClinical('Beberapa hari.', { translationAction: 'durasi', translationRole: 1 }), 'It lasts a few days.');
  english.A.vital = { title: 'Vital signs', rows: 'Pulse=90 bpm' };
  raw.s.log.push({ key: 'vital', text: 'Tanda vital: Nadi 90 bpm' });
  assert.equal(presentSim(raw, 'en').s.log[1].text, 'Vital signs: Pulse 90 bpm');
  assert.equal(raw.s.log[0].text, 'Saya demam.');
  assert.equal(presentSim(raw, 'id'), raw);
  assert.ok(searchActions('cough', caseCtx('umum'), 60, (s) => translate(s, 'en')).some((a) => a.id === 'batuk'));
});
