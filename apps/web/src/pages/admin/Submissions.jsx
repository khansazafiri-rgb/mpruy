import { ExternalLink, FileText, MessageCircle, Plus, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ImportPanel from '@/components/admin/ImportPanel';
import { useCatalog } from '@/components/admin/useCatalog';
import { Alert, Badge, EmptyState, Field, Modal, PageLoader, Tabs } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { LANG, SUB_STATUS, SUB_STATUS_CLASS } from '@/lib/labels';
import pb from '@/lib/pb';
import { fmtDateTime } from '@/lib/time';
import { waLink } from '@/lib/wa';

const ACTIONS = {
  menunggu_konfirmasi: [['antre', 'Tandai terkonfirmasi'], ['perlu_perbaikan', 'Perlu perbaikan'], ['dibatalkan', 'Batalkan']],
  antre: [['diproses', 'Mulai proses'], ['perlu_perbaikan', 'Perlu perbaikan'], ['selesai', 'Tandai selesai (manual)'], ['dibatalkan', 'Batalkan']],
  diproses: [['selesai', 'Tandai selesai (manual)'], ['perlu_perbaikan', 'Perlu perbaikan'], ['antre', 'Kembalikan ke antrean']],
  perlu_perbaikan: [['antre', 'Masukkan antrean lagi'], ['dibatalkan', 'Batalkan']],
  kedaluwarsa: [['antre', 'Konfirmasi (terlambat)']],
  selesai: [['diproses', 'Buka lagi']],
};

function ManualForm({ onClose, onSaved }) {
  const { subjects } = useCatalog();
  const [f, setF] = useState({ user: '', subject: '', pdfCount: 1, hasKey: false, language: 'id', scope: 'all', note: '', confirmNow: true });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const save = async () => {
    setBusy(true); setError('');
    try { await api('admin/submissions', { method: 'POST', body: { ...f, pdfCount: Number(f.pdfCount) } }); onSaved(); } catch (e) { setError(e.message); setBusy(false); }
  };
  return (
    <Modal open title="Pengajuan manual (kiriman WhatsApp)" onClose={onClose} footer={<>
      <button type="button" className="btn-ghost" onClick={onClose}>Batal</button>
      <button type="button" className="btn-primary" onClick={save} disabled={busy}>Simpan</button>
    </>}>
      <div className="space-y-3">
        <p className="text-sm text-ink-muted">Dipakai untuk mencatat pengajuan yang filenya diterima di luar web (mis. kiriman lewat WhatsApp), supaya tetap muncul di Progres permintaan pengguna.</p>
        <Field label="Login ID pengaju" htmlFor="mf-user"><input id="mf-user" className="input" value={f.user} onChange={(e) => set('user', e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mata kuliah" htmlFor="mf-subj"><select id="mf-subj" className="input" value={f.subject} onChange={(e) => set('subject', e.target.value)}><option value="">Pilih</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <Field label="Jumlah PDF" htmlFor="mf-n"><input id="mf-n" type="number" min={1} className="input" value={f.pdfCount} onChange={(e) => set('pdfCount', e.target.value)} /></Field>
          <Field label="Bahasa" htmlFor="mf-lang"><select id="mf-lang" className="input" value={f.language} onChange={(e) => set('language', e.target.value)}>{Object.entries(LANG).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Dilihat oleh" htmlFor="mf-scope"><select id="mf-scope" className="input" value={f.scope} onChange={(e) => set('scope', e.target.value)}><option value="all">General (semua pengguna)</option><option value="campus">Hanya kampus pengaju</option></select></Field>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.hasKey} onChange={(e) => set('hasKey', e.target.checked)} /> PDF sudah memuat kunci dan pembahasan</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.confirmNow} onChange={(e) => set('confirmNow', e.target.checked)} /> Langsung masukkan antrean (sudah dikonfirmasi lewat WhatsApp)</label>
        <Field label="Catatan" htmlFor="mf-note"><textarea id="mf-note" className="input" value={f.note} onChange={(e) => set('note', e.target.value)} /></Field>
        <Alert>{error}</Alert>
      </div>
    </Modal>
  );
}

export default function Submissions() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const [q, setQ] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [manual, setManual] = useState(false);
  const [importFor, setImportFor] = useState(null);
  const [noteFor, setNoteFor] = useState(null); // { s, status }
  const [note, setNote] = useState('');

  const load = () => api('admin/submissions', { query: { status, q } }).then(setData).catch((e) => setError(e.message));
  useEffect(() => {
    setData(null); load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const change = async (s, st, n) => {
    setError('');
    try { await api(`admin/submissions/${s.id}/status`, { method: 'POST', body: { status: st, note: n } }); setNoteFor(null); setNote(''); load(); } catch (e) { setError(e.message); }
  };
  const toggleOpen = async () => {
    try {
      const rec = (await pb.collection('app_settings').getList(1, 1)).items[0];
      await pb.collection('app_settings').update(rec.id, { submissionsOpen: !data.submissionsOpen });
      load();
    } catch (e) { setError(errorText(e)); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Pengajuan soal</h1>
          {data && <p className="mt-1 text-sm text-ink-muted">Antrean: {data.queue.totalQueuedPdf} PDF · kapasitas {data.queue.dailyCapacity}/hari · estimasi {data.queue.estimateDays} hari{data.queue.overFiveDays ? ' (lebih dari 5 hari: naikkan kapasitas atau tutup sementara)' : ''}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {data && <button type="button" className={data.submissionsOpen ? 'btn-secondary' : 'btn-danger'} onClick={toggleOpen}>{data.submissionsOpen ? 'Tutup sementara pengajuan baru' : 'Pengajuan ditutup, buka lagi'}</button>}
          <button type="button" className="btn-primary" onClick={() => setManual(true)}><Plus size={18} /> Pengajuan manual</button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={status} onChange={(v) => setParams(v ? { status: v } : {})} tabs={[{ value: '', label: 'Semua' }, ...['menunggu_konfirmasi', 'antre', 'diproses', 'perlu_perbaikan', 'selesai', 'dibatalkan', 'kedaluwarsa'].map((s) => ({ value: s, label: SUB_STATUS[s] }))]} />
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex gap-2"><input className="input py-1.5" placeholder="Cari kode / nama" value={q} onChange={(e) => setQ(e.target.value)} /><button className="btn-secondary btn-sm" type="submit">Cari</button></form>
      </div>
      <Alert>{error}</Alert>
      {!data ? <PageLoader /> : !data.items.length ? <EmptyState title="Tidak ada pengajuan di filter ini" /> : (
        <div className="space-y-3">
          {data.items.map((s) => (
            <div key={s.id} className="card p-4">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-ink-muted">{s.code} · {fmtDateTime(s.submittedAt || s.created)}{s.viaWhatsapp ? ' · via WhatsApp' : ''}</p>
                  <p className="font-semibold">{s.subjectName} · {s.pdfCount} PDF</p>
                  <p className="text-sm text-ink-muted">{s.user?.name} ({s.user?.loginId}) · {s.campusName || 'kampus belum terdaftar'} · {LANG[s.language]} · {s.hasKey ? 'ada kunci' : 'tanpa kunci'} · {s.scope === 'campus' ? 'hanya kampus pengaju' : 'General'}</p>
                  {s.statusNote && <p className="mt-1 rounded-lg bg-page px-2 py-1 text-sm">{s.statusNote}</p>}
                  {s.queue && s.status === 'antre' && <p className="text-xs text-ink-muted">{s.queue.pdfAhead} PDF di depan · estimasi {s.queue.estimateDays} hari</p>}
                </div>
                <Badge className={SUB_STATUS_CLASS[s.status]}>{SUB_STATUS[s.status]}</Badge>
              </div>
              {s.files.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {s.files.map((f) => (
                    <li key={f.id}><a href={f.link} target="_blank" rel="noopener noreferrer" className="chip bg-page py-1 text-ink hover:text-brand"><FileText size={13} /> {f.name} <ExternalLink size={11} /></a></li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {(ACTIONS[s.status] || []).map(([st, label]) => (
                  <button key={st} type="button" className={st === 'antre' || st === 'diproses' ? 'btn-primary btn-sm' : st === 'dibatalkan' ? 'btn-ghost btn-sm text-coral' : 'btn-secondary btn-sm'}
                    onClick={() => (st === 'perlu_perbaikan' || st === 'dibatalkan' ? (setNoteFor({ s, status: st }), setNote('')) : change(s, st))}>
                    {label}
                  </button>
                ))}
                {['antre', 'diproses', 'perlu_perbaikan'].includes(s.status) && <button type="button" className="btn-secondary btn-sm" onClick={() => setImportFor(s)}><Upload size={15} /> Impor JSON</button>}
                {s.user?.whatsapp && <a href={waLink(s.user.whatsapp, `Halo ${s.user.name}, terkait pengajuan soal ${s.code} di MEDCOEL: `)} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm"><MessageCircle size={15} /> WA pengaju</a>}
              </div>
            </div>
          ))}
        </div>
      )}
      {manual && <ManualForm onClose={() => setManual(false)} onSaved={() => { setManual(false); load(); }} />}
      {importFor && (
        <Modal open size="xl" title={`Impor soal untuk ${importFor.code}`} onClose={() => setImportFor(null)}>
          <ImportPanel submission={importFor} onDone={() => load()} />
        </Modal>
      )}
      {noteFor && (
        <Modal open size="sm" title={noteFor.status === 'perlu_perbaikan' ? 'Alasan perbaikan' : 'Batalkan pengajuan'} onClose={() => setNoteFor(null)} footer={<>
          <button type="button" className="btn-ghost" onClick={() => setNoteFor(null)}>Batal</button>
          <button type="button" className="btn-primary" onClick={() => change(noteFor.s, noteFor.status, note)} disabled={noteFor.status === 'perlu_perbaikan' && !note.trim()}>Simpan</button>
        </>}>
          <Field label="Pesan untuk pengguna" htmlFor="nf" hint="Misalnya: PDF tidak terbaca, bukan soal, atau duplikat dengan pengajuan lain.">
            <textarea id="nf" className="input min-h-[100px]" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </Modal>
      )}
    </div>
  );
}
