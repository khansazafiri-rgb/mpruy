import { useState } from 'react';
import { Alert } from '@/components/ui';
import LabImage from './LabImage';
import LabPracticeSession from './LabPracticeSession';

// Render the same safe, text-only content blocks for student pages and admin preview.
function Block({ block: b, module: m }) {
  const assets = m.assets || {};
  if (b.type === 'text') return <p className="whitespace-pre-line leading-relaxed">{b.text}</p>;
  if (b.type === 'callout') return <Alert kind={b.tone === 'warn' ? 'warn' : 'info'}>{b.text}</Alert>;
  if (b.type === 'image') return assets[b.asset] && <LabImage asset={assets[b.asset]} />;
  if (b.type === 'gallery') return <div className="grid gap-4 md:grid-cols-2">{b.assets.map((a) => assets[a] && <LabImage key={a} asset={assets[a]} />)}</div>;
  if (b.type === 'compare') return <div className="grid gap-4 md:grid-cols-2">{[b.left, b.right].map((a) => assets[a] && <LabImage key={a} asset={assets[a]} />)}</div>;
  if (b.type === 'identification_guide') { const g = m.guides[b.guide]; return g && <div className="space-y-2"><p className="font-semibold">{g.title}</p><ol className="list-decimal space-y-2 pl-5">{g.steps.map((s, i) => <li key={i}><strong>{s.title}</strong> — {s.text}</li>)}</ol>{g.sources.length > 0 && <details className="text-sm"><summary className="cursor-pointer font-semibold">Sumber panduan</summary><ul className="list-disc pl-5">{g.sources.map((k) => m.sources[k] && <li key={k}><a href={m.sources[k].url} target="_blank" rel="noreferrer" className="text-brand underline">{m.sources[k].title}</a></li>)}</ul></details>}</div>; }
  if (b.type === 'identification_table') return <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{b.columns.map((c) => <th key={c} className="border-b border-line p-2">{c}</th>)}</tr></thead><tbody>{b.rows.map((r, i) => <tr key={i}>{r.map((cell, j) => <td key={j} className="border-b border-line p-2">{cell}</td>)}</tr>)}</tbody></table></div>;
  if (b.type === 'source_disclosure') return <details><summary className="cursor-pointer font-semibold">Sumber dan lisensi</summary><ul className="list-disc pl-5">{b.sources.map((k) => { const s = m.sources[k]; return s && <li key={k}><a href={s.url} target="_blank" rel="noreferrer" className="text-brand underline">{s.title}</a> · {s.citation} · {s.license}{s.disclosure && ` · ${s.disclosure}`}</li>; })}</ul></details>;
  if (b.type === 'practice') return <Practice bank={m.questionBanks[b.bank] || []} preview={m.preview} />;
  return null;
}
function Practice({ bank, preview }) {
  const [active, setActive] = useState(false);
  if (!bank.length) return <p className="text-sm text-ink-muted">Belum ada soal.</p>;
  if (preview) return <p className="text-sm text-ink-muted">{bank.length} soal · latihan dinonaktifkan saat pratinjau.</p>;
  return active ? <LabPracticeSession questions={bank} onExit={() => setActive(false)} /> : <button type="button" className="btn btn-primary" onClick={() => setActive(true)}>Mulai latihan · {bank.length} soal</button>;
}
export default function LabAuthoredContent({ module: m }) {
  return <div className="space-y-5">
    <header><h1 className="text-2xl font-bold">{m.title}</h1><p className="text-ink-muted">{m.summary}</p></header>
    {m.chapters.map((c) => <section key={c.key} className="space-y-3"><h2 className="text-xl font-bold">{c.title}</h2>{c.sections.map((s) => <section key={s.key} id={s.key} className="card space-y-4 p-4 sm:p-5"><h3 className="text-lg font-semibold">{s.title}</h3>{s.blocks.map((b) => <div key={b.key} className="space-y-2">{b.title && <h4 className="font-semibold">{b.title}</h4>}<Block block={b} module={m} /></div>)}</section>)}</section>)}
    {m.pathways.length > 0 && <section className="card space-y-2 p-5"><h2 className="font-semibold">Jalur dalam modul</h2>{m.pathways.map((p) => <div key={p.key}><p className="font-medium">{p.title}</p><ol className="list-decimal pl-5 text-sm">{p.sections.map((s) => <li key={s}><a href={`#${s}`} className="text-brand underline">{s}</a></li>)}</ol></div>)}</section>}
    {Object.values(m.sources).length > 0 && <details className="card p-5 text-sm"><summary className="cursor-pointer font-semibold">Sumber modul</summary><ul className="mt-2 list-disc space-y-1 pl-5">{Object.values(m.sources).map((s) => <li key={s.key}><a href={s.url} target="_blank" rel="noreferrer" className="text-brand underline">{s.title}</a>{s.citation && ` · ${s.citation}`}{s.disclosure && ` · ${s.disclosure}`}</li>)}</ul></details>}
  </div>;
}
