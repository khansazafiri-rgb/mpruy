import assert from 'node:assert/strict';
import test from 'node:test';
import { withExplanationLanguage } from './explanationLanguage.js';

test('switching explanation language preserves question, answers, identity and grading data', () => {
  const q = {
    id: 'q1', stem: 'Soal asli', answer: 'B', explanation: 'Pembahasan asli',
    options: [{ label: 'B', text: 'M. supraspinatus', explanation: 'Alasan asli' }],
    subQuestions: [{ label: 'A', question: 'Asli', accepted: ['kunci'], answerCount: 2, explanation: 'Asli', keyPoints: ['Poin asli'] }],
    explanationEnglish: { explanation: 'English explanation', options: [{ label: 'B', explanation: 'English rationale' }], subQuestions: [{ label: 'A', explanation: 'English', keyPoints: ['Key point'] }] },
  };
  const english = withExplanationLanguage(q, 'en');
  assert.equal(english.id, q.id); assert.equal(english.stem, q.stem); assert.equal(english.answer, 'B');
  assert.equal(english.options[0].text, q.options[0].text);
  assert.equal(english.options[0].explanation, 'English rationale');
  assert.deepEqual(english.subQuestions[0].accepted, ['kunci']);
  assert.equal(english.subQuestions[0].answerCount, 2);
  assert.deepEqual(english.subQuestions[0].keyPoints, ['Key point']);
  assert.equal(withExplanationLanguage(q, 'original'), q);
  assert.equal(q.explanation, 'Pembahasan asli');
});

test('missing reviewed English falls back to the source', () => {
  const q = { id: 'old-question', explanation: 'Sumber' };
  assert.equal(withExplanationLanguage(q, 'en'), q);
});
