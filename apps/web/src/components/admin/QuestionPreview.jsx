import QuestionView from '@/components/QuestionView';

// Pratinjau tampilan pengguna untuk soal hasil normalisasi server (kunci dan
// pembahasan ikut terlihat).
export function toViewModel(q, i = 0) {
  return {
    id: `preview-${i}`,
    qtype: q.qtype,
    difficulty: q.difficulty,
    chapterTitle: q.chapterTitle || '',
    stem: q.stem,
    image: q.image,
    statements: q.statements || [],
    hint: q.hint,
    options: q.options || [],
    answer: q.answer,
    explanation: q.explanation,
    subQuestions: (q.subQuestions || []).map((s) => ({ ...s, accepted: s.validAnswers || [] })),
  };
}

export default function QuestionPreview({ q, index = 0 }) {
  const vm = toViewModel(q, index);
  const value = vm.qtype === 'A' || vm.qtype === 'K' ? vm.answer : undefined;
  return <QuestionView q={vm} index={index} value={value} onChange={() => {}} revealed disabled result={null} />;
}
