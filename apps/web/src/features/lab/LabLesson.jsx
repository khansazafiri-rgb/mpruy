import { Alert } from '@/components/ui';
import LabCaseExplorer from './LabImageGallery';

// Isi materi disusun dari daftar blok. Jenis blok baru (comparison, layer_explorer, exploded_view, ...)
// cukup didaftarkan di LAB_BLOCKS dan ditambahkan ke buildBlocks; halaman tidak perlu ditulis ulang.
const Section = ({ title, children, className = '' }) => <section className={`card space-y-3 p-5 ${className}`}>{title && <h2 className="text-xl font-semibold">{title}</h2>}{children}</section>;
const Bullets = ({ items }) => <ul className="list-disc space-y-2 pl-5">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>;
const FLAG = { low: '↓ Rendah', normal: 'Dalam rentang', high: '↑ Tinggi' };

export const LAB_BLOCKS = {
  objectives: ({ block }) => <Section title="Setelah materi ini kamu bisa" className="border-brand/40 bg-brand-soft/40"><Bullets items={block.items} /></Section>,
  text: ({ block }) => <Section title={block.title}><p className="whitespace-pre-line leading-relaxed">{block.text}</p></Section>,
  list: ({ block }) => <Section title={block.title}>{Array.isArray(block.items) ? <Bullets items={block.items} /> : <p className="whitespace-pre-line leading-relaxed">{block.items}</p>}</Section>,
  steps: ({ block }) => <Section title={block.title}><ol className="space-y-2">{block.items.map((s, i) => <li key={i} className="flex gap-3 rounded-xl border border-line p-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand">{i + 1}</span><div><p className="font-semibold">{s.title}</p><p className="text-sm leading-relaxed text-ink-muted">{s.finding}</p></div></li>)}</ol></Section>,
  lab_table: ({ block }) => <Section title="Hasil laboratorium"><p className="text-sm text-ink-muted">{block.lab.context}</p><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-line">{['Pemeriksaan', 'Hasil', 'Rentang latihan', 'Status'].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{block.lab.rows.map((r) => <tr key={r.key} className="border-b border-line"><th className="p-3 font-medium">{r.name}</th><td className="p-3">{r.value} {r.unit}</td><td className="p-3">{r.low}–{r.high} {r.unit}</td><td className="p-3 font-semibold">{FLAG[r.flag]}</td></tr>)}</tbody></table></div>{block.lab.matches.map((m) => <Alert kind="info" key={m}>{m}</Alert>)}</Section>,
  image_gallery: ({ block, ctx }) => {
    const explorer = <LabCaseExplorer assets={block.assets} modality={ctx.modality} />;
    // Aset yang juga dipakai sebagai soal latihan menampilkan label; sembunyikan di balik pilihan sadar agar latihan tidak terbongkar.
    return block.spoiler
      ? <Section title="Contoh gambar berlabel"><details><summary className="cursor-pointer font-semibold text-brand">Buka contoh berlabel (Learn)</summary><Alert kind="warn">Gambar-gambar ini juga muncul di latihan dan labelnya terlihat di sini. Buka setelah latihan agar latihan tetap menguji.</Alert><div className="mt-4">{explorer}</div></details></Section>
      : <Section title="Contoh gambar">{explorer}</Section>;
  },
  practice: ({ block, ctx }) => <Section title="Latihan">
    {block.questions > 0 && <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-ink-muted">{block.questions} kasus, satu per layar. Label dan jawaban baru terlihat setelah kamu menjawab.</p><button type="button" className="btn btn-primary" onClick={ctx.startPractice}>Mulai latihan</button></div>}
    {block.legacy.length > 0 && <div className="space-y-2"><h3 className="font-semibold">Latihan bank soal MEDCOEL</h3><Alert>{ctx.practiceError}</Alert>{block.legacy.map((q) => <button disabled={ctx.starting} key={q.id} className="btn btn-secondary mr-2" onClick={() => ctx.legacyPractice(q.id)}>Kerjakan: {q.title} ({q.qtype})</button>)}</div>}
  </Section>,
  about: ({ block }) => <details className="card p-5 text-sm"><summary className="cursor-pointer text-base font-semibold">Tentang materi ini</summary><div className="mt-3 space-y-3 leading-relaxed text-ink-muted">
    {block.notes.map((n) => <p key={n}>{n}</p>)}
    {block.sources.length > 0 && <div><p className="font-semibold text-ink">Sumber dan lisensi gambar</p><ul className="list-disc pl-5">{block.sources.map((s) => <li key={s.key}>{s.text}{s.url && <> · <a href={s.url} target="_blank" rel="noreferrer" className="text-brand underline">tautan</a></>}</li>)}</ul></div>}
    {block.references.length > 0 && <div><p className="font-semibold text-ink">Referensi</p>{block.references.map((r) => <a key={r.url} href={r.url} target="_blank" rel="noreferrer" className="block text-brand underline">{r.title}</a>)}</div>}
  </div></details>,
};

export function buildBlocks(d) {
  const x = d.data; const blocks = [];
  const add = (type, extra) => blocks.push({ type, ...extra });
  if (x.objectives?.length) add('objectives', { items: x.objectives });
  if (x.definition) add('text', { title: 'Orientasi singkat', text: x.definition });
  if (d.assets.length) {
    const used = new Set(d.questions.map((q) => q.image?.id).filter(Boolean));
    add('image_gallery', { assets: d.assets, spoiler: d.assets.some((a) => used.has(a.id)) });
  }
  if (x.steps?.length) add('steps', { title: 'Yang perlu diamati', items: x.steps });
  if (x.keyFindings?.length) add('list', { title: 'Temuan kunci', items: x.keyFindings });
  if (x.lab.rows.length) add('lab_table', { lab: x.lab });
  for (const [title, v] of [['Interpretasi', x.interpretation], ['Diagnosis', x.diagnosis], ['Diagnosis banding', x.differentials], ['Korelasi klinis', x.clinicalAssociations]]) if (v?.length) add('list', { title, items: v });
  if (d.questions.length || d.legacyQuestions.length) add('practice', { questions: d.questions.length, legacy: d.legacyQuestions });
  const seen = new Map();
  for (const a of d.assets) { const l = a.license || {}; const text = [l.citation || l.dataset || l.source, l.license].filter(Boolean).join(' · '); if (text && !seen.has(text)) seen.set(text, { key: text, text, url: l.source_url?.startsWith('https://') ? l.source_url : '' }); }
  const notes = [];
  if (d.assets.length && d.assets.every((a) => !(a.annotations || []).length)) notes.push('Gambar pada materi ini hanya punya label tingkat gambar. Tidak ada anotasi lokasi, sehingga MEDCOEL tidak menampilkan kotak lesi buatan.');
  if (d.assets.some((a) => !a.synthetic)) notes.push('Label benchmark bukan diagnosis pasien. Gunakan untuk latihan mengenali pola, bukan sebagai pengganti pembacaan radiologi lengkap.');
  if (seen.size || x.references.length || notes.length) add('about', { sources: [...seen.values()], references: x.references, notes });
  return blocks;
}

export default function LabLesson({ d, ctx }) {
  return <>{buildBlocks(d).map((block, i) => { const Block = LAB_BLOCKS[block.type]; return Block ? <Block key={`${block.type}-${i}`} block={block} ctx={ctx} /> : null; })}</>;
}
