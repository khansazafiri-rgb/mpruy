// FORMAT MATERI SLIDE MEDCOEL (schemaVersion 1)
//
// Satu berkas materi = beberapa slide. Tiap slide = satu atau lebih gambar (tautan lh3 hasil ubah
// slide PPT) + penjelasan. Penjelasan boleh ditulis sebagai
//   - teks mini-markdown dalam "explanation" (paling mudah untuk GPT/Claude), atau
//   - daftar "blocks" terstruktur (heading, paragraph, list, callout, table, quote, divider).
// Keduanya diubah ke bentuk blok yang sama, jadi tampilan siswa hanya mengenal satu bentuk.
//
// Daftar bersarang ("tab"): indentasi dengan Tab atau spasi membuat butir anak. Nomor 1, 2, 3 tampil
// dengan jorokan gantung (nomor di kiri, teks rapi sejajar), anaknya menjorok lebih dalam dan memakai
// huruf (a, b, c) lalu angka romawi. Emoji ditulis apa adanya di teks.
//
// Aturannya longgar di sisi masuk (alias nama field, JSON atau array JavaScript, kunci tanpa kutip) dan
// ketat di sisi keluar. Teks DIURAI, tidak pernah dijalankan.

const HOOKS = typeof __hooks !== "undefined" ? __hooks : __dirname + "/..";
const format = require(HOOKS + "/lib/format.js");

const SCHEMA_VERSION = 1;
const MAX_SLIDES = 300;
const MAX_IMAGES_PER_SLIDE = 4;
const MAX_TEXT = 4000; // satu teks (paragraf, butir)
const MAX_EXPLANATION = 24000; // seluruh penjelasan satu slide
const MAX_BLOCKS = 80;
const MAX_DEPTH = 5;
const KINDS = ["klinis", "warning", "highyield", "tip", "praktikum", "info"];
const KIND_ALIAS = { penting: "highyield", "high-yield": "highyield", hy: "highyield", jebakan: "warning", peringatan: "warning", catatan: "info", note: "info", klinik: "klinis", clinical: "klinis" };
const LIST_STYLES = ["bullet", "number", "alpha", "check"];

function str(v, max) {
  if (v === undefined || v === null) return "";
  let s = String(v).replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
  s = s.replace(/[ \t]+$/gm, "").trim();
  return s.length > max ? s.slice(0, max) : s;
}

function pick(obj, names) {
  for (let i = 0; i < names.length; i++) {
    if (obj[names[i]] !== undefined && obj[names[i]] !== null && obj[names[i]] !== "") return obj[names[i]];
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Mini-markdown -> blok
// ---------------------------------------------------------------------------

function widthOf(line) {
  let w = 0;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "\t") w += 4;
    else if (c === " ") w += 1;
    else break;
  }
  return w;
}

const LIST_RE = /^[ \t]*(?:([-*•–·])|(\d{1,3})[.)]|([a-z])[.)]|(\[[ xX]\]))[ \t]+(.*)$/;

function listMarker(line) {
  const m = LIST_RE.exec(line);
  if (!m) return null;
  const text = m[5];
  if (m[4]) return { style: "check", checked: /x/i.test(m[4]), text: text, width: widthOf(line) };
  if (m[1]) {
    // "- [ ] teks" tetap daftar centang
    const c = /^\[([ xX])\][ \t]+(.*)$/.exec(text);
    if (c) return { style: "check", checked: /x/i.test(c[1]), text: c[2], width: widthOf(line) };
    return { style: "bullet", text: text, width: widthOf(line) };
  }
  if (m[2]) return { style: "number", start: parseInt(m[2], 10), text: text, width: widthOf(line) };
  return { style: "alpha", text: text, width: widthOf(line) };
}

function isTableRow(line) {
  const t = line.trim();
  return t.length > 2 && t[0] === "|" && t.indexOf("|", 1) > 0;
}
function isTableSep(line) {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line) && line.indexOf("-") >= 0 && line.indexOf("|") >= 0;
}
function cells(line) {
  let t = line.trim();
  if (t[0] === "|") t = t.slice(1);
  if (t[t.length - 1] === "|") t = t.slice(0, -1);
  return t.split("|").map((c) => str(c, 600));
}

function parseMarkdown(text, depth) {
  const lines = String(text === undefined || text === null ? "" : text).replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  const level = depth || 0;
  let para = null;
  let i = 0;

  function flushPara() {
    if (!para) return;
    const t = str(para.lines.join("\n"), MAX_TEXT);
    if (t) {
      const b = { type: "paragraph", text: t };
      if (para.indent) b.indent = para.indent;
      blocks.push(b);
    }
    para = null;
  }

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) { flushPara(); i++; continue; }

    // Pemisah
    if (/^(-{3,}|\*{3,}|_{3,}|═{3,})$/.test(trimmed)) { flushPara(); blocks.push({ type: "divider" }); i++; continue; }

    // Judul
    const h = /^(#{1,4})\s+(.+)$/.exec(trimmed);
    if (h) { flushPara(); blocks.push({ type: "heading", level: Math.min(3, h[1].length), text: str(h[2], 300) }); i++; continue; }

    // Kotak sorot: > [!klinis] Judul, lalu baris > ...
    if (trimmed[0] === ">" && level < MAX_DEPTH) {
      flushPara();
      const inner = [];
      while (i < lines.length && lines[i].trim()[0] === ">") { inner.push(lines[i].trim().replace(/^>\s?/, "")); i++; }
      let kind = "info";
      let title = "";
      const head = /^\[!([\w-]+)\]\s*(.*)$/.exec(inner[0] || "");
      if (head) {
        const k = head[1].toLowerCase();
        kind = KINDS.indexOf(k) >= 0 ? k : KIND_ALIAS[k] || "info";
        title = str(head[2], 160);
        inner.shift();
      }
      const kids = parseMarkdown(inner.join("\n"), level + 1);
      if (head || kids.length > 1 || (kids[0] && kids[0].type !== "paragraph")) {
        blocks.push({ type: "callout", kind: kind, title: title, blocks: kids });
      } else {
        blocks.push({ type: "quote", text: kids[0] ? kids[0].text : "" });
      }
      continue;
    }

    // Tabel
    if (isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      flushPara();
      const headers = cells(line);
      const rows = [];
      i += 2;
      while (i < lines.length && isTableRow(lines[i])) {
        const r = cells(lines[i]);
        while (r.length < headers.length) r.push("");
        rows.push(r.slice(0, Math.max(headers.length, 1)));
        i++;
      }
      blocks.push({ type: "table", headers: headers, rows: rows.slice(0, 60) });
      continue;
    }

    // Daftar (boleh bersarang)
    const mk = listMarker(line);
    if (mk) {
      flushPara();
      const run = [];
      while (i < lines.length) {
        const l = lines[i];
        if (!l.trim()) {
          // baris kosong tunggal di antara butir tetap satu daftar
          let j = i + 1;
          while (j < lines.length && !lines[j].trim()) j++;
          if (j < lines.length && (listMarker(lines[j]) || (widthOf(lines[j]) > 0 && run.length))) { i = j; continue; }
          break;
        }
        run.push(l);
        i++;
      }
      blocks.push.apply(blocks, buildLists(run));
      continue;
    }

    // Paragraf biasa. Baris yang menjorok (tab/spasi) jadi paragraf dengan jorokan.
    const w = widthOf(line);
    const indent = w > 0 ? Math.min(3, Math.ceil(w / 4)) : 0;
    if (para && para.indent !== indent) flushPara();
    if (!para) para = { lines: [], indent: indent };
    para.lines.push(trimmed);
    i++;
  }
  flushPara();
  return blocks;
}

// Mengubah baris-baris daftar (dengan indentasi) menjadi blok daftar bersarang.
function buildLists(run) {
  const out = [];
  const stack = []; // { width, list }
  let last = null; // butir terakhir
  function open(style, width, parentItem, start) {
    const list = { type: "list", style: style, items: [] };
    if (style === "number" && start > 1) list.start = start;
    if (parentItem) (parentItem.children = parentItem.children || []).push(list);
    else out.push(list);
    stack.push({ width: width, list: list });
    return list;
  }
  for (let k = 0; k < run.length; k++) {
    const mk = listMarker(run[k]);
    if (!mk) {
      // lanjutan teks butir sebelumnya
      if (last) last.text = str(last.text + "\n" + run[k].trim(), MAX_TEXT);
      continue;
    }
    while (stack.length && mk.width < stack[stack.length - 1].width - 1 && stack.length > 1) stack.pop();
    let top = stack[stack.length - 1];
    if (!top) {
      top = { width: mk.width, list: open(mk.style, mk.width, null, mk.start) };
    } else if (mk.width >= top.width + 2 && stack.length < MAX_DEPTH && last) {
      top = { width: mk.width, list: open(mk.style, mk.width, last, mk.start) };
    } else if (top.list.style !== mk.style) {
      // gaya berbeda pada tingkat yang sama: daftar baru di tingkat itu
      const parent = stack.length > 1 ? stack[stack.length - 2].list : null;
      stack.pop();
      let parentItem = null;
      if (parent) parentItem = parent.items[parent.items.length - 1];
      top = { width: mk.width, list: open(mk.style, mk.width, parentItem, mk.start) };
    }
    const item = { text: str(mk.text, MAX_TEXT) };
    if (mk.style === "check" && mk.checked) item.checked = true;
    top.list.items.push(item);
    last = item;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Blok terstruktur
// ---------------------------------------------------------------------------

const TYPE_ALIAS = {
  p: "paragraph", text: "paragraph", paragraf: "paragraph", teks: "paragraph", paragraph: "paragraph",
  h: "heading", heading: "heading", judul: "heading", title: "heading", subjudul: "heading",
  list: "list", daftar: "list", ul: "list", ol: "list", bullets: "list", numbered: "list", steps: "list", langkah: "list", checklist: "list",
  callout: "callout", box: "callout", kotak: "callout", note: "callout",
  table: "table", tabel: "table",
  divider: "divider", hr: "divider", garis: "divider",
  quote: "quote", kutipan: "quote",
  markdown: "markdown", md: "markdown",
};

function normItems(raw, style, depth, warn) {
  const items = [];
  const arr = Array.isArray(raw) ? raw : raw === undefined || raw === null ? [] : [raw];
  for (let i = 0; i < arr.length; i++) {
    const it = arr[i];
    if (Array.isArray(it)) {
      // array di dalam array = anak dari butir sebelumnya
      const prev = items[items.length - 1];
      if (!prev) { warn("Array bersarang tanpa butir induk diabaikan."); continue; }
      if (depth + 1 >= MAX_DEPTH) { warn("Daftar terlalu dalam, dipotong."); continue; }
      (prev.children = prev.children || []).push({ type: "list", style: style === "number" ? "alpha" : "bullet", items: normItems(it, style === "number" ? "alpha" : "bullet", depth + 1, warn) });
    } else if (it && typeof it === "object") {
      const text = str(pick(it, ["text", "teks", "isi", "label", "title", "judul"]), MAX_TEXT);
      const item = { text: text };
      if (it.checked === true || it.done === true) item.checked = true;
      const kids = pick(it, ["children", "anak", "items", "sub", "subitems"]);
      if (kids !== undefined && depth + 1 < MAX_DEPTH) {
        const kidStyle = LIST_STYLES.indexOf(it.style) >= 0 ? it.style : style === "number" ? "alpha" : "bullet";
        const arrKids = Array.isArray(kids) && kids.length && typeof kids[0] === "object" && kids[0] && kids[0].type === "list" ? kids : [{ type: "list", style: kidStyle, items: kids }];
        item.children = arrKids.map((b) => ({ type: "list", style: LIST_STYLES.indexOf(b.style) >= 0 ? b.style : kidStyle, items: normItems(b.items, LIST_STYLES.indexOf(b.style) >= 0 ? b.style : kidStyle, depth + 1, warn) })).filter((b) => b.items.length);
      }
      if (text || (item.children && item.children.length)) items.push(item);
    } else {
      const text = str(it, MAX_TEXT);
      if (text) items.push({ text: text });
    }
  }
  return items;
}

function normBlock(raw, depth, warn) {
  if (typeof raw === "string") return parseMarkdown(raw, depth);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const tRaw = String(raw.type || raw.tipe || (raw.items ? "list" : raw.headers || raw.rows ? "table" : raw.text !== undefined ? "paragraph" : "")).toLowerCase();
  const type = TYPE_ALIAS[tRaw];
  if (!type) { warn("Jenis blok tidak dikenal: " + tRaw + " (diabaikan)."); return []; }
  if (type === "markdown") return parseMarkdown(pick(raw, ["text", "teks", "content", "isi"]), depth);
  if (type === "divider") return [{ type: "divider" }];
  if (type === "heading") {
    const text = str(pick(raw, ["text", "teks", "title", "judul"]), 300);
    if (!text) return [];
    let lv = parseInt(raw.level || raw.tingkat || 2, 10);
    if (!(lv >= 1 && lv <= 3)) lv = lv > 3 ? 3 : 2;
    const b = { type: "heading", level: lv, text: text };
    return [b];
  }
  if (type === "paragraph" || type === "quote") {
    const text = str(pick(raw, ["text", "teks", "isi", "content"]), MAX_TEXT);
    if (!text) return [];
    const b = { type: type, text: text };
    const ind = parseInt(raw.indent || raw.tab || raw.jorok || 0, 10);
    if (type === "paragraph" && ind > 0) b.indent = Math.min(3, ind);
    return [b];
  }
  if (type === "list") {
    let style = String(raw.style || raw.gaya || "").toLowerCase();
    if (tRaw === "ol" || tRaw === "numbered" || tRaw === "steps" || tRaw === "langkah" || raw.ordered === true) style = style || "number";
    if (tRaw === "checklist") style = style || "check";
    if (style === "numbered" || style === "ordered" || style === "angka" || style === "decimal") style = "number";
    if (style === "letters" || style === "huruf") style = "alpha";
    if (LIST_STYLES.indexOf(style) < 0) style = "bullet";
    const items = normItems(pick(raw, ["items", "butir", "isi", "list"]), style, depth, warn);
    if (!items.length) return [];
    const b = { type: "list", style: style, items: items };
    const st = parseInt(raw.start, 10);
    if (style === "number" && st > 1) b.start = st;
    return [b];
  }
  if (type === "callout") {
    const k = String(raw.kind || raw.jenis || raw.variant || "info").toLowerCase();
    const kind = KINDS.indexOf(k) >= 0 ? k : KIND_ALIAS[k] || "info";
    const inner = pick(raw, ["blocks", "content", "isi", "body"]);
    const textInner = pick(raw, ["text", "teks"]);
    let kids = [];
    if (depth >= MAX_DEPTH) return [];
    if (Array.isArray(inner)) inner.forEach((x) => { kids = kids.concat(normBlock(x, depth + 1, warn)); });
    else if (typeof inner === "string") kids = parseMarkdown(inner, depth + 1);
    if (!kids.length && textInner) kids = parseMarkdown(String(textInner), depth + 1);
    const b = { type: "callout", kind: kind, title: str(pick(raw, ["title", "judul"]), 160), blocks: kids };
    const icon = str(raw.icon || raw.emoji, 8);
    if (icon) b.icon = icon;
    if (!b.title && !kids.length) return [];
    return [b];
  }
  if (type === "table") {
    let headers = Array.isArray(raw.headers || raw.kolom) ? (raw.headers || raw.kolom).map((c) => str(c, 600)) : [];
    let rows = Array.isArray(raw.rows || raw.baris) ? (raw.rows || raw.baris) : [];
    rows = rows.filter((r) => Array.isArray(r)).slice(0, 60).map((r) => r.map((c) => str(c, 600)));
    if (!headers.length && rows.length) headers = rows.shift();
    if (!headers.length) return [];
    return [{ type: "table", headers: headers, rows: rows.map((r) => { const x = r.slice(0, headers.length); while (x.length < headers.length) x.push(""); return x; }) }];
  }
  return [];
}

function normBlocks(raw, warn) {
  let out = [];
  const arr = Array.isArray(raw) ? raw : raw === undefined || raw === null ? [] : [raw];
  arr.forEach((b) => { out = out.concat(normBlock(b, 0, warn)); });
  return out;
}

// ---------------------------------------------------------------------------
// Slide dan berkas
// ---------------------------------------------------------------------------

function imageUrl(v, errs) {
  const s = String(v === undefined || v === null ? "" : v).trim();
  if (!s) return "";
  const url = format.driveToLh3(s);
  if (!url || url.indexOf("https://lh3.googleusercontent.com/") !== 0) {
    errs.push("Gambar harus tautan lh3.googleusercontent.com atau tautan berbagi Google Drive: " + s.slice(0, 80));
    return "";
  }
  return url.length > 400 ? "" : url;
}

function plainOf(blocks) {
  let out = "";
  (function walk(list) {
    (list || []).forEach((b) => {
      if (b.text) out += b.text + "\n";
      if (b.title) out += b.title + "\n";
      if (b.items) b.items.forEach((it) => { out += it.text + "\n"; if (it.children) walk(it.children); });
      if (b.blocks) walk(b.blocks);
      if (b.rows) b.rows.forEach((r) => { out += r.join(" ") + "\n"; });
    });
  })(blocks);
  return out;
}

function normSlide(raw, index, ctx) {
  const errs = [];
  const warns = [];
  const warn = (m) => warns.push(m);
  if (typeof raw === "string") raw = { explanation: raw };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { errors: ["Slide harus berupa objek."], warnings: [] };

  const images = [];
  const one = pick(raw, ["image", "gambar", "imageUrl", "url", "lh3", "link", "src"]);
  if (one !== undefined) { const u = imageUrl(one, errs); if (u) images.push(u); }
  const many = pick(raw, ["images", "gambarList", "gambar_list", "gambars"]);
  if (Array.isArray(many)) many.forEach((x) => { const u = imageUrl(x, errs); if (u && images.indexOf(u) < 0) images.push(u); });
  if (images.length > MAX_IMAGES_PER_SLIDE) { warn("Satu slide paling banyak " + MAX_IMAGES_PER_SLIDE + " gambar; sisanya dibuang."); images.length = MAX_IMAGES_PER_SLIDE; }

  let blocks = [];
  const given = pick(raw, ["blocks", "konten", "content", "isi"]);
  if (Array.isArray(given)) blocks = blocks.concat(normBlocks(given, warn));
  const expl = pick(raw, ["explanation", "penjelasan", "text", "teks", "keterangan", "pembahasan", "notes", "catatan", "description"]);
  if (typeof expl === "string") blocks = blocks.concat(parseMarkdown(expl, 0));
  else if (Array.isArray(expl)) blocks = blocks.concat(normBlocks(expl, warn));
  else if (typeof given === "string") blocks = blocks.concat(parseMarkdown(given, 0));

  if (blocks.length > MAX_BLOCKS) { warn("Penjelasan terlalu banyak blok; dipotong menjadi " + MAX_BLOCKS + "."); blocks = blocks.slice(0, MAX_BLOCKS); }
  const plain = plainOf(blocks);
  if (plain.length > MAX_EXPLANATION) errs.push("Penjelasan slide terlalu panjang (" + plain.length + " karakter, batas " + MAX_EXPLANATION + ").");

  const title = str(pick(raw, ["title", "judul", "heading", "nama"]), 200);
  if (!images.length && !blocks.length) errs.push("Slide kosong: isi gambar atau penjelasan.");
  if (images.length && !blocks.length && !(ctx && ctx.allowNoExplanation)) warn("Slide belum punya penjelasan.");
  return { slide: { title: title, images: images, blocks: blocks }, errors: errs, warnings: warns };
}

// Mengurai masukan (teks atau objek) menjadi berkas materi ternormalisasi.
// ctx: { allowNoExplanation }
function parseDeck(input, ctx) {
  const out = { ok: false, deck: null, items: [], blocked: false, warnings: [], slideCount: 0 };
  let data = input;
  if (typeof input === "string") {
    try { data = format.parseLoose(input); } catch (err) {
      out.items.push({ index: 0, errors: ["Teks tidak dapat dibaca sebagai JSON: " + (err && err.message ? err.message : String(err))] });
      out.blocked = true;
      return out;
    }
  }
  let slidesRaw;
  let meta = {};
  if (Array.isArray(data)) slidesRaw = data;
  else if (data && typeof data === "object") {
    meta = data;
    slidesRaw = pick(data, ["slides", "slide", "halaman", "pages", "materi"]);
    if (!Array.isArray(slidesRaw) && Array.isArray(data.materi && data.materi.slides)) { meta = data.materi; slidesRaw = data.materi.slides; }
  }
  if (!Array.isArray(slidesRaw)) {
    out.items.push({ index: 0, errors: ["Tidak menemukan daftar slide. Tulis { \"title\": ..., \"slides\": [ { \"image\": ..., \"explanation\": ... } ] }."] });
    out.blocked = true;
    return out;
  }
  if (!slidesRaw.length) { out.items.push({ index: 0, errors: ["Daftar slide kosong."] }); out.blocked = true; return out; }
  if (slidesRaw.length > MAX_SLIDES) { out.items.push({ index: 0, errors: ["Satu berkas paling banyak " + MAX_SLIDES + " slide."] }); out.blocked = true; return out; }

  const slides = [];
  slidesRaw.forEach((r, i) => {
    const s = normSlide(r, i, ctx);
    if (s.errors.length) out.items.push({ index: i + 1, errors: s.errors });
    s.warnings.forEach((w) => out.warnings.push("Slide " + (i + 1) + ": " + w));
    if (s.slide && !s.errors.length) slides.push(s.slide);
  });
  slides.forEach((s, i) => { s.n = i + 1; });
  const title = str(pick(meta, ["title", "judul", "nama", "name"]), 200);
  const lang = ["id", "en", "both"].indexOf(meta.language) >= 0 ? meta.language : "id";
  out.deck = {
    schemaVersion: SCHEMA_VERSION,
    type: "materi",
    title: title,
    description: str(pick(meta, ["description", "deskripsi", "ringkasan", "summary"]), 600),
    language: lang,
    slides: slides,
  };
  out.slideCount = slides.length;
  out.blocked = out.items.length > 0;
  out.ok = !out.blocked;
  if (!title) out.warnings.push("Judul materi belum diisi; dipakai nama berkas atau judul bawaan.");
  return out;
}

module.exports = { SCHEMA_VERSION, MAX_SLIDES, KINDS, LIST_STYLES, parseMarkdown, normBlocks, parseDeck, plainOf };
