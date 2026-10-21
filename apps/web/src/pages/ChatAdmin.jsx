// CHAT ADMIN: asisten percakapan otomatis. Admin tidak menyentuh percakapan;
// hasil akhirnya pengajuan yang tercatat di dashboard.
import clsx from 'clsx';
import { Bot, FileText, FileUp, ListChecks, MessageCircle, RotateCcw, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import SubmissionCard from '@/components/SubmissionCard';
import SupportConversation from '@/components/SupportConversation';
import { Alert, EmptyState, PageLoader } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { looksLikePdf, uploadFile } from '@/lib/upload';
import { confirmMessage, manyPdfMessage, waLink } from '@/lib/wa';

function Bubble({ from = 'bot', children }) {
  return (
    <div className={clsx('flex gap-2', from === 'me' && 'justify-end')}>
      {from === 'bot' && <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-white"><Bot size={17} /></span>}
      <div className={clsx('max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px]', from === 'bot' ? 'rounded-tl-sm bg-surface shadow-card' : 'rounded-tr-sm bg-brand text-white')}>{children}</div>
    </div>
  );
}

function Choices({ options, onPick }) {
  return (
    <div className="flex flex-wrap gap-2 pl-10">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onPick(o)} className="rounded-full border-2 border-brand bg-surface px-4 py-2 text-sm font-semibold text-brand hover:bg-brand hover:text-white">
          {o.label}
        </button>
      ))}
    </div>
  );
}

const LANG = [{ value: 'id', label: 'Indonesia' }, { value: 'en', label: 'Inggris' }, { value: 'both', label: 'Keduanya' }];

function UploadFlow({ onExit, onMenu }) {
  const { me, settings } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [a, setA] = useState({}); // jawaban
  const [step, setStep] = useState('subject');
  const [draft, setDraft] = useState(null);
  const [uploads, setUploads] = useState([]); // { name, progress, error }
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null);
  const end = useRef(null);

  useEffect(() => { api('subjects').then((d) => setSubjects(d.items)).catch((e) => setError(e.message)); }, []);
  useEffect(() => { end.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'nearest' }); }, [step, uploads.length, draft, sent]);

  const answer = (key, o, next) => { setA((x) => ({ ...x, [key]: o.value, [`${key}Label`]: o.label })); setStep(next); setError(''); };

  const pickCount = async (o) => {
    answer('count', o, o.value === 'many' ? 'many' : 'files');
    if (o.value === 'many') return;
    setBusy(true);
    try {
      const d = await api('submissions', {
        method: 'POST',
        body: { subject: a.subject, hasKey: a.hasKey === 'yes', language: a.language, scope: a.scope, pdfCount: Number(o.value) },
      });
      setDraft(d);
    } catch (e) { setError(e.message); setStep('count'); } finally { setBusy(false); }
  };

  const maxMb = settings?.maxPdfMb || 20;
  const addFiles = async (files) => {
    setError('');
    const list = [...files];
    const room = 5 - (draft?.files?.length || 0) - uploads.filter((u) => !u.error && u.progress < 1).length;
    if (list.length > room) { setError(`Satu pengajuan paling banyak 5 PDF. Sisa tempat: ${Math.max(0, room)}.`); list.splice(Math.max(0, room)); }
    for (const f of list) {
      const key = `${f.name}-${f.size}-${Date.now()}`;
      if (f.size > maxMb * 1048576) { setUploads((u) => [...u, { key, name: f.name, progress: 0, error: `Lebih dari ${maxMb} MB. Kecilkan atau pisah PDF-nya.` }]); continue; }
      if (!(await looksLikePdf(f))) { setUploads((u) => [...u, { key, name: f.name, progress: 0, error: 'Isi file ini bukan PDF. Ekspor ulang sebagai PDF.' }]); continue; }
      setUploads((u) => [...u, { key, name: f.name, progress: 0 }]);
      try {
        await uploadFile(new File([f], f.name, { type: 'application/pdf' }), { kind: 'submission_pdf', submission: draft.id }, (p) => setUploads((u) => u.map((x) => (x.key === key ? { ...x, progress: p } : x))));
        setUploads((u) => u.filter((x) => x.key !== key));
        setDraft(await api(`submissions/${draft.id}`));
      } catch (e) {
        setUploads((u) => u.map((x) => (x.key === key ? { ...x, error: e.message } : x)));
      }
    }
  };
  const removeFile = async (f) => {
    try { setDraft(await api(`submissions/${draft.id}/files/${f.id}/remove`, { method: 'POST', body: {} })); } catch (e) { setError(e.message); }
  };
  const send = async () => {
    setBusy(true); setError('');
    try { setSent(await api(`submissions/${draft.id}/send`, { method: 'POST', body: { agreement: agree } })); setStep('sent'); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const restart = () => { setA({}); setStep('subject'); setDraft(null); setUploads([]); setAgree(false); setSent(null); setError(''); };
  const campusName = me?.campusName || 'kampusmu';
  const waNumber = settings?.adminWhatsapp;
  const steps = ['subject', 'hasKey', 'language', 'scope', 'count', 'files', 'summary', 'sent', 'many'];
  const at = (s) => steps.indexOf(step) >= steps.indexOf(s);

  if (settings && !settings.submissionsOpen) {
    return <Alert kind="warn">Pengajuan soal sedang ditutup sementara karena antrean penuh. Coba lagi beberapa hari lagi, atau hubungi admin lewat WhatsApp.</Alert>;
  }

  return (
    <div className="space-y-3">
      <Bubble>Halo! Aku bantu ubah PDF soalmu menjadi soal di web. <b>Soal ini untuk mata kuliah apa?</b></Bubble>
      {step === 'subject' && <Choices options={subjects.map((s) => ({ value: s.id, label: s.name }))} onPick={(o) => answer('subject', o, 'hasKey')} />}
      {at('hasKey') && <Bubble from="me">{a.subjectLabel}</Bubble>}

      {at('hasKey') && <Bubble><b>Apakah PDF sudah memuat pembahasan dan kunci jawaban?</b></Bubble>}
      {step === 'hasKey' && <Choices options={[{ value: 'yes', label: 'Ya' }, { value: 'no', label: 'Tidak' }]} onPick={(o) => answer('hasKey', o, 'language')} />}
      {at('language') && <Bubble from="me">{a.hasKeyLabel}</Bubble>}

      {at('language') && <Bubble><b>Bahasa apa yang dipakai di soal?</b></Bubble>}
      {step === 'language' && <Choices options={LANG} onPick={(o) => answer('language', o, 'scope')} />}
      {at('scope') && <Bubble from="me">{a.languageLabel}</Bubble>}

      {at('scope') && <Bubble><b>Soal ini dibatasi hanya untuk pengguna dari kampus seperti kamu, atau boleh dilihat pengguna dari kampus lain juga?</b></Bubble>}
      {step === 'scope' && (
        <Choices
          options={[
            ...(me?.campus ? [{ value: 'campus', label: `Hanya kampus saya (${campusName})` }] : []),
            { value: 'all', label: 'Semua kampus' },
          ]}
          onPick={(o) => answer('scope', o, 'count')}
        />
      )}
      {step === 'scope' && !me?.campus && <p className="pl-10 text-xs text-ink-muted">Kampusmu belum ada di daftar MEDCOEL, jadi pilihan Hanya kampus saya belum tersedia.</p>}
      {at('count') && <Bubble from="me">{a.scopeLabel}</Bubble>}

      {at('count') && <Bubble><b>Berapa PDF yang akan dikirim?</b></Bubble>}
      {step === 'count' && <Choices options={[...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) })), { value: 'many', label: 'Lebih dari 5' }]} onPick={pickCount} />}
      {at('files') && step !== 'many' && <Bubble from="me">{a.countLabel} PDF</Bubble>}

      {step === 'many' && (
        <>
          <Bubble from="me">Lebih dari 5</Bubble>
          <Bubble>
            Untuk lebih dari 5 PDF, kirim filenya lewat WhatsApp admin ya. Pesannya sudah aku isi. Admin akan mencatat pengajuanmu supaya tetap muncul di Progres permintaan.
            <div className="mt-3">
              <a href={waLink(waNumber, manyPdfMessage({ ...a, hasKey: a.hasKey === 'yes', subjectName: a.subjectLabel }, me))} target="_blank" rel="noopener noreferrer" className="btn-primary"><MessageCircle size={18} /> Kirim lewat WhatsApp</a>
            </div>
            {!waNumber && <p className="mt-2 text-xs text-coral">Nomor WhatsApp admin belum diatur.</p>}
          </Bubble>
        </>
      )}

      {at('files') && step !== 'many' && step !== 'sent' && (
        <Bubble>
          {busy && !draft ? 'Menyiapkan tempat unggah...' : (
            <div className="space-y-3">
              <p>Unggah PDF-nya di sini. Boleh banyak sekaligus atau satu per satu, maksimal 5 file, masing-masing paling besar {maxMb} MB.</p>
              <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-line p-4 text-center hover:border-brand">
                <FileUp className="text-brand" />
                <span className="text-sm font-semibold">Pilih PDF</span>
                <input type="file" accept="application/pdf,.pdf" multiple className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} disabled={!draft} />
              </label>
              <ul className="space-y-1.5">
                {(draft?.files || []).map((f) => (
                  <li key={f.id} className="flex items-center gap-2 rounded-lg bg-page px-3 py-2 text-sm">
                    <FileText size={16} className="text-brand" /><span className="min-w-0 flex-1 truncate">{f.name}</span><span className="text-xs text-ink-muted">{(f.size / 1048576).toFixed(1)} MB</span>
                    <button type="button" onClick={() => removeFile(f)} className="rounded p-1 text-ink-muted hover:text-coral" aria-label={`Hapus ${f.name}`}><Trash2 size={15} /></button>
                  </li>
                ))}
                {uploads.map((u) => (
                  <li key={u.key} className={clsx('flex items-center gap-2 rounded-lg px-3 py-2 text-sm', u.error ? 'bg-coral-soft text-coral' : 'bg-page')}>
                    <FileText size={16} /><span className="min-w-0 flex-1 truncate">{u.name}</span>
                    <span className="text-xs">{u.error || `${Math.round(u.progress * 100)}%`}</span>
                    {u.error && <button type="button" onClick={() => setUploads((l) => l.filter((x) => x.key !== u.key))} aria-label="Tutup"><X size={14} /></button>}
                  </li>
                ))}
              </ul>
              {draft?.files?.length > 0 && step === 'files' && <button type="button" className="btn-primary" onClick={() => setStep('summary')}>Lanjut ke ringkasan</button>}
            </div>
          )}
        </Bubble>
      )}

      {step === 'summary' && draft && (
        <Bubble>
          <p className="font-semibold">Ringkasan pengajuan</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-ink-muted">Mata kuliah</dt><dd>{draft.subjectName}</dd>
            <dt className="text-ink-muted">Kunci & pembahasan</dt><dd>{draft.hasKey ? 'Sudah ada di PDF' : 'Belum ada'}</dd>
            <dt className="text-ink-muted">Bahasa</dt><dd>{a.languageLabel}</dd>
            <dt className="text-ink-muted">Dapat dilihat</dt><dd>{draft.scope === 'campus' ? `Hanya pengguna ${draft.campusName}` : 'Pengguna semua kampus'}</dd>
            <dt className="text-ink-muted">File</dt><dd>{draft.files.map((f) => f.name).join(', ')}</dd>
            <dt className="text-ink-muted">Antrean</dt><dd>{draft.queue?.pdfAhead || 0} PDF di depan. Perkiraan selesai sekitar <b>{draft.queue?.estimateDays} hari</b> setelah dikonfirmasi (paling lama sekitar 5 hari). Ini perkiraan, bukan janji.</dd>
          </dl>
          <label className="mt-3 flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[rgb(var(--brand))]" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>Saya berhak membagikan isi PDF ini untuk keperluan belajar, dan setuju admin boleh menolaknya bila melanggar hak cipta.</span>
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={send} disabled={!agree || busy}>{busy ? 'Mengirim...' : 'Kirim pengajuan'}</button>
            <button type="button" className="btn-ghost" onClick={() => setStep('files')}>Ubah file</button>
          </div>
        </Bubble>
      )}

      {step === 'sent' && sent && (
        <Bubble>
          <p>Pengajuan <b>{sent.code}</b> tercatat dengan status <b>Menunggu konfirmasi</b>. Satu langkah lagi: konfirmasi ke admin lewat WhatsApp supaya pengajuanmu masuk antrean.</p>
          <p className="mt-1 text-sm text-ink-muted">Pengajuan yang tidak dikonfirmasi dalam {settings?.confirmDays || 3} hari akan kedaluwarsa dan filenya dihapus.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={waLink(waNumber, confirmMessage(sent, me))} target="_blank" rel="noopener noreferrer" className="btn-primary"><MessageCircle size={18} /> Konfirmasi lewat WhatsApp</a>
            <button type="button" className="btn-secondary" onClick={onExit}>Lihat progres permintaan</button>
          </div>
          {!waNumber && <p className="mt-2 text-xs text-coral">Nomor WhatsApp admin belum diatur.</p>}
        </Bubble>
      )}

      <Alert>{error}</Alert>
      <div className="flex gap-2 pl-10">
        <button type="button" className="btn-ghost btn-sm" onClick={restart}><RotateCcw size={15} /> Ulangi</button>
        <button type="button" className="btn-ghost btn-sm" onClick={onMenu}>Kembali ke pesan</button>
      </div>
      <div ref={end} />
    </div>
  );
}

function MyRequests() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const { me, settings } = useAuth();
  const load = () => api('submissions/mine').then((d) => setItems(d.items)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  const cancel = async (s) => {
    if (!window.confirm(`Batalkan pengajuan ${s.code}?`)) return;
    try { await api(`submissions/${s.id}/cancel`, { method: 'POST', body: {} }); load(); } catch (e) { setError(e.message); }
  };
  if (!items) return <PageLoader />;
  return (
    <div className="space-y-3">
      <Alert>{error}</Alert>
      {!items.length ? <EmptyState icon={ListChecks} title="Belum ada pengajuan">Pengajuan PDF soal yang kamu kirim akan muncul di sini beserta status dan estimasinya.</EmptyState> : items.map((s) => (
        <SubmissionCard key={s.id} s={s}>
          <div className="mt-3 flex flex-wrap gap-2">
            {s.status === 'menunggu_konfirmasi' && (
              <a href={waLink(settings?.adminWhatsapp, confirmMessage(s, me))} target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm"><MessageCircle size={15} /> Konfirmasi lewat WhatsApp</a>
            )}
            {['menunggu_konfirmasi', 'antre'].includes(s.status) && <button type="button" className="btn-ghost btn-sm text-coral" onClick={() => cancel(s)}>Batalkan</button>}
          </div>
        </SubmissionCard>
      ))}
    </div>
  );
}

export function ChatAdminBody({ compact = false }) {
  const [view, setView] = useState('chat');
  const menu = [
    { key: 'upload', icon: FileUp, title: 'Upload soal', text: 'Ubah PDF soal menjadi soal di web.' },
    { key: 'requests', icon: ListChecks, title: 'Progres permintaan saya', text: 'Status dan estimasi pengajuanmu.' },
  ];
  return (
    <div className={compact ? "chat-admin-body is-compact" : "space-y-5"}>
      <div className="chat-page-tabs" role="group" aria-label="Layanan Chat Admin">{[{ key: 'chat', label: 'Pesan admin', icon: MessageCircle }, ...menu.map((m) => ({ ...m, label: m.key === 'upload' ? 'Unggah PDF' : 'Pengajuan saya' }))].map((t) => <button key={t.key} type="button" aria-pressed={view === t.key} onClick={() => setView(t.key)}><t.icon size={16} />{t.label}</button>)}</div>
      {view === 'chat' && <SupportConversation compact={compact} />}
      {view === 'upload' && <div className={compact ? 'min-h-0 flex-1 overflow-y-auto' : ''}><UploadFlow onExit={() => setView('requests')} onMenu={() => setView('chat')} /></div>}
      {view === 'requests' && (
        <div className="space-y-3">
          <button type="button" className="btn-ghost btn-sm" onClick={() => setView('chat')}>Kembali ke pesan</button>
          <MyRequests />
        </div>
      )}
      <p className="text-center text-xs text-ink-muted">{view === 'chat' ? 'Pesanmu hanya terlihat olehmu dan admin. ' : 'Dengan mengunggah, kamu menyetujui '}<Link to="/kebijakan-privasi" className="underline">kebijakan privasi dan hak cipta</Link> MEDCOEL.</p>
    </div>
  );
}

export default function ChatAdmin() {
  return <div className="chat-admin-page mx-auto max-w-3xl space-y-5"><div><h1 className="page-title">Chat Admin</h1><p className="mt-1 text-ink-muted">Tanyakan sesuatu, laporkan kendala, atau bantu MEDCOEL jadi lebih baik.</p></div><ChatAdminBody /></div>;
}
