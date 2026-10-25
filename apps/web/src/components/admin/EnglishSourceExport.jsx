import { Download } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Alert } from '@/components/ui';
import { api } from '@/lib/api';
import { useLanguage } from '@/i18n';

export default function EnglishSourceExport() {
  const { language } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [counts, setCounts] = useState(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const active = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);

  const download = async () => {
    setBusy(true); setError(''); setDone(false);
    const pack = { format: 'medcoel-english-source', version: 1, exportedAt: new Date().toISOString(), subjects: [], chapters: [], questions: [], cases: [] };
    const progress = { question: 0, case: 0, catalog: 0 };
    setCounts({ ...progress });
    try {
      for (const kind of ['catalog', 'question', 'case']) {
        let after = '';
        const cursors = new Set();
        do {
          const page = await api('admin/english/source', { query: { kind, after } });
          if (!active.current) return;
          if (page.subjects) pack.subjects = page.subjects;
          pack[kind === 'catalog' ? 'chapters' : kind === 'question' ? 'questions' : 'cases'].push(...page.items);
          progress[kind] += page.items.length;
          setCounts({ ...progress });
          after = page.next;
          if (after && cursors.has(after)) throw new Error(language === 'en' ? 'Download stopped because a page was repeated. Please retry.' : 'Unduhan berhenti karena halaman berulang. Coba lagi.');
          cursors.add(after);
        } while (after);
      }
      const url = URL.createObjectURL(new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url; link.download = `medcoel-english-source-${pack.exportedAt.slice(0, 10)}.json`;
      document.body.appendChild(link); link.click(); link.remove();
      // Give the browser time to begin reading the blob before releasing it.
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      setDone(true);
    } catch (e) { if (active.current) setError(e.message); }
    finally { if (active.current) setBusy(false); }
  };

  return <section className="card space-y-3 p-5">
    <h2 className="font-bold">Siapkan terjemahan seluruh bank soal</h2>
    <p className="text-sm text-ink-muted">Unduh materi asli dari server agar teks soal, semua pilihan, pembahasan, judul BAB, dan kasus simulasi dapat diterjemahkan dengan konteks lengkap. Tombol ini mengambil salinan; terjemahan Inggris belum dibuat.</p>
    <p className="text-sm text-ink-muted">Salinan berisi materi dan kunci jawaban. Data akun peserta, riwayat pengerjaan, API key, dan PDF peserta tidak disertakan. Unduhan tidak dikirim ke layanan penerjemah.</p>
    <button type="button" className="btn-secondary" disabled={busy} onClick={download}><Download size={18} />{busy ? 'Menyiapkan unduhan...' : 'Unduh materi untuk diterjemahkan'}</button>
    {counts && <p className="text-sm" role="status">{language === 'en' ? `${counts.question} questions · ${counts.case} cases · ${counts.catalog} chapters collected` : `${counts.question} soal · ${counts.case} kasus · ${counts.catalog} BAB terkumpul`}</p>}
    {done && <Alert kind="success">Berkas sumber sudah disiapkan untuk diunduh. Kirim berkas JSON tersebut di chat pengerjaan terjemahan. Isi bank soal di situs tetap sama sampai hasil terjemahan dipasang.</Alert>}
    <Alert>{error}</Alert>
  </section>;
}
