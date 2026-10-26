// Authored class-level guidance only. Sources are links, never fetched to generate student content.
function Statement({ item, guide }) {
  if (!item) return null;
  return <><span>{item.text}</span><sup className="ml-1 whitespace-nowrap text-xs">{item.sources.map((id, i) => {
    const index = guide.sources.findIndex((s) => s.id === id); const source = guide.sources[index];
    return source && <a key={id} href={source.url} target="_blank" rel="noreferrer" className="text-brand underline" aria-label={`Sumber: ${source.resource}`}>{i > 0 ? ', ' : ''}{index + 1}</a>;
  })}</sup></>;
}
function Statements({ items = [], guide, ordered = false }) {
  const Tag = ordered ? 'ol' : 'ul';
  return <Tag className={`${ordered ? 'list-decimal' : 'list-disc'} space-y-2 pl-5 leading-relaxed`}>{items.map((item, i) => <li key={i}><Statement item={item} guide={guide} /></li>)}</Tag>;
}
function Sources({ guide, ids }) {
  const sources = ids ? guide.sources.filter((s) => ids.includes(s.id)) : guide.sources;
  return <details className="min-w-0 text-sm"><summary className="cursor-pointer font-semibold text-brand">Sumber pembelajaran</summary>
    <p className="mt-2 text-xs text-ink-muted">Rujukan ciri umum; sumber gambar tetap MedMNIST dan dicantumkan terpisah.</p>
    <ul className="mt-2 space-y-2 break-words">{sources.map((s) => <li key={s.id}><a href={s.url} target="_blank" rel="noreferrer" className="text-brand underline">{guide.sources.indexOf(s) + 1}. {s.organization} · {s.resource}</a></li>)}</ul>
  </details>;
}
export function profileForGroup(guide, group) {
  return guide?.scope === 'class' && group.items.every(({ asset }) => asset.dataset?.name === guide.dataset)
    ? guide.profiles.find((p) => p.key === group.key) : null;
}
export function ClassIdentification({ guide, profile }) {
  if (!profile) return null;
  const ids = [...new Set([...profile.features, ...profile.compare, ...profile.caveats].flatMap((s) => s.sources))];
  return <aside className="min-w-0 space-y-3 rounded-xl border border-brand/20 bg-brand-soft/30 p-3 text-sm sm:p-4" aria-label={`Panduan ${profile.title}`}>
    <h4 className="font-bold">Ciri yang perlu dicari</h4>
    <Statements items={profile.features} guide={guide} />
    {profile.compare.length > 0 && <div className="space-y-1"><p className="font-semibold">Bedakan dari</p><Statements items={profile.compare} guide={guide} /></div>}
    {profile.caveats.length > 0 && <div className="space-y-1 text-ink-muted"><Statements items={profile.caveats} guide={guide} /></div>}
    <p className="text-xs text-ink-muted">Ciri umum kelas, bukan observasi yang sudah dipastikan pada gambar ini.</p>
    <Sources guide={guide} ids={ids} />
  </aside>;
}
export default function LabStudyGuide({ guide }) {
  const comparison = guide.comparison;
  return <section className="card min-w-0 space-y-4 p-4 sm:p-5" aria-label={guide.title}>
    <h2 className="text-xl font-semibold">{guide.title}</h2>
    <p className="text-sm leading-relaxed"><Statement item={guide.introduction} guide={guide} /></p>
    <h3 className="text-lg font-semibold">{comparison.title}</h3>
    {/* One narrow-screen card per row: no fixed-width table or horizontal page overflow. */}
    <div className="space-y-3 md:hidden" data-guide-layout="cards">{comparison.rows.map((row) => <article key={row.key} className="min-w-0 rounded-xl border border-line p-3">
      <h4 className="font-bold">{row.label}</h4><dl className="mt-2 space-y-2 text-sm">{row.values.map((item, i) => <div key={i} className="min-w-0"><dt className="font-semibold">{comparison.columns[i]}</dt><dd className="mt-0.5 break-words leading-relaxed"><Statement item={item} guide={guide} /></dd></div>)}</dl>
    </article>)}</div>
    <table className="hidden w-full table-fixed border-collapse text-left text-sm md:table" data-guide-layout="table">
      <thead><tr><th className="border-b border-line p-2">{guide.dataset === 'BloodMNIST' ? 'Sel' : ['PathMNIST', 'OCTMNIST'].includes(guide.dataset) ? 'Kategori' : 'Aspek'}</th>{comparison.columns.map((c) => <th key={c} className="break-words border-b border-line p-2">{c}</th>)}</tr></thead>
      <tbody>{comparison.rows.map((row) => <tr key={row.key}><th scope="row" className="break-words border-b border-line p-2 align-top">{row.label}</th>{row.values.map((item, i) => <td key={i} className="break-words border-b border-line p-2 align-top leading-relaxed"><Statement item={item} guide={guide} /></td>)}</tr>)}</tbody>
    </table>
    {guide.checklist.length > 0 && <div className="space-y-2"><h3 className="font-semibold">Apa yang harus dilihat?</h3><Statements items={guide.checklist} guide={guide} ordered /></div>}
    {guide.notes.length > 0 && <div className="space-y-2 text-sm text-ink-muted"><Statements items={guide.notes} guide={guide} /></div>}
    <Sources guide={guide} />
  </section>;
}
