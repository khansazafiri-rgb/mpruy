import assert from 'node:assert/strict';
import test from 'node:test';
import { questionText } from './questionText.js';
import { withQuestionLanguage } from './explanationLanguage.js';
import english from '../i18n/en.js';

const stem = 'Saat tekanan perfusi ginjal turun, sel jukstaglomerular menyekresikan…';
const rationale = 'Aldosteron dihasilkan zona glomerulosa korteks adrenal, sebagai kelanjutan jalur RAA.';

test('English localization handles newly loaded rich question text and prose choices when explicitly requested', async () => {
  const source = await Promise.resolve({ id: 'late-question', answer: 'A', stem, options: [
    { label: 'A', text: [{ type: 'paragraph', text: rationale }], correct: true },
    { label: 'B', text: 'nervus medianus' },
  ], statements: [rationale], subQuestions: [{ label: 'a', question: stem, accepted: ['Aldosteron'] }] });
  const display = withQuestionLanguage(source, 'en');
  assert.equal(display.stem, english[stem]);
  assert.equal(display.options[0].text[0].text, english[rationale]);
  assert.equal(display.options[1].text, 'nervus medianus');
  assert.equal(display.statements[0], english[rationale]);
  assert.equal(display.subQuestions[0].question, english[stem]);
  assert.deepEqual(display.subQuestions[0].accepted, ['Aldosteron']);
  assert.equal(display.answer, 'A');
  assert.equal(source.options[0].text[0].text, rationale);
  assert.equal(withQuestionLanguage(source, 'id'), source);
});

test('reviewed prose choices match their original labels while keys and accepted answers cannot be overlaid', () => {
  const source = { id: 'reviewed', answer: 'B', options: [{ label: 'A', text: 'Sumber A', correct: false }, { label: 'B', text: 'Sumber B', correct: true }],
    subQuestions: [{ label: 'x', question: 'Sumber', accepted: ['kunci sumber'], answerCount: 2 }],
    questionEnglish: { answer: 'A', options: [{ label: 'B', text: 'English choice B', correct: false }, { label: 'A', text: 'English choice A', correct: true }],
      subQuestions: [{ label: 'x', question: 'English prompt', accepted: ['wrong replacement'], answerCount: 9 }] } };
  const display = withQuestionLanguage(source, 'en');
  assert.deepEqual(display.options.map(({ label, text, correct }) => ({ label, text, correct })), [
    { label: 'A', text: 'English choice A', correct: false }, { label: 'B', text: 'English choice B', correct: true },
  ]);
  assert.equal(display.answer, 'B');
  assert.equal(display.subQuestions[0].question, 'English prompt');
  assert.deepEqual(display.subQuestions[0].accepted, ['kunci sumber']);
  assert.equal(display.subQuestions[0].answerCount, 2);
});

test('incomplete and legacy English payloads preserve source fields instead of rendering blank questions or choices', () => {
  const q = { stem, hint: 'Petunjuk sumber', options: [{ label: 'A', text: rationale }], explanationEnglish: { explanation: 'Reviewed explanation', options: [{ explanation: 'Reviewed rationale' }] } };
  const display = withQuestionLanguage(q, 'en');
  assert.equal(display.stem, english[stem]);
  assert.equal(display.hint, q.hint);
  assert.equal(display.options[0].text, english[rationale]);
  assert.equal(display.options[0].explanation, 'Reviewed rationale');
  assert.equal(display.explanation, 'Reviewed explanation');
});

test('rich table cells and captions are localized; formulas, URLs and metadata remain exact', () => {
  const content = [{ type: 'table', caption: 'Petunjuk', rows: [[{ text: rationale, image: 'https://example.test/Sumber.png', colspan: 2 }]] },
    { type: 'formula', text: 'CO = HR × SV', caption: 'Petunjuk' }, { type: 'image', url: 'https://example.test/figure.png', caption: 'Petunjuk', width: 75 }];
  const out = questionText(content, 'en');
  assert.equal(out[0].caption, 'Hint');
  assert.equal(out[0].rows[0][0].text, english[rationale]);
  assert.equal(out[0].rows[0][0].image, content[0].rows[0][0].image);
  assert.equal(out[0].rows[0][0].colspan, 2);
  assert.deepEqual(out[1], content[1]);
  assert.equal(out[2].url, content[2].url);
  assert.equal(out[2].width, 75);
});

test('untranslated clinical prose is not guessed or replaced word by word', () => {
  const unknown = '<p>Kalimat kasus baru dengan dosis 5 mg.</p>';
  assert.equal(questionText(unknown, 'en'), unknown);
  assert.equal(questionText('nervus medianus', 'en'), 'nervus medianus');
});
