import { translate } from '../../i18n/translate.js';
import { BYID, answerOf, cardNote } from './engine.js';

export function presentSim(sim, language) {
  if (language !== 'en') return sim;
  const source = sim.s.ctx.C;
  const english = source.english?.data;
  const map = new Map();
  function pair(a, b) {
    if (typeof a === 'string' && typeof b === 'string') {
      map.set(a, b);
      // Reviewed result cards are structured rows, not word-by-word prose.
      if (a.includes('=') && b.includes('=')) {
        const left = a.split(';'); const right = b.split(';');
        if (left.length === right.length) left.forEach((row, i) => {
          const aa = row.split('='); const bb = right[i].split('=');
          if (aa.length === 2 && bb.length === 2) { map.set(aa[0], bb[0]); map.set(aa[1], bb[1]); }
        });
      }
    } else if (a && b && typeof a === 'object' && typeof b === 'object') {
      Object.keys(a).forEach((key) => { if (key in b) pair(a[key], b[key]); });
    }
  }
  if (english) pair(source, english);
  const text = (s, line) => {
    if (line?.translationIntro !== undefined) return english?.intro?.[line.translationIntro]?.t ?? translate(s, 'en');
    const action = line?.translationRole === 1 && english?.A?.[line.translationAction];
    if (action && (action.say !== undefined || action.t !== undefined)) return action.say ?? action.t;
    return map.get(s) ?? translate(s, 'en');
  };
  const card = sim.s.card;
  function note(line) {
    const it = BYID[line.key];
    if (english && it?.kind === 'card') {
      const answer = answerOf(it, { ...sim.s.ctx, C: english });
      return answer.note || cardNote({ ...answer, title: text(answer.title), rows: answer.rows.map(([key, value]) => [text(key), text(value)]) });
    }
    return english?.A?.[line.key]?.note ?? text(line.text);
  }
  return {
    ...sim, translateClinical: text,
    s: {
      ...sim.s,
      ctx: { ...sim.s.ctx, C: { ...source, id: english?.id || text(source.id), ref: english?.ref || text(source.ref) } },
      log: sim.s.log.map((line) => ({ ...line, text: note(line) })),
      card: card ? { ...card, title: text(card.title), sub: text(card.sub), rows: card.rows.map(([key, value]) => [text(key), text(value)]) } : null,
    },
  };
}
