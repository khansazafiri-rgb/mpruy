// Content packs group assets, objects, questions and pathways that ship together (e.g. "PneumoniaMNIST v1").
// Validation and publishing reuse lab.checkRecord / lab.publishSet, so there is one canonical rule set.
const HOOKS = typeof __hooks !== 'undefined' ? __hooks : __dirname + '/..';
const u = require(HOOKS + '/lib/util.js');
const lab = require(HOOKS + '/lib/lab.js');
function fail(message) { throw new BadRequestError(message); }
const str = (v, max, required) => { if (typeof v !== 'string' || v.length > max || (required && !v.trim())) fail('Isian content pack tidak valid.'); return v.trim(); };

function find(app, key) {
  try { return app.findFirstRecordByFilter('lab_packs', 'id = {:k} || slug = {:k}', { k: key }); } catch (_) { throw new NotFoundError('Content pack tidak ditemukan.'); }
}
function members(app, pack, kind) {
  return app.findRecordsByFilter('lab_' + kind, 'pack = {:p}', 'slug', 2000, 0, { p: pack.id });
}
function packOut(app, r) {
  const counts = {};
  lab.KINDS.forEach((k) => { const rows = members(app, r, k); counts[k] = { total: rows.length, published: rows.filter((x) => x.getString('status') === 'published').length }; counts[k].draft = counts[k].total - counts[k].published; });
  return { id: r.id, slug: r.getString('slug'), title: r.getString('title'), version: r.getString('version'), description: r.getString('description'), source: r.getString('source'), licenseSummary: r.getString('licenseSummary'), status: r.getString('status'), revision: r.getInt('revision'), counts };
}
function items(app, r) {
  const out = [];
  Object.keys(lab.ORDER).sort((a, b) => lab.ORDER[a] - lab.ORDER[b]).forEach((kind) => members(app, r, kind).forEach((x) => out.push({ kind, id: x.id, slug: x.getString('slug'), title: x.getString('title'), status: x.getString('status'), revision: x.getInt('revision') })));
  return out;
}
function list(app) { return app.findRecordsByFilter('lab_packs', 'id != ""', '-updated,id', 200, 0).map((r) => packOut(app, r)); }
function detail(app, key) { const r = find(app, key); return { ...packOut(app, r), items: items(app, r) }; }
function save(app, id, b) {
  const v = { slug: str(b.slug, 100, true), title: str(b.title, 200, true), version: str(b.version || '', 40), description: str(b.description || '', 1000), source: str(b.source || '', 500), licenseSummary: str(b.licenseSummary || '', 1000) };
  if (!/^[a-z0-9-]+$/.test(v.slug)) fail('Slug hanya huruf kecil, angka, dan tanda hubung.');
  let out;
  app.runInTransaction((tx) => {
    const r = id ? find(tx, id) : new Record(tx.findCollectionByNameOrId('lab_packs'));
    if (id && r.getInt('revision') !== b.revision) fail('Content pack telah diubah. Muat ulang sebelum menyimpan.');
    Object.keys(v).forEach((k) => r.set(k, v[k]));
    if (!id) r.set('status', 'draft');
    r.set('revision', r.getInt('revision') + 1); tx.save(r); out = packOut(tx, r);
  }); return out;
}
// Read-only: every problem across the pack, with the exact record, in dependency order.
function validate(app, key) {
  const r = find(app, key); const all = items(app, r); const res = lab.publishSet(app, all.map((i) => ({ kind: i.kind, id: i.id })), null, { dryRun: true });
  const counts = {}; lab.KINDS.forEach((k) => { counts[k] = { total: all.filter((i) => i.kind === k).length, ready: res.ready.filter((i) => i.kind === k).length, skipped: res.skipped.filter((i) => i.kind === k).length }; });
  return { ok: res.ok && all.length > 0, empty: all.length === 0, pack: packOut(app, r), counts, errors: res.errors, ready: res.ready, skipped: res.skipped };
}
function publish(app, key, body, admin) {
  const r = find(app, key); const all = items(app, r);
  const only = Array.isArray(body.items) && body.items.length ? new Set(body.items.map((i) => i.kind + ':' + i.id)) : null;
  const picked = all.filter((i) => !only || only.has(i.kind + ':' + i.id)).map((i) => ({ kind: i.kind, id: i.id }));
  const res = lab.publishSet(app, picked, admin, { confirmReviewed: body.confirmReviewed === true, dryRun: body.dryRun === true });
  if (res.ok && !body.dryRun) {
    const rest = items(app, r); // refresh pack status after publishing
    if (rest.length && rest.every((i) => i.status === 'published')) { const fresh = find(app, key); fresh.set('status', 'published'); fresh.set('revision', fresh.getInt('revision') + 1); app.save(fresh); }
  }
  return { ...res, pack: packOut(app, find(app, key)) };
}
module.exports = { find, list, detail, save, validate, publish, packOut, items };
