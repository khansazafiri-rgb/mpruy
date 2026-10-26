// Curated class-level teaching data, approved through the existing learning-object review workflow.
// No image observations, coordinates, executable HTML, network lookups, or separate review database.
function validateGuide(g) {
  const fail = (message) => { throw new BadRequestError(message); };
  const plain = (v, max) => {
    if (typeof v !== 'string' || !v.trim() || v.length > max || /<\/?[a-zA-Z!]/.test(v)) fail('Teks panduan tidak valid.');
    return v.trim();
  };
  const list = (v, max) => { if (!Array.isArray(v) || v.length > max) fail('Daftar panduan tidak valid.'); return v; };
  const unique = (items) => { if (new Set(items.map((s) => s.key || s.id)).size !== items.length) fail('Kunci panduan harus unik.'); return items; };
  const key = (v) => { const s = plain(v, 80); if (!/^[a-z0-9][a-z0-9 -]*$/.test(s)) fail('Kunci panduan tidak valid.'); return s; };
  if (!g || g.schemaVersion !== 1 || g.scope !== 'class' || !['BloodMNIST', 'PneumoniaMNIST'].includes(g.dataset)) fail('Panduan harus berupa ciri tingkat kelas yang didukung.');
  const sources = unique(list(g.sources, 20).map((s) => {
    if (!s || !/^https:\/\/[^\s/@]+(?:\.[^\s/@]+)+(?:[/?#][^\s]*)?$/.test(s.url)) fail('Sumber pembelajaran harus HTTPS.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.accessed)) fail('Tanggal riset tidak valid.');
    return { id: key(s.id), organization: plain(s.organization, 200), resource: plain(s.resource, 400), url: s.url, accessed: s.accessed };
  }));
  if (!sources.length) fail('Panduan memerlukan sumber.');
  const sourceIds = new Set(sources.map((s) => s.id));
  const statement = (s) => {
    if (!s || !Array.isArray(s.sources) || !s.sources.length || s.sources.length > 6 || s.sources.some((id) => !sourceIds.has(id))) fail('Setiap pernyataan panduan memerlukan sumber yang dikenal.');
    return { text: plain(s.text, 1000), sources: [...new Set(s.sources)] };
  };
  const statements = (xs, max) => list(xs || [], max).map(statement);
  const columns = list(g.comparison?.columns, 3).map((s) => plain(s, 100));
  if (!columns.length) fail('Kolom perbandingan wajib.');
  const rows = unique(list(g.comparison.rows, 12).map((r) => {
    const values = statements(r.values, 3); if (values.length !== columns.length) fail('Jumlah sel perbandingan tidak sesuai.');
    return { key: key(r.key), label: plain(r.label, 120), values };
  }));
  const profiles = unique(list(g.profiles, 8).map((p) => {
    const features = statements(p.features, 6); if (!features.length) fail('Ciri identifikasi wajib.');
    return { key: key(p.key), title: plain(p.title, 120), features, compare: statements(p.compare, 4), caveats: statements(p.caveats, 4) };
  }));
  if (!rows.length || !profiles.length) fail('Panduan memerlukan perbandingan dan profil.');
  return { schemaVersion: 1, dataset: g.dataset, scope: 'class', title: plain(g.title, 200), introduction: statement(g.introduction),
    comparison: { title: plain(g.comparison.title, 200), columns, rows }, profiles,
    checklist: statements(g.checklist, 8), notes: statements(g.notes, 6), sources };
}
module.exports = { validateGuide };
