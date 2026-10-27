import { useState } from 'react';
import { Alert, Segmented } from '@/components/ui';
import LabImage from './LabImage';
import LabPracticeSession from './LabPracticeSession';
import { lessonChapters, practiceBanks } from './labAuthoredView';
import { citationAnchor, citationIndex, citationParts } from './labCitations';

function CitationText({ value, moduleKey, index }) {
  return citationParts(value, index).map((part, i) => part.type === 'text' ? part.value :
    <sup key={i} className="whitespace-nowrap text-[0.7em] font-semibold">
      {part.sources.map((source, j) => <span key={source.key}>{j > 0 && ','}<a
        href={`#${citationAnchor(moduleKey, source.key)}`} className="text-brand underline"
        aria-label={`Sumber ${source.number}`}
        onClick={() => { const panel = document.getElementById(`${moduleKey}-sources`); if (panel) panel.open = true; }}
      >{source.number}</a></span>)}
    </sup>);
}

function SourceList({ moduleKey, citations }) {
  if (!citations.entries.length) return null;
  return <details id={`${moduleKey}-sources`} className="card-source"><summary className="min-h-9 cursor-pointer select-none py-1.5 font-semibold text-ink">Sumber dan lisensi ({citations.entries.length})</summary>
    <ol className="mt-2 list-decimal space-y-2 pl-5 leading-relaxed">{citations.entries.map((s) => <li key={s.key} id={citationAnchor(moduleKey, s.key)} className="break-words"><a href={s.url} target="_blank" rel="noreferrer" className="font-medium text-brand underline">{s.title}</a>{s.citation && ` · ${s.citation}`}{s.disclosure && ` · ${s.disclosure}`}{s.license && ` · ${s.license}`}</li>)}</ol></details>;
}

// Render the same safe, text-only content blocks for student pages and admin preview.
function Block({ block: b, module: m, renderText }) {
  const assets = m.assets || {};
  if (b.type === 'text') return <p className="max-w-[70ch] whitespace-pre-line leading-relaxed">{renderText(b.text)}</p>;
  if (b.type === 'callout') return <Alert kind={b.tone === 'warn' ? 'warn' : 'info'}>{renderText(b.text)}</Alert>;
  if (b.type === 'image') return assets[b.asset] && <LabImage asset={assets[b.asset]} controls="min" />;
  if (b.type === 'gallery') return <div className="space-y-4"><div className="grid gap-x-8 gap-y-9 md:grid-cols-2">{b.items
    ? b.items.map((item) => assets[item.asset] && <figure key={item.asset} className="min-w-0 space-y-3">
      {item.title && <h4 className="card-title">{item.title}</h4>}
      <LabImage asset={assets[item.asset]} controls="min" caption={item.caption && <div className="border-l-2 border-brand/30 pl-3 text-[15px] leading-relaxed"><p className="font-semibold">Ciri yang perlu dicari</p><ul className="mt-1 list-disc space-y-1 pl-5">{item.caption.split('\n').filter(Boolean).map((line, i) => <li key={i}>{renderText(line)}</li>)}</ul></div>} />
    </figure>)
    : (b.assets || []).map((a) => assets[a] && <LabImage key={a} asset={assets[a]} controls="min" />)}</div>
    {b.items?.some((item) => item.caption) && <p className="meta">Ciri di atas berlaku untuk kategori secara umum, bukan pengamatan pada setiap gambar.</p>}</div>;
  if (b.type === 'compare') return <div className="grid gap-6 md:grid-cols-2">{[b.left, b.right].map((a) => assets[a] && <LabImage key={a} asset={assets[a]} controls="min" />)}</div>;
  if (b.type === 'identification_guide') { const g = m.guides[b.guide]; return g && <div className="max-w-[70ch] space-y-2"><p className="font-semibold">{g.title}</p><ol className="list-decimal space-y-2 pl-5 leading-relaxed">{g.steps.map((s, i) => <li key={i} className="whitespace-pre-line"><strong>{s.title}</strong> — {renderText(s.text)}</li>)}</ol></div>; }
  if (b.type === 'identification_table') return <div className="overflow-x-auto"><table className="w-full min-w-[28rem] text-left text-sm"><thead><tr>{b.columns.map((c) => <th key={c} className="border-b border-line bg-page/60 p-2.5 font-semibold">{renderText(c)}</th>)}</tr></thead><tbody>{b.rows.map((r, i) => <tr key={i}>{r.map((cell, j) => <td key={j} className="border-b border-line p-2.5 align-top leading-relaxed">{renderText(cell)}</td>)}</tr>)}</tbody></table></div>;
  if (b.type === 'source_disclosure') return <a href={`#${m.key}-sources`} className="inline-flex min-h-9 items-center text-sm font-semibold text-brand underline" onClick={() => { const panel = document.getElementById(`${m.key}-sources`); if (panel) panel.open = true; }}>Lihat daftar sumber dan lisensi di bawah</a>;
  return null;
}
export default function LabAuthoredContent({ module: m, initialMode = 'learn', trail = [] }) {
  const [mode, setMode] = useState(initialMode);
  const banks = practiceBanks(m), [bankKey, setBankKey] = useState(banks[0]?.key);
  const activeBank = banks.find((bank) => bank.key === bankKey) || banks[0];
  const citations = citationIndex(m.sources);
  const renderText = (value) => <CitationText value={value} moduleKey={m.key} index={citations} />;
  const hasPractice = banks.length > 0;
  const chapters = lessonChapters(m);
  const sectionTitle = new Map((m.chapters || []).flatMap((c) => c.sections.map((s) => [s.key, s.title])));
  if (mode === 'practice' && hasPractice) return <div className="space-y-4">
    <header className="space-y-1"><button type="button" className="inline-flex min-h-9 items-center text-sm font-semibold text-brand hover:underline" onClick={() => setMode('learn')}>← Kembali ke modul</button><p className="eyebrow">Latihan</p><h1 className="section-title">{m.title}</h1></header>
    {banks.length > 1 && <div className="flex flex-wrap gap-2" role="group" aria-label="Pilih latihan">{banks.map((bank) => <button key={bank.key} type="button" aria-pressed={bank.key === activeBank?.key} className={`btn btn-sm ${bank.key === activeBank?.key ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setBankKey(bank.key)}>{bank.title}</button>)}</div>}
    {m.preview ? <p className="text-sm text-ink-muted">{activeBank?.questions.length || 0} soal · latihan dinonaktifkan saat pratinjau.</p>
      : activeBank?.questions.length ? <LabPracticeSession key={activeBank.key} questions={activeBank.questions} onExit={() => setMode('learn')} exitLabel="Kembali ke modul" renderText={renderText} sourceList={<SourceList moduleKey={m.key} citations={citations} />} />
        : <p className="text-sm text-ink-muted">Belum ada soal.</p>}
  </div>;
  return <div className="space-y-6">
    <header className="space-y-2">
      {trail.length > 0 && <p className="eyebrow">{trail.join(' › ')}</p>}
      <h1 className="page-title">{m.title}</h1>
      {m.summary && <p className="page-lead">{renderText(m.summary)}</p>}
    </header>
    {hasPractice && <Segmented className="sm:max-w-md" label="Cara belajar modul" value="learn" onChange={(v) => v === 'practice' && setMode('practice')}
      items={[{ value: 'learn', label: 'Belajar' }, { value: 'practice', label: `Latihan · ${banks.reduce((n, bank) => n + bank.questions.length, 0)} soal` }]} />}
    {chapters.map((c) => <section key={c.key} className="space-y-3"><h2 className="section-title">{c.title}</h2>{c.sections.map((s) => <section key={s.key} id={s.key} className="card scroll-mt-24 space-y-4 p-4 sm:p-6"><h3 className="card-title">{s.title}</h3>{s.blocks.map((b) => <div key={b.key} className="space-y-2">{b.title && b.type !== 'gallery' && <h4 className="font-semibold">{b.title}</h4>}<Block block={b} module={m} renderText={renderText} /></div>)}</section>)}</section>)}
    {m.pathways.length > 0 && <section className="card space-y-3 p-4 sm:p-5"><h2 className="card-title">Jalur dalam modul</h2>{m.pathways.map((p) => <div key={p.key}><p className="font-medium">{p.title}</p><ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">{p.sections.map((s) => <li key={s}><a href={`#${s}`} className="text-brand underline">{sectionTitle.get(s) || s}</a></li>)}</ol></div>)}</section>}
    <SourceList moduleKey={m.key} citations={citations} />
  </div>;
}
