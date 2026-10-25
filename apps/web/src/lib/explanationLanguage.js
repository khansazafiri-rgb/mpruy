import { questionText } from './questionText.js';

// Only explanation fields change; grading and question identity remain intact.
export function withExplanationLanguage(q, language) {
  const en = language === 'en' && q.explanationEnglish;
  if (!en) return q;
  return {
    ...q,
    explanation: en.explanation,
    options: (q.options || []).map((o) => ({ ...o, explanation: en.options?.find((x) => x.label === o.label)?.explanation ?? o.explanation })),
    subQuestions: (q.subQuestions || []).map((s) => {
      const translated = en.subQuestions?.find((x) => x.label === s.label);
      return translated ? { ...s, explanation: translated.explanation, keyPoints: translated.keyPoints, keyPointsTitle: translated.keyPointsTitle } : s;
    }),
  };
}

export function withQuestionLanguage(q, language) {
  if (language !== 'en') return q;
  const english = q.questionEnglish || q.explanationEnglish;
  const display = (source, translated, fields) => {
    const out = { ...source };
    fields.forEach((field) => {
      if (source[field] !== undefined || translated?.[field] !== undefined) {
        out[field] = questionText(translated?.[field] ?? source[field], language);
      }
    });
    return out;
  };
  const match = (parts, source, index) => {
    if (!Array.isArray(parts)) return undefined;
    return parts.find((part) => part?.label != null && String(part.label) === String(source.label))
      ?? (parts[index]?.label == null ? parts[index] : undefined);
  };
  const out = display(q, english, ['stem', 'hint', 'statements', 'explanation']);
  out.options = (q.options || []).map((option, index) => display(option, match(english?.options, option, index), ['text', 'explanation']));
  out.subQuestions = (q.subQuestions || []).map((sub, index) => display(sub, match(english?.subQuestions, sub, index), ['question', 'explanation', 'keyPoints', 'keyPointsTitle']));
  return out;
}
