// "Belajar" workspace: learning modes, modules, task checking against the real simulator state, feedback,
// local-only progress, and the credits/licence page.
import { MODES, MODULES, loadProgress, saveProgress } from '../edu/modules.js';
import { STRUCTURES } from '../edu/structures.js';
import { EDU_REFERENCES } from '../edu/references.js';
import { REFERENCES } from '../sim/references.js';
import { CREDITS } from '../edu/credits.js';

const REF = { ...REFERENCES, ...EDU_REFERENCES };

export class Learn {
  /** ctx: {el, root, snapshot(), setup(spec), setAssist(level), status(text, kind)} */
  constructor(ctx) { this.ctx = ctx; this.mode = 'guided'; this.moduleId = MODULES[0].id; this.taskIdx = 0; this.feedback = null; this.progress = loadProgress(); }
  get module() { return MODULES.find((m) => m.id === this.moduleId); }
  get task() { return this.module.tasks[this.taskIdx]; }
  /** Called by the monitor pick handler while an identify task is active. Returns true if consumed. */
  answerPick(id) {
    const t = this.task; if (!this.active || t?.type !== 'identify' || !id) return false;
    const ok = id.kind === 'structure' && id.key === t.target;
    const got = id.kind === 'structure' ? STRUCTURES[id.key].nameId : id.text;
    this._record(ok, ok ? `Benar — ${STRUCTURES[t.target].nameId}.` : `Belum tepat: yang kamu klik adalah "${got}". Cari ${STRUCTURES[t.target].nameId}.`);
    return true;
  }
  check() {
    const t = this.task; if (!t?.check) return;
    const ok = !!t.check(this.ctx.snapshot());
    this._record(ok, ok ? 'Tepat.' : 'Belum: ' + (t.hint || 'periksa lagi bidang dan strukturnya.'));
  }
  answerQuiz(i) { const t = this.task; this._record(i === t.answer, i === t.answer ? 'Benar.' : `Belum tepat. Jawaban: "${t.options[t.answer]}".`); }
  _record(ok, msg) {
    const t = this.task, p = (this.progress[t.id] ||= { done: false, attempts: 0, mistakes: 0 });
    p.attempts++; if (ok) p.done = true; else p.mistakes++;
    saveProgress(this.progress);
    this.feedback = { ok, msg, explain: t.explain };
    this.render();
  }
  setMode(m) { this.mode = m; this.ctx.setAssist(MODES[m].assist); this.render(); }
  start(moduleId, idx = 0) { this.moduleId = moduleId; this.taskIdx = idx; this.feedback = null; this.active = true; this.render(); }
  next(d = 1) { const n = this.module.tasks.length; this.taskIdx = (this.taskIdx + d + n) % n; this.feedback = null; this.render(); }
  reset() { this.progress = {}; saveProgress(this.progress); this.render(); }

  render() {
    const { el, root } = this.ctx, kids = [];
    kids.push(el('h3', {}, 'Belajar dengan 4D Lab'),
      el('div', { class: 'seg wrap', role: 'group', 'data-testid': 'learn-modes' }, ...Object.entries(MODES).map(([k, m]) => el('button', { type: 'button', 'data-testid': 'learn-mode-' + k, 'aria-pressed': String(k === this.mode), onclick: () => this.setMode(k) }, m.label))),
      el('p', { class: 'hint' }, MODES[this.mode].text));
    if (this.mode === 'review') kids.push(this._review());
    else {
      kids.push(el('div', { class: 'module-list' }, ...MODULES.map((m) => {
        const done = m.tasks.filter((t) => this.progress[t.id]?.done).length;
        return el('button', { type: 'button', class: 'module-btn' + (m.id === this.moduleId && this.active ? ' on' : ''), 'data-testid': 'module-' + m.id, onclick: () => this.start(m.id) },
          el('b', {}, m.title), el('span', {}, m.goal), el('span', { class: 'prog' }, `${done}/${m.tasks.length} selesai`));
      })));
      if (this.active) kids.push(this._task());
    }
    kids.push(el('details', { class: 'limits', 'data-testid': 'credits' }, el('summary', {}, 'Kredit, lisensi & sumber'), ...CREDITS.map((c) => el('div', { class: 'credit' }, el('b', {}, c.what), el('span', {}, c.source), el('span', { class: 'meta' }, c.licence)))),
      el('p', { class: 'meta' }, 'Kemajuan disimpan hanya di browser ini (tanpa akun/server). Latihan di simulator tidak menggantikan pelatihan klinis terawasi atau penilaian kompetensi.'));
    root.replaceChildren(...kids);
  }
  _task() {
    const { el } = this.ctx, t = this.task, m = this.module, p = this.progress[t.id];
    const showHint = this.mode !== 'practice' && t.hint;
    const body = [el('div', { class: 'task-head' }, el('span', { class: 'task-type' }, { navigate: 'Navigasi', identify: 'Identifikasi', place: 'Penempatan probe', listen: 'Auskultasi', quiz: 'Penalaran' }[t.type]),
      el('span', { class: 'meta' }, `${this.taskIdx + 1}/${m.tasks.length}${p?.done ? ' · ✓' : ''}`)),
    el('h4', {}, t.title), el('p', { 'data-testid': 'task-prompt' }, t.prompt), showHint ? el('p', { class: 'hint' }, 'Petunjuk: ' + t.hint) : null];
    if (t.setup) body.push(el('button', { type: 'button', class: 'btn', 'data-testid': 'task-setup', onclick: () => this.ctx.setup(t.setup, t) }, 'Siapkan tampilan'));
    if (t.type === 'quiz') body.push(el('div', { class: 'quiz' }, ...t.options.map((o, i) => el('button', { type: 'button', class: 'chipbtn', 'data-testid': 'quiz-' + i, onclick: () => this.answerQuiz(i) }, o))));
    else if (t.type === 'identify') body.push(el('p', { class: 'meta' }, 'Klik strukturnya langsung pada citra monitor.'));
    else body.push(el('button', { type: 'button', class: 'btn primary', 'data-testid': 'task-check', onclick: () => this.check() }, 'Periksa'));
    if (this.feedback) body.push(el('div', { class: 'feedback ' + (this.feedback.ok ? 'ok' : 'no'), 'data-testid': 'task-feedback', role: 'status' }, el('b', {}, this.feedback.msg), el('p', {}, this.feedback.explain)));
    body.push(el('div', { class: 'row' }, el('button', { type: 'button', class: 'btn', onclick: () => this.next(-1) }, '← Sebelumnya'), el('button', { type: 'button', class: 'btn', 'data-testid': 'task-next', onclick: () => this.next(1) }, 'Berikutnya →')),
      el('details', { class: 'limits' }, el('summary', {}, 'Sumber modul'), el('ol', { class: 'refs' }, ...m.refs.map((r) => el('li', {}, `[${r}] ${REF[r]}`)))));
    return el('section', { class: 'task-card', 'data-testid': 'task-card' }, ...body);
  }
  _review() {
    const { el } = this.ctx, rows = [];
    for (const m of MODULES) for (const t of m.tasks) {
      const p = this.progress[t.id]; if (!p) continue;
      rows.push(el('li', { class: p.done ? 'ok' : 'no' }, el('b', {}, `${p.done ? '✓' : '✗'} ${t.title}`), el('span', { class: 'meta' }, ` ${p.attempts} percobaan, ${p.mistakes} salah`), p.mistakes ? el('p', {}, t.explain) : null));
    }
    return el('section', { class: 'task-card', 'data-testid': 'review' }, el('h4', {}, 'Tinjauan'), rows.length ? el('ul', { class: 'review-list' }, ...rows) : el('p', { class: 'meta' }, 'Belum ada jawaban.'),
      el('button', { type: 'button', class: 'btn', onclick: () => this.reset() }, 'Hapus kemajuan lokal'));
  }
}
