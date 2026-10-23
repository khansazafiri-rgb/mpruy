// ADMIN · SIMULASI DOKTER: kasus (pasien, dialog pembuka, diagnosis, penilaian
// tindakan, jawaban khusus) dan daftar diagnosis. Disimpan di database lewat
// /api/medcoel/admin/sim/*; pemain memuat versi terbaru saat membuka simulasi.
import clsx from 'clsx';
import { ArrowDown, ArrowLeft, ArrowUp, Copy, Eye, EyeOff, FileJson, Pencil, Play, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, EmptyState, Field, PageLoader, Tabs } from '@/components/ui';
import { BYID, CAT, PHASES, asset, parseRows } from '@/features/simulasi/engine';
import { invalidateSimContent } from '@/features/simulasi/content';
import { api } from '@/lib/api';

const RATING = [['', '–'], ['K', 'Penting'], ['U', 'Bermanfaat'], ['B', 'Berisiko']];
const RATING_TONE = { K: 'bg-brand text-white', U: 'bg-academic-soft text-academic', B: 'bg-coral-soft text-coral' };
const PAS_LABEL = { kakek: 'Kakek', bapak: 'Bapak', nenek: 'Nenek', ibuhamil: 'Ibu hamil', ibu: 'Ibu', anakp: 'Anak perempuan', anakl: 'Anak laki-laki' };
const EXPR_LABEL = { master: 'Biasa', nyeri: 'Nyeri', meringis: 'Meringis', cemas: 'Cemas', lemas: 'Lemas', lega: 'Lega', sesak: 'Sesak' };
const SUS_LABEL = { netral: 'Netral', senyum: 'Senyum', serius: 'Serius' };
const ANSWER_FIELDS = {
  pas: [['say', 'Ucapan pasien'], ['note', 'Catatan di rekam medis']],
  exam: [['t', 'Temuan pemeriksaan'], ['note', 'Catatan di rekam medis']],
  card: [['title', 'Judul kartu hasil'], ['sub', 'Diperiksa oleh'], ['rows', 'Baris hasil (satu per baris: nama = nilai)'], ['say', 'Ucapan saat menyerahkan'], ['note', 'Catatan di rekam medis']],
  tata: [['say', 'Ucapan'], ['note', 'Catatan di rekam medis']],
};

const blankCase = () => ({
  key: '', title: '', poli: 'umum', active: false, order: 0,
  data: { pas: 'bapak', expr: 'master', id: '', intro: [{ w: 'sus', e: 'senyum', t: '' }, { w: 'pas', e: 'master', t: '' }], dxOk: '', ddx: [], ref: '', K: '', U: '', B: '', A: {} },
});

const setOf = (s) => new Set(String(s || '').split(/\s+/).filter(Boolean));
const rowsToText = (r) => (Array.isArray(r) ? r.map(([a, b]) => `${a} = ${b}`).join('\n') : parseRows(r).map(([a, b]) => `${a} = ${b}`).join('\n'));
const textToRows = (t) => t.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const i = l.indexOf('='); return i < 0 ? `${l}=` : `${l.slice(0, i).trim()}=${l.slice(i + 1).trim()}`; }).join(';');

export default function SimCases() {
  const [tab, setTab] = useState('cases');
  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Simulasi Dokter</h1>
        <p className="mt-1 text-ink-muted">Kasus pasien yang diundi untuk pemain. Perubahan langsung dipakai saat pemain membuka simulasi berikutnya.</p>
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'cases', label: 'Kasus' }, { value: 'dx', label: 'Daftar diagnosis' }]} />
      {tab === 'cases' ? <CasesTab /> : <DiagnosesTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Daftar kasus
// ---------------------------------------------------------------------------

function CasesTab() {
  const [data, setData] = useState(null);
  const [dx, setDx] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [editing, setEditing] = useState(null); // { value, isNew }
  const load = () => Promise.all([api('admin/sim/cases'), api('admin/sim/diagnoses')])
    .then(([c, d]) => { setData(c); setDx(d.items); })
    .catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const run = async (fn, ok) => {
    setError(''); setMsg('');
    try { await fn(); invalidateSimContent(); setMsg(ok); await load(); } catch (e) { setError(e.message); }
  };
  const open = async (key, asCopy) => {
    setError('');
    try {
      const full = await api(`admin/sim/cases/${key}`);
      if (asCopy) {
        const taken = new Set(data.items.map((c) => c.key));
        let n = 2; while (taken.has(`${key}_${n}`.slice(0, 20))) n++;
        setEditing({ isNew: true, value: { ...full, key: `${key}_${n}`.slice(0, 20), title: '', active: false, order: data.items.length + 1 } });
      } else setEditing({ isNew: false, value: full });
    } catch (e) { setError(e.message); }
  };
  const move = (i, dir) => {
    const list = [...data.items]; const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    run(() => Promise.all(list.map((c, k) => (c.order !== k + 1 ? api(`admin/sim/cases/${c.key}`, { method: 'PATCH', body: { order: k + 1 } }) : null))), 'Urutan disimpan.');
  };

  if (editing) {
    return (
      <CaseEditor
        initial={editing.value}
        isNew={editing.isNew}
        dx={dx}
        meta={data}
        onClose={() => setEditing(null)}
        onSaved={(c) => { invalidateSimContent(); setEditing({ isNew: false, value: c }); setMsg('Kasus tersimpan.'); load(); }}
      />
    );
  }
  if (!data) return error ? <Alert>{error}</Alert> : <PageLoader />;
  const dxName = Object.fromEntries(dx.map((d) => [d.key, d.name]));
  const activeCount = data.items.filter((c) => c.active).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="flex-1 text-sm text-ink-muted">{data.items.length} kasus · {activeCount} aktif diundi. Kasus nonaktif tidak muncul untuk pemain, tetapi tetap bisa kamu coba.</p>
        <button type="button" className="btn-primary" onClick={() => setEditing({ isNew: true, value: { ...blankCase(), order: data.items.length + 1 } })}><Plus size={17} /> Kasus baru</button>
      </div>
      {activeCount === 0 && <Alert kind="warn">Belum ada kasus aktif. Pemain akan memakai kasus bawaan sampai ada kasus yang diaktifkan.</Alert>}
      <Alert kind="success">{msg}</Alert>
      <Alert>{error}</Alert>
      {!data.items.length ? <EmptyState title="Belum ada kasus">Buat kasus pertama dengan tombol Kasus baru.</EmptyState> : (
        <ul className="space-y-3">
          {data.items.map((c, i) => (
            <li key={c.key} className={clsx('card flex flex-wrap items-center gap-4 p-4', !c.active && 'opacity-75')}>
              <img src={asset(`PAS_${c.pas}_master`)} alt="" className="h-16 w-16 shrink-0 rounded-xl bg-page object-contain" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{c.title} {c.active ? <Badge className="bg-brand-soft text-brand-dark">Aktif</Badge> : <Badge className="bg-page text-ink-muted">Nonaktif</Badge>}</p>
                <p className="text-sm text-ink-muted">Kode <code>{c.key}</code> · Diagnosis tepat: {dxName[c.dxOk] || c.dxOk}</p>
                <p className="text-sm text-ink-muted">Dimainkan {c.stats.plays}× oleh {c.stats.players} orang{c.stats.plays ? ` · rata-rata skor ${c.stats.avgScore} · diagnosis tepat ${c.stats.dxOkRate}%` : ''}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button type="button" className="btn-ghost btn-sm" aria-label="Naikkan" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp size={15} /></button>
                <button type="button" className="btn-ghost btn-sm" aria-label="Turunkan" onClick={() => move(i, 1)} disabled={i === data.items.length - 1}><ArrowDown size={15} /></button>
                <button type="button" className="btn-secondary btn-sm" onClick={() => run(() => api(`admin/sim/cases/${c.key}`, { method: 'PATCH', body: { active: !c.active } }), c.active ? 'Kasus dinonaktifkan.' : 'Kasus diaktifkan.')}>{c.active ? <><EyeOff size={15} /> Nonaktifkan</> : <><Eye size={15} /> Aktifkan</>}</button>
                <a className="btn-secondary btn-sm" href={`/simulasi-dokter?kasus=${c.key}`} target="_blank" rel="noopener noreferrer"><Play size={15} /> Coba</a>
                <button type="button" className="btn-secondary btn-sm" onClick={() => open(c.key, false)}><Pencil size={15} /> Ubah</button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => open(c.key, true)}><Copy size={15} /> Duplikat</button>
                {c.key !== 'umum' && <button type="button" className="btn-ghost btn-sm text-coral" onClick={() => { if (window.confirm(`Hapus kasus ${c.title}? Riwayat hasil pemain tetap tersimpan.`)) run(() => api(`admin/sim/cases/${c.key}`, { method: 'DELETE' }), 'Kasus dihapus.'); }}><Trash2 size={15} /> Hapus</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editor kasus
// ---------------------------------------------------------------------------

function CaseEditor({ initial, isNew, dx, meta, onClose, onSaved }) {
  const [c, setC] = useState(() => ({ ...blankCase(), ...initial, data: { ...blankCase().data, ...(initial.data || {}) } }));
  const [rating, setRating] = useState(() => {
    const m = {};
    ['K', 'U', 'B'].forEach((r) => setOf(initial.data?.[r]).forEach((id) => { m[id] = r; }));
    return m;
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const d = c.data;
  const setD = (k, v) => setC((x) => ({ ...x, data: { ...x.data, [k]: v } }));
  const set = (k, v) => setC((x) => ({ ...x, [k]: v }));

  const body = () => {
    const by = (r) => Object.keys(rating).filter((id) => rating[id] === r).join(' ');
    return { key: c.key, title: c.title, poli: c.poli, active: c.active, order: Number(c.order) || 0, data: { ...d, K: by('K'), U: by('U'), B: by('B') } };
  };
  const unknown = useMemo(() => [...Object.keys(rating), ...Object.keys(d.A || {})].filter((id) => !BYID[id]), [rating, d.A]);

  const save = async () => {
    setBusy(true); setError(''); setErrors({});
    try {
      const saved = isNew
        ? await api('admin/sim/cases', { method: 'POST', body: body() })
        : await api(`admin/sim/cases/${initial.key}`, { method: 'PATCH', body: body() });
      onSaved(saved);
    } catch (e) { setError(e.message); setErrors(e.fields || {}); window.scrollTo({ top: 0, behavior: 'smooth' }); } finally { setBusy(false); }
  };

  const dxSorted = [...dx].sort((a, b) => a.name.localeCompare(b.name, 'id'));
  const errorList = Object.entries(errors);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-ghost btn-sm" onClick={onClose}><ArrowLeft size={16} /> Semua kasus</button>
        <h2 className="flex-1 font-display text-xl font-semibold">{isNew ? 'Kasus baru' : `Ubah: ${initial.title}`}</h2>
        {!isNew && <a className="btn-secondary btn-sm" href={`/simulasi-dokter?kasus=${initial.key}`} target="_blank" rel="noopener noreferrer"><Play size={15} /> Coba kasus</a>}
        <button type="button" className="btn-secondary btn-sm" onClick={() => setShowJson((v) => !v)}><FileJson size={15} /> JSON</button>
        <button type="button" className="btn-primary btn-sm" onClick={save} disabled={busy}><Save size={15} /> {busy ? 'Menyimpan...' : 'Simpan'}</button>
      </div>
      <Alert>{error}</Alert>
      {errorList.length > 0 && <Alert>{errorList.map(([k, v]) => <span key={k} className="block">{v}</span>)}</Alert>}
      {unknown.length > 0 && <Alert kind="warn">Id tindakan ini tidak ada di katalog dan akan diabaikan pemain: {unknown.join(', ')}</Alert>}
      {showJson && <JsonPanel value={body()} onApply={(v) => {
        setC((x) => ({ ...x, ...v, key: isNew ? (v.key ?? x.key) : x.key, data: { ...blankCase().data, ...(v.data || {}) } }));
        const m = {}; ['K', 'U', 'B'].forEach((r) => setOf(v.data?.[r]).forEach((id) => { m[id] = r; })); setRating(m);
      }} />}

      <section className="card space-y-4 p-5">
        <h3 className="section-title">Pasien</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Kode kasus" htmlFor="sc-key" error={errors.key} hint={isNew ? 'Huruf kecil, angka, garis bawah. Tidak bisa diganti setelah disimpan.' : 'Tidak bisa diganti.'}>
            <input id="sc-key" className="input" value={c.key} disabled={!isNew} maxLength={20} onChange={(e) => set('key', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="mis. bedah_hernia" />
          </Field>
          <Field label="Poli" htmlFor="sc-poli" error={errors.poli} hint="Menentukan latar, jas dokter, dan tindakan khusus poli.">
            <select id="sc-poli" className="input" value={c.poli} onChange={(e) => set('poli', e.target.value)}>
              {Object.entries(meta.poli).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Nama dan usia pasien" htmlFor="sc-id" error={errors.id}>
            <input id="sc-id" className="input" value={d.id} maxLength={80} onChange={(e) => setD('id', e.target.value)} placeholder="Pak Slamet, 68 tahun" />
          </Field>
          <Field label="Judul di riwayat" htmlFor="sc-title" hint="Kosongkan untuk memakai nama pasien + poli.">
            <input id="sc-title" className="input" value={c.title} maxLength={120} onChange={(e) => set('title', e.target.value)} placeholder={`${d.id || 'Nama pasien'} · ${meta.poli[c.poli]}`} />
          </Field>
          <Field label="Ekspresi awal pasien" htmlFor="sc-expr">
            <select id="sc-expr" className="input" value={d.expr} onChange={(e) => setD('expr', e.target.value)}>{meta.expressions.map((x) => <option key={x} value={x}>{EXPR_LABEL[x] || x}</option>)}</select>
          </Field>
          <div className="flex items-end gap-4 pb-3 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={c.active} onChange={(e) => set('active', e.target.checked)} /> Aktif (ikut diundi)</label>
            <label className="flex items-center gap-2">Urutan <input type="number" className="input w-20 py-1" value={c.order} onChange={(e) => set('order', e.target.value)} /></label>
          </div>
        </div>
        <fieldset>
          <legend className="label">Gambar pasien {errors.pas && <span className="text-coral">· {errors.pas}</span>}</legend>
          <div className="flex flex-wrap gap-2">
            {meta.patients.map((p) => (
              <button key={p} type="button" onClick={() => setD('pas', p)} aria-pressed={d.pas === p} className={clsx('flex w-24 flex-col items-center gap-1 rounded-xl border-2 p-1.5 text-xs font-semibold', d.pas === p ? 'border-brand bg-brand-soft' : 'border-line')}>
                <img src={asset(`PAS_${p}_${d.expr || 'master'}`)} alt="" className="h-16 w-16 object-contain" />{PAS_LABEL[p] || p}
              </button>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="card space-y-3 p-5">
        <h3 className="section-title">Dialog pembuka</h3>
        <p className="text-sm text-ink-muted">Kalimat yang muncul saat pasien masuk, sebelum pemain bertanya. {errors.intro && <span className="text-coral">{errors.intro}</span>}</p>
        {d.intro.map((l, i) => (
          <div key={i} className="flex flex-wrap items-start gap-2">
            <select className="input w-32" value={l.w} aria-label="Pembicara" onChange={(e) => setD('intro', d.intro.map((x, k) => (k === i ? { ...x, w: e.target.value, e: e.target.value === 'sus' ? 'senyum' : d.expr } : x)))}>
              <option value="sus">Suster</option><option value="pas">Pasien</option>
            </select>
            <select className="input w-32" value={l.e} aria-label="Ekspresi" onChange={(e) => setD('intro', d.intro.map((x, k) => (k === i ? { ...x, e: e.target.value } : x)))}>
              {(l.w === 'sus' ? meta.nurseExpressions : meta.expressions).map((x) => <option key={x} value={x}>{(l.w === 'sus' ? SUS_LABEL : EXPR_LABEL)[x] || x}</option>)}
            </select>
            <textarea className="input min-h-[44px] flex-1" rows={2} value={l.t} maxLength={600} aria-label="Kalimat" onChange={(e) => setD('intro', d.intro.map((x, k) => (k === i ? { ...x, t: e.target.value } : x)))} />
            <button type="button" className="btn-ghost btn-sm" aria-label="Hapus kalimat" onClick={() => setD('intro', d.intro.filter((_, k) => k !== i))}><X size={15} /></button>
          </div>
        ))}
        {d.intro.length < 10 && <button type="button" className="btn-secondary btn-sm" onClick={() => setD('intro', [...d.intro, { w: 'pas', e: d.expr, t: '' }])}><Plus size={15} /> Tambah kalimat</button>}
      </section>

      <section className="card space-y-3 p-5">
        <h3 className="section-title">Diagnosis</h3>
        <Field label="Diagnosis yang tepat" htmlFor="sc-dx" error={errors.dxOk}>
          <select id="sc-dx" className="input" value={d.dxOk} onChange={(e) => setD('dxOk', e.target.value)}>
            <option value="">Pilih diagnosis</option>
            {dxSorted.map((x) => <option key={x.key} value={x.key}>{x.name}</option>)}
          </select>
        </Field>
        <fieldset>
          <legend className="label">Diagnosis banding yang masuk akal {errors.ddx && <span className="text-coral">· {errors.ddx}</span>}</legend>
          <p className="mb-2 text-sm text-ink-muted">Dipakai menilai alasan pemain ("Kenapa kamu menanyakan ini?") dan refleksi diagnosis banding. Pilih 3-6.</p>
          <div className="flex flex-wrap gap-1.5">
            {dxSorted.map((x) => {
              const on = d.ddx.includes(x.key) || d.dxOk === x.key;
              return <button key={x.key} type="button" disabled={d.dxOk === x.key} onClick={() => setD('ddx', on ? d.ddx.filter((k) => k !== x.key) : [...d.ddx, x.key])} aria-pressed={on} className={clsx('chip border', on ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line bg-surface text-ink-muted')}>{x.name}</button>;
            })}
          </div>
        </fieldset>
        <Field label="Acuan klinis" htmlFor="sc-ref" hint="Ditampilkan di laporan akhir. Tulis sumber (PNPK, SKDI, dsb.) dan status verifikasinya.">
          <textarea id="sc-ref" className="input min-h-[80px]" value={d.ref} maxLength={3000} onChange={(e) => setD('ref', e.target.value)} />
        </Field>
      </section>

      <RatingEditor rating={rating} setRating={setRating} poli={c.poli} error={errors.K} />
      <AnswersEditor answers={d.A || {}} setAnswers={(A) => setD('A', A)} />

      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onClose}>Batal</button>
        <button type="button" className="btn-primary" onClick={save} disabled={busy}><Save size={16} /> {busy ? 'Menyimpan...' : 'Simpan kasus'}</button>
      </div>
    </div>
  );
}

function JsonPanel({ value, onApply }) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [err, setErr] = useState('');
  return (
    <section className="card space-y-2 p-5">
      <h3 className="section-title">JSON kasus</h3>
      <p className="text-sm text-ink-muted">Untuk menyalin kasus ke tempat lain atau menempel kasus yang ditulis di luar dashboard. Tekan Terapkan, lalu Simpan.</p>
      <textarea className="input min-h-[260px] font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
      <Alert>{err}</Alert>
      <div className="flex gap-2">
        <button type="button" className="btn-secondary btn-sm" onClick={() => { try { onApply(JSON.parse(text)); setErr(''); } catch (e) { setErr(`JSON belum benar: ${e.message}`); } }}>Terapkan ke formulir</button>
        <button type="button" className="btn-ghost btn-sm" onClick={() => navigator.clipboard?.writeText(text)}><Copy size={15} /> Salin</button>
      </div>
    </section>
  );
}

function RatingEditor({ rating, setRating, poli, error }) {
  const [tab, setTab] = useState('anam');
  const [q, setQ] = useState('');
  const [onlyRated, setOnlyRated] = useState(false);
  const counts = { K: 0, U: 0, B: 0 };
  Object.values(rating).forEach((r) => { counts[r] += 1; });
  const items = CAT.filter((it) => (q ? `${it.label} ${it.sub} ${it.id}`.toLowerCase().includes(q.toLowerCase()) : it.tab === tab))
    .filter((it) => !onlyRated || rating[it.id])
    .filter((it) => !it.fl.only || it.fl.only.includes(poli));
  return (
    <section className="card space-y-3 p-5">
      <h3 className="section-title">Penilaian tindakan</h3>
      <p className="text-sm text-ink-muted">
        Tandai tindakan yang <b>penting</b> (harus dilakukan, masuk skor), <b>bermanfaat</b>, atau <b>berisiko</b> untuk pasien ini. Tindakan lain dinilai "kurang perlu", dan pemeriksaan mahal tanpa indikasi dinilai "tidak tepat".
        {' '}<span className="font-semibold text-ink">Penting {counts.K} · Bermanfaat {counts.U} · Berisiko {counts.B}</span>
      </p>
      {error && <Alert>{error}</Alert>}
      <div className="flex flex-wrap items-center gap-2">
        {!q && <Tabs value={tab} onChange={setTab} tabs={PHASES.map((p) => ({ value: p.key, label: p.short }))} />}
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input className="input py-1.5 pl-9" placeholder="Cari di semua tahap" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari tindakan" />
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyRated} onChange={(e) => setOnlyRated(e.target.checked)} /> Hanya yang sudah dinilai</label>
      </div>
      <ul className="max-h-[32rem] divide-y divide-line overflow-y-auto rounded-xl border border-line">
        {items.map((it) => (
          <li key={it.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
            <span className="min-w-0 flex-1"><span className="font-semibold">{it.label}</span> <span className="text-ink-muted">· {it.sub}{q ? ` · ${PHASES.find((p) => p.key === it.tab)?.short}` : ''}{it.fl.inv ? ' · mahal/invasif' : ''}</span></span>
            <span className="flex gap-1" role="group" aria-label={`Nilai ${it.label}`}>
              {RATING.map(([r, l]) => (
                <button key={r || 'none'} type="button" aria-pressed={(rating[it.id] || '') === r} onClick={() => setRating((m) => { const n = { ...m }; if (r) n[it.id] = r; else delete n[it.id]; return n; })}
                  className={clsx('rounded-lg px-2 py-1 text-xs font-semibold', (rating[it.id] || '') === r ? (RATING_TONE[r] || 'bg-ink text-white') : 'bg-page text-ink-muted')}>{l}</button>
              ))}
            </span>
          </li>
        ))}
        {!items.length && <li className="px-3 py-4 text-sm text-ink-muted">Tidak ada tindakan yang cocok.</li>}
      </ul>
    </section>
  );
}

function AnswersEditor({ answers, setAnswers }) {
  const [pick, setPick] = useState('');
  const ids = Object.keys(answers);
  const options = CAT.filter((it) => !answers[it.id]);
  const setField = (id, f, v) => setAnswers({ ...answers, [id]: { ...answers[id], [f]: v } });
  return (
    <section className="card space-y-3 p-5">
      <h3 className="section-title">Jawaban khusus pasien ini</h3>
      <p className="text-sm text-ink-muted">Tindakan tanpa jawaban khusus memakai jawaban bawaan katalog (biasanya hasil normal atau "Tidak, Dok."). Isi di sini untuk keluhan, temuan, dan hasil penunjang yang khas pada kasus ini. Kolom yang dikosongkan memakai bawaan.</p>
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (BYID[pick] && !answers[pick]) { setAnswers({ ...answers, [pick]: {} }); setPick(''); } }}>
        <input className="input flex-1" list="sim-actions" placeholder="Ketik nama tindakan, lalu pilih" value={pick} onChange={(e) => {
          const v = e.target.value; const hit = CAT.find((it) => `${it.label} (${it.id})` === v); setPick(hit ? hit.id : v);
        }} aria-label="Tambah jawaban untuk tindakan" />
        <datalist id="sim-actions">{options.map((it) => <option key={it.id} value={`${it.label} (${it.id})`} />)}</datalist>
        <button type="submit" className="btn-secondary btn-sm" disabled={!BYID[pick] || !!answers[pick]}><Plus size={15} /> Tambah jawaban</button>
      </form>
      <div className="space-y-3">
        {ids.map((id) => {
          const it = BYID[id];
          const a = answers[id] || {};
          const fields = ANSWER_FIELDS[it?.kind] || [['say', 'Ucapan'], ['note', 'Catatan'], ['t', 'Temuan']];
          return (
            <details key={id} className="group rounded-xl border border-line p-3" open={!Object.keys(a).length}>
              <summary className="flex cursor-pointer list-none items-center gap-2">
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">{it ? it.label : id}</span> <span className="text-ink-muted">· {it ? `${PHASES.find((p) => p.key === it.tab)?.short} / ${it.sub}` : 'tidak ada di katalog'}</span>
                  <span className="block truncate text-sm text-ink-muted group-open:hidden">{a.say || a.t || a.note || a.title || 'Belum diisi'}</span>
                </span>
                <button type="button" className="btn-ghost btn-sm" aria-label={`Hapus jawaban ${id}`} onClick={(e) => { e.preventDefault(); const n = { ...answers }; delete n[id]; setAnswers(n); }}><Trash2 size={15} /></button>
              </summary>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {fields.map(([f, label]) => (
                  <label key={f} className={clsx('text-sm', (f === 'rows' || f === 'say' || f === 't') && 'md:col-span-2')}>
                    <span className="label">{label}</span>
                    {f === 'rows'
                      ? <textarea className="input min-h-[72px] font-mono text-xs" value={a.rows !== undefined ? rowsToText(a.rows) : ''} placeholder={it?.def?.rows ? rowsToText(it.def.rows) : ''} onChange={(e) => setField(id, 'rows', textToRows(e.target.value))} />
                      : <textarea className="input min-h-[40px]" rows={f === 'note' || f === 'title' || f === 'sub' ? 1 : 2} value={a[f] || ''} placeholder={it?.def?.[f] ? String(it.def[f]) : ''} onChange={(e) => setField(id, f, e.target.value)} />}
                  </label>
                ))}
                {it?.kind === 'pas' && (
                  <label className="text-sm"><span className="label">Ekspresi saat menjawab</span>
                    <select className="input" value={a.e || ''} onChange={(e) => setField(id, 'e', e.target.value)}><option value="">Sama seperti sebelumnya</option>{Object.entries(EXPR_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                  </label>
                )}
              </div>
            </details>
          );
        })}
        {!ids.length && <p className="text-sm text-ink-muted">Belum ada jawaban khusus.</p>}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Daftar diagnosis
// ---------------------------------------------------------------------------

function DiagnosesTab() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [q, setQ] = useState('');
  const [nw, setNw] = useState({ key: '', name: '', tags: '' });
  const [edit, setEdit] = useState(null);
  const load = () => api('admin/sim/diagnoses').then((d) => setItems(d.items)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  const run = async (fn, ok) => { setError(''); setMsg(''); try { await fn(); invalidateSimContent(); setMsg(ok); setEdit(null); await load(); return true; } catch (e) { setError(e.message); return false; } };
  if (!items) return error ? <Alert>{error}</Alert> : <PageLoader />;
  const shown = items.filter((d) => `${d.name} ${d.key} ${d.tags}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">Diagnosis yang bisa dipilih pemain sebagai diagnosis kerja. <b>Kelompok</b> (mis. resp, kardio, infeksi) dipakai mencocokkan alasan pemain dengan tindakan di katalog: tindakan bertag resp cocok dengan diagnosis berkelompok resp.</p>
      <Alert kind="success">{msg}</Alert>
      <Alert>{error}</Alert>
      <form className="card grid gap-2 p-4 md:grid-cols-[1fr_2fr_1.5fr_auto]" onSubmit={(e) => { e.preventDefault(); run(() => api('admin/sim/diagnoses', { method: 'POST', body: nw }), 'Diagnosis ditambahkan.').then((ok) => { if (ok) setNw({ key: '', name: '', tags: '' }); }); }}>
        <input className="input" placeholder="kode, mis. hernia" value={nw.key} onChange={(e) => setNw((x) => ({ ...x, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))} aria-label="Kode diagnosis baru" />
        <input className="input" placeholder="Nama, mis. Hernia inguinalis" value={nw.name} onChange={(e) => setNw((x) => ({ ...x, name: e.target.value }))} aria-label="Nama diagnosis baru" />
        <input className="input" placeholder="Kelompok, mis. abd,gi" value={nw.tags} onChange={(e) => setNw((x) => ({ ...x, tags: e.target.value }))} aria-label="Kelompok diagnosis baru" />
        <button type="submit" className="btn-primary btn-sm" disabled={!nw.key || !nw.name}><Plus size={15} /> Tambah</button>
      </form>
      <input className="input max-w-sm" placeholder="Cari diagnosis" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari diagnosis" />
      <ul className="card divide-y divide-line">
        {shown.map((d) => (
          <li key={d.key} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
            {edit?.key === d.key ? (
              <>
                <input className="input flex-1 py-1" value={edit.name} onChange={(e) => setEdit((x) => ({ ...x, name: e.target.value }))} aria-label="Nama diagnosis" />
                <input className="input w-48 py-1" value={edit.tags} onChange={(e) => setEdit((x) => ({ ...x, tags: e.target.value }))} aria-label="Kelompok" />
                <button type="button" className="btn-primary btn-sm" onClick={() => run(() => api(`admin/sim/diagnoses/${d.key}`, { method: 'PATCH', body: edit }), 'Diagnosis disimpan.')}>Simpan</button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => setEdit(null)}>Batal</button>
              </>
            ) : (
              <>
                <span className="min-w-0 flex-1"><span className="font-semibold">{d.name}</span> <span className="text-ink-muted">· {d.key} · {d.tags}</span></span>
                <span className="text-xs text-ink-muted">{d.usedBy ? `dipakai ${d.usedBy} kasus` : 'belum dipakai'}</span>
                <button type="button" className="btn-ghost btn-sm" onClick={() => setEdit(d)}><Pencil size={14} /> Ubah</button>
                <button type="button" className="btn-ghost btn-sm text-coral" disabled={d.usedBy > 0} title={d.usedBy ? 'Masih dipakai kasus' : ''} onClick={() => { if (window.confirm(`Hapus diagnosis ${d.name}?`)) run(() => api(`admin/sim/diagnoses/${d.key}`, { method: 'DELETE' }), 'Diagnosis dihapus.'); }}><Trash2 size={14} /></button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
