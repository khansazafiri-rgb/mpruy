import { useState } from 'react';
import { Alert } from '@/components/ui';
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
  return <details id={`${moduleKey}-sources`} className="card p-5 text-sm"><summary className="cursor-pointer font-semibold">Sumber</summary><ol className="mt-2 list-decimal space-y-2 pl-5">{citations.entries.map((s) => <li key={s.key} id={citationAnchor(moduleKey, s.key)}><a href={s.url} target="_blank" rel="noreferrer" className="text-brand underline">{s.title}</a>{s.citation && ` · ${s.citation}`}{s.disclosure && ` · ${s.disclosure}`}{s.license && ` · ${s.license}`}</li>)}</ol></details>;
}

// Render the same safe, text-only content blocks for student pages and admin preview.
function Block({ block: b, module: m, renderText }) {
  const assets = m.assets || {};
  if (b.type === 'text') return <p className="whitespace-pre-line leading-relaxed">{renderText(b.text)}</p>;
  if (b.type === 'callout') return <Alert kind={b.tone === 'warn' ? 'warn' : 'info'}>{renderText(b.text)}</Alert>;
  if (b.type === 'image') return assets[b.asset] && <LabImage asset={assets[b.asset]} />;
  if (b.type === 'gallery') return <div className="grid gap-4 md:grid-cols-2">{b.items
    ? b.items.map((item) => assets[item.asset] && <article key={item.asset} className="card min-w-0 space-y-3 p-4">
      {item.title && <h5 className="font-semibold">{item.title}</h5>}
      <LabImage asset={assets[item.asset]} caption={item.caption && <div className="text-sm leading-relaxed"><p className="font-semibold">Ciri yang perlu dicari</p><ul className="mt-1 list-disc space-y-1 pl-5">{item.caption.split('\n').filter(Boolean).map((line, i) => <li key={i}>{renderText(line)}</li>)}</ul></div>} />
    </article>)
    : (b.assets || []).map((a) => assets[a] && <LabImage key={a} asset={assets[a]} />)}</div>;
  if (b.type === 'compare') return <div className="grid gap-4 md:grid-cols-2">{[b.left, b.right].map((a) => assets[a] && <LabImage key={a} asset={assets[a]} />)}</div>;
  if (b.type === 'identification_guide') { const g = m.guides[b.guide]; return g && <div className="space-y-2"><p className="font-semibold">{g.title}</p><ol className="list-decimal space-y-2 pl-5">{g.steps.map((s, i) => <li key={i} className="whitespace-pre-line"><strong>{s.title}</strong> — {renderText(s.text)}</li>)}</ol></div>; }
  if (b.type === 'identification_table') return <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{b.columns.map((c) => <th key={c} className="border-b border-line p-2">{renderText(c)}</th>)}</tr></thead><tbody>{b.rows.map((r, i) => <tr key={i}>{r.map((cell, j) => <td key={j} className="border-b border-line p-2">{renderText(cell)}</td>)}</tr>)}</tbody></table></div>;
  if (b.type === 'source_disclosure') return <a href={`#${m.key}-sources`} className="text-sm font-semibold text-brand underline" onClick={() => { const panel = document.getElementById(`${m.key}-sources`); if (panel) panel.open = true; }}>Lihat daftar sumber dan lisensi di bawah</a>;
  return null;
}
export default function LabAuthoredContent({ module: m, initialMode = 'learn' }) {
  const [mode, setMode] = useState(initialMode);
  const banks = practiceBanks(m), [bankKey, setBankKey] = useState(banks[0]?.key);
  const activeBank = banks.find((bank) => bank.key === bankKey) || banks[0];
  const citations = citationIndex(m.sources);
  const renderText = (value) => <CitationText value={value} moduleKey={m.key} index={citations} />;
  const hasPractice = banks.length > 0;
  if (mode === 'practice' && hasPractice) return <div className="space-y-4">
    <header className="space-y-2"><button type="button" className="text-sm font-semibold text-brand underline" onClick={() => setMode('learn')}>← Kembali ke modul</button><h1 className="text-2xl font-bold">Latihan · {m.title}</h1></header>
    {banks.length > 1 && <div className="flex flex-wrap gap-2" aria-label="Pilih latihan">{banks.map((bank) => <button key={bank.key} type="button" className={`btn btn-sm ${bank.key === activeBank?.key ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setBankKey(bank.key)}>{bank.title}</button>)}</div>}
    {m.preview ? <p className="text-sm text-ink-muted">{activeBank?.questions.length || 0} soal · latihan dinonaktifkan saat pratinjau.</p>
      : activeBank?.questions.length ? <LabPracticeSession key={activeBank.key} questions={activeBank.questions} onExit={() => setMode('learn')} exitLabel="Kembali ke modul" renderText={renderText} sourceList={<SourceList moduleKey={m.key} citations={citations} />} />
        : <p className="text-sm text-ink-muted">Belum ada soal.</p>}
  </div>;
  return <div className="space-y-5">
    <header><h1 className="text-2xl font-bold">{m.title}</h1><p className="text-ink-muted">{renderText(m.summary)}</p></header>
    {hasPractice && <div role="tablist" aria-label="Cara belajar modul" className="grid grid-cols-2 gap-1 rounded-2xl bg-paper-2 p-1"><button type="button" role="tab" aria-selected="true" className="min-h-11 rounded-xl bg-surface px-3 text-sm font-semibold text-brand shadow-sm">Belajar</button><button type="button" role="tab" aria-selected="false" className="min-h-11 rounded-xl px-3 text-sm font-semibold text-ink-muted" onClick={() => setMode('practice')}>Latihan · {banks.reduce((n, bank) => n + bank.questions.length, 0)} soal</button></div>}
    {lessonChapters(m).map((c) => <section key={c.key} className="space-y-3"><h2 className="text-xl font-bold">{c.title}</h2>{c.sections.map((s) => <section key={s.key} id={s.key} className="card space-y-4 p-4 sm:p-5"><h3 className="text-lg font-semibold">{s.title}</h3>{s.blocks.map((b) => <div key={b.key} className="space-y-2">{b.title && <h4 className="font-semibold">{b.title}</h4>}<Block block={b} module={m} renderText={renderText} /></div>)}</section>)}</section>)}
    {m.pathways.length > 0 && <section className="card space-y-2 p-5"><h2 className="font-semibold">Jalur dalam modul</h2>{m.pathways.map((p) => <div key={p.key}><p className="font-medium">{p.title}</p><ol className="list-decimal pl-5 text-sm">{p.sections.map((s) => <li key={s}><a href={`#${s}`} className="text-brand underline">{s}</a></li>)}</ol></div>)}</section>}
    <SourceList moduleKey={m.key} citations={citations} />
  </div>;
}
