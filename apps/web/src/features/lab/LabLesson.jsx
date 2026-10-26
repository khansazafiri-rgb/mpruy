import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '@/components/ui';
import LabCaseExplorer from './LabImageGallery';
import LabStudyGuide from './LabStudyGuide';
import LabImage from './LabImage';
import LabLayerExplorer from './LabLayerExplorer';
import LabExplodedView from './LabExplodedView';
import LabModel3D from './LabModel3D';
import { objectHref } from './labUtils';

// Isi materi disusun dari daftar blok. Jenis blok baru (comparison, layer_explorer, exploded_view, ...)
// cukup didaftarkan di LAB_BLOCKS dan ditambahkan ke buildBlocks; halaman tidak perlu ditulis ulang.
const Section = ({ title, children, className = '' }) => <section className={`card min-w-0 space-y-3 p-4 sm:p-5 ${className}`}>{title && <h2 className="text-xl font-semibold">{title}</h2>}{children}</section>;
const Bullets = ({ items }) => <ul className="list-disc space-y-2 pl-5">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>;
const FLAG = { low: '↓ Rendah', normal: 'Dalam rentang', high: '↑ Tinggi' };

// Layers name an asset id (image) or a built-in dev schematic; resolve to something drawable. Missing assets are dropped.
function resolveLayers(layers, ctx) {
  return layers.flatMap((l) => {
    if (l.schematic) return [l];
    const a = ctx.assetsById[l.asset];
    return a?.url ? [{ ...l, href: a.url }] : [];
  });
}
function GuidedObservation({ block }) {
  const [i, setI] = useState(0); const s = block.steps[i];
  return <Section title={block.title || 'Observasi terpandu'}>
    <p className="text-xs font-bold uppercase text-brand" aria-live="polite">Langkah {i + 1} dari {block.steps.length}</p>
    <div className="rounded-xl border border-line p-4"><p className="font-semibold">{s.title}</p>{s.text && <p className="mt-1 text-sm leading-relaxed text-ink-muted">{s.text}</p>}</div>
    <div className="flex items-center justify-between"><button type="button" className="btn btn-ghost btn-sm" disabled={i === 0} onClick={() => setI(i - 1)}>← Sebelumnya</button>
      <div className="flex gap-1" role="group" aria-label="Pilih langkah">{block.steps.map((_, k) => <button key={k} type="button" aria-label={`Langkah ${k + 1}`} aria-current={k === i} onClick={() => setI(k)} className={`h-3 w-3 rounded-full ${k === i ? 'bg-brand' : 'bg-paper-2'}`} />)}</div>
      <button type="button" className="btn btn-ghost btn-sm" disabled={i === block.steps.length - 1} onClick={() => setI(i + 1)}>Berikutnya →</button></div>
  </Section>;
}
export const LAB_BLOCKS = {
  study_guide: ({ block }) => <LabStudyGuide guide={block.guide} />,
  callout: ({ block }) => <Alert kind={block.kind === 'warn' ? 'warn' : 'info'}>{block.title && <strong>{block.title}. </strong>}{block.text}</Alert>,
  guided_observation: ({ block }) => <GuidedObservation block={block} />,
  comparison: ({ block, ctx }) => <Section title={block.title || 'Bandingkan'}><div className="grid gap-4 sm:grid-cols-2">{[block.left, block.right].map((side, i) => ctx.assetsById[side.asset] && <figure key={i} className="space-y-2"><LabImage asset={ctx.assetsById[side.asset]} controls={false} />{side.caption && <figcaption className="text-sm text-ink-muted">{side.caption}</figcaption>}</figure>)}</div></Section>,
  layer_explorer: ({ block, ctx }) => <Section><LabLayerExplorer block={block} layers={resolveLayers(block.layers, ctx)} /></Section>,
  exploded_view: ({ block, ctx }) => {
    const src = block.from ? ctx.blocks.find((b) => b.id === block.from) : null; const layers = resolveLayers(block.layers || src?.layers || [], ctx);
    return layers.length < 2 ? null : <Section><LabExplodedView block={{ ...block, origin: block.origin || src?.origin, dev: block.dev ?? src?.dev }} layers={layers} /></Section>;
  },
  model_3d: ({ block, ctx }) => <Section><LabModel3D block={block} asset={ctx.assetsById[block.asset]} /></Section>,
  clinical_connection: ({ block }) => <Section title={block.title} className="border-brand/40"><p className="leading-relaxed">{block.text}</p>{block.link && <Link to={objectHref(block.link.slug)} className="btn btn-secondary btn-sm w-fit">{block.link.label || 'Lanjut ke materi terkait'}: {block.link.title} →</Link>}</Section>,
  objectives: ({ block }) => <Section title="Setelah materi ini kamu bisa" className="border-brand/40 bg-brand-soft/40"><Bullets items={block.items} /></Section>,
  text: ({ block }) => <Section title={block.title}><p className="whitespace-pre-line leading-relaxed">{block.text}</p></Section>,
  list: ({ block }) => <Section title={block.title}>{Array.isArray(block.items) ? <Bullets items={block.items} /> : <p className="whitespace-pre-line leading-relaxed">{block.items}</p>}</Section>,
  steps: ({ block }) => <Section title={block.title}><ol className="space-y-2">{block.items.map((s, i) => <li key={i} className="flex gap-3 rounded-xl border border-line p-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand">{i + 1}</span><div><p className="font-semibold">{s.title}</p><p className="text-sm leading-relaxed text-ink-muted">{s.finding}</p></div></li>)}</ol></Section>,
  lab_table: ({ block }) => <Section title="Hasil laboratorium"><p className="text-sm text-ink-muted">{block.lab.context}</p><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-line">{['Pemeriksaan', 'Hasil', 'Rentang latihan', 'Status'].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{block.lab.rows.map((r) => <tr key={r.key} className="border-b border-line"><th className="p-3 font-medium">{r.name}</th><td className="p-3">{r.value} {r.unit}</td><td className="p-3">{r.low}–{r.high} {r.unit}</td><td className="p-3 font-semibold">{FLAG[r.flag]}</td></tr>)}</tbody></table></div>{block.lab.matches.map((m) => <Alert kind="info" key={m}>{m}</Alert>)}</Section>,
  image_gallery: ({ block, ctx }) => {
    const explorer = <LabCaseExplorer assets={block.assets} modality={ctx.modality} guide={block.guide} />;
    // Aset yang juga dipakai sebagai soal latihan menampilkan label; sembunyikan di balik pilihan sadar agar latihan tidak terbongkar.
    return block.spoiler
      ? <Section title="Contoh gambar berlabel"><details><summary className="cursor-pointer font-semibold text-brand">Buka contoh berlabel (Learn)</summary><Alert kind="warn">Gambar-gambar ini juga muncul di latihan dan labelnya terlihat di sini. Buka setelah latihan agar latihan tetap menguji.</Alert><div className="mt-4">{explorer}</div></details></Section>
      : <Section title="Contoh gambar">{explorer}</Section>;
  },
  practice: ({ block, ctx }) => <Section title="Latihan">
    {block.questions > 0 && <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-ink-muted">{block.questions} kasus, satu per layar. Label dan jawaban baru terlihat setelah kamu menjawab.</p>{ctx.preview ? <span className="text-sm font-semibold text-ink-muted">Latihan nonaktif di pratinjau</span> : <button type="button" className="btn btn-primary" onClick={ctx.startPractice}>Mulai latihan</button>}</div>}
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
  // Authored visual blocks (layer explorer, exploded view, 3D, comparison, ...) follow the orientation text.
  const authored = x.blocks || []; authored.forEach((b) => blocks.push(b));
  const owned = new Set(authored.flatMap((b) => [b.asset, b.left?.asset, b.right?.asset, ...(b.layers || []).map((l) => l.asset)].filter(Boolean)));
  const pics = d.assets.filter((a) => a.media !== 'model' && !owned.has(a.id));
  if (pics.length) {
    const guide = x.mode !== 'practice' && x.studyGuide?.scope === 'class' ? x.studyGuide : null;
    if (guide) add('study_guide', { guide });
    const used = new Set(d.questions.map((q) => q.image?.id).filter(Boolean));
    add('image_gallery', { assets: pics, guide, spoiler: pics.some((a) => used.has(a.id)) });
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
  if (d.assets.some((a) => !a.synthetic)) notes.push('Label benchmark bukan diagnosis pasien. Gunakan untuk latihan mengenali pola, bukan sebagai pengganti penilaian medis lengkap.');
  if (seen.size || x.references.length || notes.length) add('about', { sources: [...seen.values()], references: x.references, notes });
  return blocks;
}

export default function LabLesson({ d, ctx: base }) {
  const ctx = { ...base, assetsById: Object.fromEntries(d.assets.map((a) => [a.id, a])), blocks: d.data.blocks || [] };
  return <>{buildBlocks(d).map((block, i) => { const Block = LAB_BLOCKS[block.type]; return Block ? <Block key={`${block.type}-${i}`} block={block} ctx={ctx} /> : null; })}</>;
}
