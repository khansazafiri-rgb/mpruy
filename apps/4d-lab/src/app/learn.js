// "Belajar" workspace — a DIRECTED path, one step at a time:
//   home    : "Lanjutkan" (next unfinished step) + the recommended module path with progress
//   task    : goal -> the view is prepared automatically -> one action -> immediate feedback -> "Lanjut"
//   summary : end of a module: score, mistakes with their explanations, next module
// Tasks are checked against the REAL simulator state. Progress is stored locally only (no server writes).
import { MODES, MODULES, loadProgress, saveProgress } from '../edu/modules.js';
import { STRUCTURES } from '../edu/structures.js';
import { EDU_REFERENCES } from '../edu/references.js';
import { REFERENCES } from '../sim/references.js';
import { CREDITS, CREDIT_STATUS } from '../edu/credits.js';

const REF = { ...REFERENCES, ...EDU_REFERENCES };
const TYPE = { navigate: 'Navigasi', identify: 'Identifikasi', place: 'Penempatan probe', listen: 'Auskultasi', quiz: 'Penalaran' };

export class Learn {
  /** ctx: {el, root, snapshot(), setup(spec), setAssist(level), status(text, kind)} */
  constructor(ctx) { this.ctx = ctx; this.mode = 'guided'; this.moduleId = MODULES[0].id; this.taskIdx = 0; this.feedback = null; this.view = 'home'; this.progress = loadProgress(); }
  get module() { return MODULES.find((m) => m.id === this.moduleId); }
  get task() { return this.module.tasks[this.taskIdx]; }
  get active() { return this.view === 'task'; }
  done(t) { return !!this.progress[t.id]?.done; }
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
  /** Open a module at a step; the view the step needs is prepared automatically. */
  start(moduleId, idx = 0) {
    this.moduleId = moduleId; this.taskIdx = idx; this.feedback = null; this.view = 'task';
    this.ctx.setAssist(MODES[this.mode].assist); this._prepare(); this.render();
  }
  _prepare() { const t = this.task; if (t?.setup) this.ctx.setup(t.setup, t); }
  next(d = 1) {
    const n = this.module.tasks.length, i = this.taskIdx + d;
    if (i >= n) { this.view = 'summary'; this.feedback = null; this.render(); return; }
    this.taskIdx = Math.max(0, i); this.feedback = null; this._prepare(); this.render();
  }
  /** The next unfinished step along the recommended path. */
  continueTarget() {
    for (const m of MODULES) { const i = m.tasks.findIndex((t) => !this.done(t)); if (i >= 0) return { m, i }; }
    return null;
  }
  home() { this.view = 'home'; this.feedback = null; this.render(); }
  reset() { this.progress = {}; saveProgress(this.progress); this.render(); }

  render() {
    const { root } = this.ctx;
    const body = this.view === 'task' ? this._task() : this.view === 'summary' ? this._summary() : this.mode === 'review' ? this._review() : this._home();
    root.replaceChildren(body, this._footer());
  }
  _home() {
    const { el } = this.ctx, next = this.continueTarget();
    const total = MODULES.reduce((s, m) => s + m.tasks.length, 0), doneN = MODULES.reduce((s, m) => s + m.tasks.filter((t) => this.done(t)).length, 0);
    return el('section', { class: 'learn-home', 'data-testid': 'learn-home' },
      el('h3', {}, 'Belajar terarah'),
      el('p', { class: 'learn-lead' }, 'Ikuti jalur dari atas ke bawah. Setiap langkah menyiapkan tampilannya sendiri.'),
      el('div', { class: 'learn-progress', 'aria-label': `${doneN} dari ${total} langkah selesai` }, el('i', { style: `width:${(100 * doneN / total).toFixed(0)}%` })),
      next ? el('button', { type: 'button', class: 'btn primary big learn-continue', 'data-testid': 'learn-continue', onclick: () => this.start(next.m.id, next.i) },
        doneN ? `Lanjutkan: ${next.m.title.split(' — ')[0]}, langkah ${next.i + 1}` : 'Mulai belajar →') : el('p', { class: 'feedback ok' }, '✓ Semua langkah selesai.'),
      el('ol', { class: 'path' }, ...MODULES.map((m, k) => {
        const d = m.tasks.filter((t) => this.done(t)).length, complete = d === m.tasks.length;
        return el('li', { class: complete ? 'complete' : '' }, el('button', { type: 'button', class: 'module-btn', 'data-testid': 'module-' + m.id, onclick: () => this.start(m.id, Math.max(0, m.tasks.findIndex((t) => !this.done(t)))) },
          el('span', { class: 'path-num', 'aria-hidden': 'true' }, complete ? '✓' : String(k + 1)),
          el('span', { class: 'path-text' }, el('b', {}, m.title.split(' — ')[1] || m.title), el('span', {}, m.goal)),
          el('span', { class: 'prog' }, `${d}/${m.tasks.length}`)));
      })),
      el('details', { class: 'adv' }, el('summary', {}, 'Mode belajar: ' + MODES[this.mode].label),
        el('div', { class: 'seg wrap', role: 'group', 'data-testid': 'learn-modes' }, ...Object.entries(MODES).map(([k, mo]) => el('button', { type: 'button', 'data-testid': 'learn-mode-' + k, 'aria-pressed': String(k === this.mode), onclick: () => this.setMode(k) }, mo.label))),
        el('p', { class: 'hint' }, MODES[this.mode].text)));
  }
  _task() {
    const { el } = this.ctx, t = this.task, m = this.module, p = this.progress[t.id];
    const head = el('div', { class: 'task-nav' },
      el('button', { type: 'button', class: 'linkbtn', 'data-testid': 'learn-back', onclick: () => this.home() }, '← Semua modul'),
      el('span', { class: 'meta' }, `${m.title.split(' — ')[0]} · langkah ${this.taskIdx + 1}/${m.tasks.length}`));
    const dots = el('div', { class: 'dots', 'aria-hidden': 'true' }, ...m.tasks.map((x, i) => el('i', { class: (i === this.taskIdx ? 'cur ' : '') + (this.done(x) ? 'ok' : '') })));
    const intro = this.taskIdx === 0 && !this.feedback ? el('p', { class: 'learn-lead' }, m.goal) : null;
    const showHint = this.mode !== 'practice' && t.hint;
    const action = t.type === 'quiz' ? el('div', { class: 'quiz' }, ...t.options.map((o, i) => el('button', { type: 'button', class: 'chipbtn quiz-opt', 'data-testid': 'quiz-' + i, onclick: () => this.answerQuiz(i) }, o)))
      : t.type === 'identify' ? el('p', { class: 'action' }, '👉 Klik strukturnya langsung pada citra di monitor.')
        : el('button', { type: 'button', class: 'btn primary', 'data-testid': 'task-check', onclick: () => this.check() }, 'Periksa jawaban');
    const fb = this.feedback && el('div', { class: 'feedback ' + (this.feedback.ok ? 'ok' : 'no'), 'data-testid': 'task-feedback', role: 'status' },
      el('b', {}, (this.feedback.ok ? '✓ ' : '✗ ') + this.feedback.msg), el('p', {}, this.feedback.explain));
    const last = this.taskIdx === m.tasks.length - 1;
    return el('section', { class: 'task-card', 'data-testid': 'task-card' }, head, dots, intro,
      el('div', { class: 'task-head' }, el('span', { class: 'task-type' }, TYPE[t.type]), p?.done ? el('span', { class: 'done-chip' }, '✓ selesai') : null),
      el('h4', {}, t.title), el('p', { class: 'task-prompt', 'data-testid': 'task-prompt' }, t.prompt),
      showHint ? el('p', { class: 'hint' }, '💡 ' + t.hint) : null,
      action, fb,
      el('div', { class: 'row task-actions' },
        t.setup ? el('button', { type: 'button', class: 'btn', 'data-testid': 'task-setup', onclick: () => this._prepare() }, '↺ Siapkan ulang tampilan') : null,
        el('button', { type: 'button', class: 'btn' + (this.feedback?.ok ? ' primary' : ''), 'data-testid': 'task-next', onclick: () => this.next(1) }, last ? 'Selesai →' : 'Lanjut →')),
      el('details', { class: 'limits' }, el('summary', {}, 'Pelajari lebih lanjut (sumber)'), el('ol', { class: 'refs' }, ...m.refs.map((r) => el('li', {}, `[${r}] ${REF[r]}`)))));
  }
  _summary() {
    const { el } = this.ctx, m = this.module, idx = MODULES.indexOf(m), nextM = MODULES[idx + 1];
    const rows = m.tasks.map((t) => ({ t, p: this.progress[t.id] }));
    const ok = rows.filter((r) => r.p?.done).length;
    return el('section', { class: 'task-card', 'data-testid': 'learn-summary' },
      el('h4', {}, `Ringkasan ${m.title.split(' — ')[0]}`), el('p', { class: 'learn-lead' }, `${ok} dari ${m.tasks.length} langkah benar.`),
      el('ul', { class: 'review-list' }, ...rows.filter((r) => r.p?.mistakes || !r.p?.done).map(({ t, p }) => el('li', { class: 'no' }, el('b', {}, (p?.done ? '✓ ' : '✗ ') + t.title), el('span', { class: 'meta' }, ` ${p?.mistakes || 0} kesalahan`), el('p', {}, t.explain)))),
      el('div', { class: 'row' },
        el('button', { type: 'button', class: 'btn', onclick: () => this.home() }, '← Semua modul'),
        nextM ? el('button', { type: 'button', class: 'btn primary', 'data-testid': 'learn-next-module', onclick: () => this.start(nextM.id) }, `Lanjut ke ${nextM.title.split(' — ')[0]} →`) : null));
  }
  _review() {
    const { el } = this.ctx, rows = [];
    for (const m of MODULES) for (const t of m.tasks) {
      const p = this.progress[t.id]; if (!p) continue;
      rows.push(el('li', { class: p.done ? 'ok' : 'no' }, el('b', {}, `${p.done ? '✓' : '✗'} ${t.title}`), el('span', { class: 'meta' }, ` ${p.attempts} percobaan, ${p.mistakes} salah`), p.mistakes ? el('p', {}, t.explain) : null));
    }
    return el('section', { class: 'task-card', 'data-testid': 'review' }, el('h4', {}, 'Tinjauan'), rows.length ? el('ul', { class: 'review-list' }, ...rows) : el('p', { class: 'meta' }, 'Belum ada jawaban.'),
      el('div', { class: 'row' }, el('button', { type: 'button', class: 'btn', onclick: () => this.setMode('guided') }, '← Kembali'), el('button', { type: 'button', class: 'btn', onclick: () => this.reset() }, 'Hapus kemajuan lokal')));
  }
  _footer() {
    const { el } = this.ctx;
    return el('div', { class: 'learn-footer' },
      el('details', { class: 'limits credits', 'data-testid': 'credits' }, el('summary', {}, 'Kredit, lisensi & sumber'),
        ...CREDITS.map((c) => el('div', { class: 'credit' }, el('b', {}, c.what, ' ', el('span', { class: 'cstatus ' + c.status }, CREDIT_STATUS[c.status])), el('span', {}, c.source),
          el('span', { class: 'meta' }, c.licence, c.url ? ' · ' : '', c.url ? el('a', { href: c.url, target: '_blank', rel: 'noopener' }, 'teks lisensi') : '', c.notice ? ' · ' : '', c.notice ? el('a', { href: c.notice, target: '_blank', rel: 'noopener' }, 'NOTICE') : ''))),
        el('p', { class: 'meta' }, 'Materi berlisensi Creative Commons tetap tunduk pada lisensinya masing-masing; login MEDCOEL tidak menambah pembatasan atas materi tersebut.')),
      el('p', { class: 'meta' }, 'Kemajuan disimpan hanya di browser ini. Latihan di simulator tidak menggantikan pelatihan klinis terawasi atau penilaian kompetensi.'));
  }
}
