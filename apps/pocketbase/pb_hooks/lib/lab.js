// No AI or network calls. JSON is plain text/data, never executable rules or HTML.
const HOOKS = typeof __hooks !== 'undefined' ? __hooks : __dirname + '/..';
const u = require(HOOKS + '/lib/util.js');
const KINDS = ['objects', 'assets', 'questions', 'pathways'];
const TYPES = ['single_best_answer', 'image_identification', 'select_region', 'hotspot', 'describe_finding', 'interpretation', 'diagnosis', 'differential_diagnosis', 'next_investigation', 'next_management', 'structured_lab', 'sequential_identification'];
function fail(message) { throw new BadRequestError(message); }
function text(v, max, required) {
  if (typeof v !== 'string' || v.length > max || (required && !v.trim())) fail('Teks wajib/terlalu panjang atau format tidak valid.');
  return v.trim();
}
function list(v, max) { if (!Array.isArray(v) || v.length > max) fail('Daftar tidak valid atau terlalu panjang.'); return v; }
function ids(v, max) { return list(v || [], max).map((id) => { if (!/^[a-z0-9]{15}$/.test(id)) fail('ID relasi tidak valid.'); return id; }); }
function safeUrl(v) { return typeof v === 'string' && /^https:\/\/[^\s/@]+(?:\.[^\s/@]+)+(?::\d+)?(?:[/?#][^\s]*)?$/.test(v); }
function strings(v, max) { return list(v || [], max).map((s) => text(s, 2000, true)); }
function rect(r) {
  if (!r || !['x', 'y', 'width', 'height'].every((k) => typeof r[k] === 'number' && Number.isFinite(r[k]) && r[k] >= 0 && r[k] <= 1) || r.width <= 0 || r.height <= 0 || r.x + r.width > 1 || r.y + r.height > 1) fail('Region harus memakai koordinat 0–1 di dalam gambar.');
  return { x: r.x, y: r.y, width: r.width, height: r.height };
}
function validate(kind, b) {
  if (!KINDS.includes(kind)) fail('Jenis konten tidak dikenal.');
  const out = { slug: text(b.slug, 100, true), title: text(b.title, 200, true) };
  if (!/^[a-z0-9-]+$/.test(out.slug)) fail('Slug hanya huruf kecil, angka, dan tanda hubung.');
  const d = b.data;
  if (!d || typeof d !== 'object' || Array.isArray(d) || JSON.stringify(d).length > 100000) fail('Data tidak valid.');
  // Strict allowlists keep accidental private authoring/AI fields out of student payloads.
  if (kind === 'assets') {
    if (d.url !== '/lab-demo/cells.svg' && !safeUrl(d.url)) fail('Aset harus URL HTTPS atau ilustrasi demo bawaan.');
    const l = d.license || {};
    const license = { source: text(l.source, 500, true), dataset: text(l.dataset || '', 200), license: text(l.license, 200, true), source_url: text(l.source_url, 1000, true), citation: text(l.citation || '', 2000), commercial_use: l.commercial_use === true, redistribution: l.redistribution === true, modification: l.modification === true, attribution_required: l.attribution_required !== false, verified: l.verified === true };
    if (license.source_url !== 'original:medcoel-lab-demo' && !safeUrl(license.source_url)) fail('URL sumber lisensi tidak valid.');
    out.data = { url: d.url, alt: text(d.alt, 500, true), synthetic: d.synthetic === true, license,
      annotations: list(d.annotations || [], 50).map((a) => ({ id: text(a.id, 60, true), label: text(a.label, 200, true), layer: a.layer === 'anatomy' ? 'anatomy' : 'abnormality', region: rect(a.region) })) };
    if (new Set(out.data.annotations.map((a) => a.id)).size !== out.data.annotations.length) fail('ID anotasi harus unik.');
  } else if (kind === 'objects') {
    if (!['imaging', 'clinical_pathology', 'microbiology', 'parasitology', 'histology'].includes(b.domain)) fail('Domain tidak valid.');
    Object.assign(out, { domain: b.domain, modality: text(b.modality || '', 100), summary: text(b.summary || '', 600), tags: strings(b.tags, 20), assets: ids(b.assets, 20), related: ids(b.related, 30), legacyQuestions: ids(b.legacyQuestions, 50) });
    const data = { schemaVersion: 1, demo: d.demo === true, definition: text(d.definition || '', 6000), keyFindings: strings(d.keyFindings, 30), interpretation: text(d.interpretation || '', 6000), diagnosis: text(d.diagnosis || '', 2000), differentials: strings(d.differentials, 20), clinicalAssociations: strings(d.clinicalAssociations, 20), references: list(d.references || [], 20).map((r) => { if (!safeUrl(r.url)) fail('Referensi harus HTTPS.'); return { title: text(r.title, 500, true), url: r.url }; }), steps: list(d.steps || [], 30).map((s) => ({ title: text(s.title, 200, true), finding: text(s.finding, 2000, true) })) };
    data.lab = { context: text(d.lab?.context || '', 2000), rows: list(d.lab?.rows || [], 40).map((r) => {
      if (typeof r.value !== 'number' || !Number.isFinite(r.value) || typeof r.low !== 'number' || typeof r.high !== 'number' || !Number.isFinite(r.low) || !Number.isFinite(r.high) || r.low > r.high) fail('Nilai/rentang laboratorium tidak valid.');
      return { key: text(r.key, 40, true), name: text(r.name, 100, true), value: r.value, unit: text(r.unit, 40, true), low: r.low, high: r.high };
    }) };
    if (new Set(data.lab.rows.map((r) => r.key)).size !== data.lab.rows.length) fail('Kode pemeriksaan harus unik.');
    data.lab.rules = list(d.lab?.rules || [], 20).map((rule) => ({ label: text(rule.label, 1000, true), all: list(rule.all, 20).map((c) => {
      if (!data.lab.rows.some((r) => r.key === c.key) || !['low', 'normal', 'high'].includes(c.flag)) fail('Kondisi aturan tidak valid.');
      return { key: c.key, flag: c.flag };
    }) }));
    if (data.lab.rules.some((r) => !r.all.length)) fail('Aturan harus memiliki kondisi.');
    out.data = data;
  } else if (kind === 'questions') {
    if (!TYPES.includes(d.type)) fail('Tipe pertanyaan tidak valid.');
    out.objects = ids(b.objects, 30); if (!out.objects.length) fail('Pilih learning object.');
    out.asset = b.asset ? ids([b.asset], 1)[0] : '';
    const options = list(d.options || [], 8).map((o) => ({ label: text(o.label, 10, true), text: text(o.text, 1000, true) }));
    const data = { type: d.type, prompt: text(d.prompt, 4000, true), options, explanation: text(d.explanation, 6000, true) };
    if (['single_best_answer', 'image_identification'].includes(d.type)) {
      data.answer = text(d.answer, 10, true);
      if (options.length < 2 || new Set(options.map((o) => o.label)).size !== options.length || !options.some((o) => o.label === data.answer)) fail('Pilihan/kunci soal tidak valid.');
    } else if (['hotspot', 'select_region'].includes(d.type)) { data.region = rect(d.region); }
    else { data.answer = text(d.answer, 4000, true); }
    if (['image_identification', 'hotspot', 'select_region'].includes(d.type) && !out.asset) fail('Soal gambar memerlukan aset.');
    out.data = data;
  } else {
    out.summary = text(b.summary || '', 600); out.data = { schemaVersion: 1 };
    out.steps = ids(b.steps, 100);
    if (!out.steps.length || new Set(out.steps).size !== out.steps.length) fail('Jalur membutuhkan langkah unik.');
  }
  return out;
}
function collection(kind) { if (!KINDS.includes(kind)) throw new NotFoundError('Konten tidak ditemukan.'); return 'lab_' + kind; }
function find(app, kind, id, published) {
  let r; try { r = app.findFirstRecordByFilter(collection(kind), '(id = {:key} || slug = {:key})' + (published ? " && status = 'published'" : ''), { key: id }); } catch (_) { throw new NotFoundError('Konten tidak ditemukan.'); } return r;
}
function data(r) { return u.recJson(r, 'data', {}); }
function card(r) { return { id: r.id, slug: r.getString('slug'), title: r.getString('title'), domain: r.getString('domain'), modality: r.getString('modality'), summary: r.getString('summary'), tags: u.recJson(r, 'tags', []), demo: data(r).demo === true }; }
function licenseReady(d) { const l = d.license || {}; return l.verified && l.commercial_use && l.redistribution && (!l.attribution_required || !!l.citation); }
function assetOut(app, id) {
  const r = find(app, 'assets', id, true); const d = data(r);
  if (!licenseReady(d)) throw new NotFoundError('Aset belum lolos pemeriksaan lisensi.');
  return { id: r.id, title: r.getString('title'), ...d };
}
function questionOut(app, r) {
  const d = data(r); const asset = r.getString('asset');
  // Annotation positions/labels can reveal hotspot answers: never send them in question mode.
  let image = null;
  if (asset) { const a = assetOut(app, asset); image = { id: a.id, url: a.url, alt: 'Gambar latihan', synthetic: a.synthetic, license: a.license }; }
  return { id: r.id, type: d.type, prompt: d.prompt, options: d.options, image };
}
function labResult(lab) {
  const rows = (lab.rows || []).map((r) => ({ ...r, flag: r.value < r.low ? 'low' : r.value > r.high ? 'high' : 'normal' }));
  const matches = (lab.rules || []).filter((rule) => rule.all.length && rule.all.every((c) => rows.some((r) => r.key === c.key && r.flag === c.flag))).map((r) => r.label);
  return { context: lab.context, rows, matches };
}
function detail(app, id, user) {
  const r = find(app, 'objects', id, true); const d = data(r);
  const assets = r.getStringSlice('assets').map((a) => assetOut(app, a));
  const related = r.getStringSlice('related').flatMap((id) => { try { return [card(find(app, 'objects', id, true))]; } catch (_) { return []; } });
  const questions = app.findRecordsByFilter('lab_questions', "status = 'published' && objects.id ?= {:id}", 'created,id', 100, 0, { id: r.id }).flatMap((q) => { try { return [questionOut(app, q)]; } catch (_) { return []; } });
  const legacy = r.getStringSlice('legacyQuestions').flatMap((id) => {
    try { const q = app.findRecordById('questions', id); const ch = app.findRecordById('chapters', q.getString('chapter')); const s = app.findRecordById('subjects', q.getString('subject'));
      if (q.getString('status') !== 'published' || !u.canSeeQuestion(user, q) || ch.getBool('hidden') || s.getBool('hidden')) return [];
      return [{ id, title: ch.getString('title'), qtype: q.getString('qtype') }];
    } catch (_) { return []; }
  });
  return { ...card(r), data: { ...d, lab: labResult(d.lab || {}) }, assets, related, questions, legacyQuestions: legacy };
}
function browse(app, query, domain, page) {
  let filter = "status = 'published'"; const params = {};
  if (query) { filter += ' && (title ~ {:q} || summary ~ {:q} || tags ~ {:q} || modality ~ {:q})'; params.q = query.slice(0, 120); }
  if (domain) { filter += ' && domain = {:d}'; params.d = domain; }
  const rows = app.findRecordsByFilter('lab_objects', filter, 'title,id', 25, (page - 1) * 24, params);
  return { items: rows.slice(0, 24).map(card), hasMore: rows.length > 24, page };
}
function pathOut(app, r) {
  const steps = app.findRecordsByFilter('lab_path_steps', 'pathway = {:id}', 'position', 100, 0, { id: r.id }).flatMap((s) => { try { return [{ ...card(find(app, 'objects', s.getString('object'), true)), position: s.getInt('position') }]; } catch (_) { return []; } });
  return { ...card(r), steps };
}
function adminOut(app, kind, r) {
  const out = { id: r.id, slug: r.getString('slug'), title: r.getString('title'), status: r.getString('status'), revision: r.getInt('revision'), data: data(r), reviewedBy: r.getString('reviewedBy'), reviewedAt: r.getString('reviewedAt') };
  if (kind === 'objects') Object.assign(out, { domain: r.getString('domain'), modality: r.getString('modality'), summary: r.getString('summary'), tags: u.recJson(r, 'tags', []), assets: r.getStringSlice('assets'), related: r.getStringSlice('related'), legacyQuestions: r.getStringSlice('legacyQuestions') });
  if (kind === 'questions') Object.assign(out, { objects: r.getStringSlice('objects'), asset: r.getString('asset') });
  if (kind === 'pathways') Object.assign(out, { summary: r.getString('summary'), steps: app.findRecordsByFilter('lab_path_steps', 'pathway = {:id}', 'position', 100, 0, { id: r.id }).map((s) => s.getString('object')) });
  return out;
}
function save(app, kind, id, body) {
  const v = validate(kind, body); let out;
  app.runInTransaction((tx) => {
    const r = id ? find(tx, kind, id, false) : new Record(tx.findCollectionByNameOrId(collection(kind)));
    if (id && r.getInt('revision') !== body.revision) fail('Konten telah diubah. Muat ulang sebelum menyimpan.');
    Object.keys(v).filter((k) => k !== 'steps').forEach((k) => r.set(k, v[k]));
    r.set('status', 'draft'); r.set('reviewedBy', ''); r.set('reviewedAt', ''); r.set('revision', r.getInt('revision') + 1); tx.save(r);
    if (kind === 'pathways') {
      tx.findRecordsByFilter('lab_path_steps', 'pathway = {:id}', '', 100, 0, { id: r.id }).forEach((s) => tx.delete(s));
      v.steps.forEach((id, i) => { find(tx, 'objects', id, false); const s = new Record(tx.findCollectionByNameOrId('lab_path_steps')); s.set('pathway', r.id); s.set('object', id); s.set('position', i + 1); tx.save(s); });
    }
    out = adminOut(tx, kind, r);
  }); return out;
}
function publish(app, kind, id, body, admin) {
  if (body.confirmReviewed !== true) fail('Konfirmasi pemeriksaan manusia diperlukan.');
  let out;
  app.runInTransaction((tx) => {
    const r = find(tx, kind, id, false);
    if (r.getInt('revision') !== body.revision) fail('Versi berubah. Muat ulang dan periksa kembali.');
    const v = validate(kind, adminOut(tx, kind, r));
    // Reapply the validated allowlist, including for drafts edited through superuser tooling.
    Object.keys(v).filter((k) => k !== 'steps').forEach((k) => r.set(k, v[k]));
    if (kind === 'assets' && !licenseReady(v.data)) fail('Lisensi belum terverifikasi untuk penggunaan komersial dan redistribusi/atribusi.');
    if (kind === 'objects') r.getStringSlice('assets').forEach((id) => assetOut(tx, id));
    if (kind === 'questions') { r.getStringSlice('objects').forEach((id) => find(tx, 'objects', id, true)); if (r.getString('asset')) assetOut(tx, r.getString('asset')); }
    if (kind === 'pathways') v.steps.forEach((id) => find(tx, 'objects', id, true));
    r.set('status', 'published'); r.set('reviewedBy', admin.id); r.set('reviewedAt', u.nowIso()); r.set('revision', r.getInt('revision') + 1); tx.save(r); out = adminOut(tx, kind, r);
  }); return out;
}
function answer(app, id, body) {
  const q = find(app, 'questions', id, true);
  if (!q.getStringSlice('objects').some((id) => { try { find(app, 'objects', id, true); return true; } catch (_) { return false; } })) throw new NotFoundError('Soal tidak tersedia.');
  questionOut(app, q); const d = data(q); let correct = null;
  if (['single_best_answer', 'image_identification'].includes(d.type)) {
    if (!d.options.some((o) => o.label === body.response)) fail('Pilih jawaban yang tersedia.'); correct = body.response === d.answer;
  } else if (['hotspot', 'select_region'].includes(d.type)) {
    const p = body.response; if (!p || !['x', 'y'].every((k) => typeof p[k] === 'number' && Number.isFinite(p[k]) && p[k] >= 0 && p[k] <= 1)) fail('Pilih titik pada gambar.');
    const r = d.region; correct = p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
  } else { text(body.response, 4000, true); }
  return { correct, selfAssessment: correct === null, answer: d.answer || null, region: d.region || null, explanation: d.explanation };
}
module.exports = { KINDS, TYPES, validate, rect, safeUrl, licenseReady, collection, find, card, assetOut, detail, browse, pathOut, adminOut, save, publish, answer, labResult };
