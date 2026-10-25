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
