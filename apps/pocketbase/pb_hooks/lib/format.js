// FORMAT SOAL MEDCOEL (schemaVersion 1)
//
// Satu pintu untuk semua jalan masuk soal: form Edit Soal, tempel kode atau
// unggah file JSON di dashboard, dan impor oleh Hermes Agent. Aturannya longgar
// di sisi masuk dan ketat di sisi keluar:
//
// - Menerima JSON murni maupun array JavaScript (kunci tanpa tanda kutip,
//   kutip tunggal, koma di akhir, komentar). Teks DIURAI, tidak pernah
//   dijalankan sebagai kode, jadi aman dipakai untuk kiriman agen.
// - Bentuk atas boleh berupa array soal, { questions: [...] }, atau
//   { chapters: [{ title, questions: [...] }] }.
// - Field wajib seminimal mungkin: teks soal, tipe (boleh ditebak), opsi atau
//   jawaban, dan kunci. Field lain opsional. Field yang tidak dikenal diabaikan
//   dan dicatat sebagai peringatan, tidak membuat impor gagal.
// - Nama field lama dari PCV Classroom, Web Olimp, dan Event/Lomba diterima
//   sebagai alias.
// - Teks soal, opsi, dan pembahasan boleh berupa teks biasa atau daftar blok
//   konten kaya (lihat docs/FORMAT_SOAL.md).
//
// Keluaran normalizeQuestion() adalah bentuk yang disimpan di collection
// questions.

const HOOKS = typeof __hooks !== "undefined" ? __hooks : __dirname + "/..";
const { fixText } = require(HOOKS + "/lib/textRepair.js");

const SCHEMA_VERSION = 1;
const LETTERS = ["A", "B", "C", "D", "E"];

// Kombinasi baku soal tipe K.
const K_COMBOS = {
  A: [1, 2, 3],
  B: [1, 3],
  C: [2, 4],
  D: [4],
  E: [1, 2, 3, 4],
};
const K_OPTION_TEXT = {
  A: "(1), (2), dan (3) benar",
  B: "(1) dan (3) benar",
  C: "(2) dan (4) benar",
  D: "Hanya (4) benar",
  E: "Semua benar",
};

// ---------------------------------------------------------------------------
// Parser JSON longgar
// ---------------------------------------------------------------------------

function stripWrapper(text) {
  let s = String(text === undefined || text === null ? "" : text);
  // BOM
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  s = s.trim();
  s = s.replace(/^```[a-zA-Z]*\s*/, "").replace(/```\s*$/, "").trim();
  s = s
    .replace(/^(?:module\.exports\s*=\s*|export\s+default\s+|(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*)/, "")
    .replace(/;\s*$/, "")
    .trim();
  return s;
}

function parseLoose(text) {
  const src = stripWrapper(text);
  if (!src) throw new Error("Isinya masih kosong.");
  let i = 0;
  let line = 1;

  const fail = (msg) => {
    throw new Error(msg + " (baris " + line + ")");
  };
  const peek = () => src[i];
  const next = () => {
    const c = src[i++];
    if (c === "\n") line++;
    return c;
  };

  function skip() {
    for (;;) {
      const c = src[i];
      if (c === undefined) return;
      if (c === " " || c === "\t" || c === "\r" || c === "\n" || c === " " || c === "﻿") { next(); continue; }
      if (c === "/" && src[i + 1] === "/") {
        while (src[i] !== undefined && src[i] !== "\n") i++;
        continue;
      }
      if (c === "/" && src[i + 1] === "*") {
        i += 2;
        while (src[i] !== undefined && !(src[i] === "*" && src[i + 1] === "/")) next();
        i += 2;
        continue;
      }
      return;
    }
  }

  function parseString() {
    const quote = next();
    let out = "";
    for (;;) {
      const c = next();
      if (c === undefined) fail("Tanda kutip " + quote + " tidak ditutup");
      if (c === quote) return out;
      if (quote === "`" && c === "$" && src[i] === "{") fail("Template ${...} tidak didukung, tulis teksnya langsung");
      if (c === "\\") {
        const d = next();
        if (d === "n") out += "\n";
        else if (d === "t") out += "\t";
        else if (d === "r") out += "\r";
        else if (d === "b") out += "\b";
        else if (d === "f") out += "\f";
        else if (d === "u") {
          const hex = src.slice(i, i + 4);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) fail("Kode \\u tidak sah");
          out += String.fromCharCode(parseInt(hex, 16));
          i += 4;
        } else if (d === "\n") {
          // lanjutan baris
        } else out += d;
        continue;
      }
      out += c;
    }
  }

  function parseNumber() {
    const m = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/.exec(src.slice(i));
    if (!m) fail("Angka tidak sah");
    i += m[0].length;
    return Number(m[0]);
  }

  function parseIdent() {
    const m = /^[A-Za-z_$][\w$]*/.exec(src.slice(i));
    if (!m) fail("Ada karakter yang tidak dikenali: '" + src[i] + "'");
    i += m[0].length;
    return m[0];
  }

  function parseValue() {
    skip();
    const c = peek();
    if (c === "{") return parseObject();
    if (c === "[") return parseArray();
    if (c === '"' || c === "'" || c === "`") return parseString();
    if (c === "-" || c === "+" || c === "." || (c >= "0" && c <= "9")) return parseNumber();
    if (c === undefined) fail("Isinya terpotong");
    const id = parseIdent();
    if (id === "true") return true;
    if (id === "false") return false;
    if (id === "null" || id === "undefined") return null;
    fail("Nilai '" + id + "' tidak dikenali. Teks harus diapit tanda kutip");
  }

  function parseArray() {
    next();
    const out = [];
    for (;;) {
      skip();
      if (peek() === "]") { next(); return out; }
      out.push(parseValue());
      skip();
      const c = peek();
      if (c === ",") { next(); continue; }
      if (c === "]") { next(); return out; }
      fail("Daftar [ ... ] kurang koma atau tidak ditutup");
    }
  }

  function parseObject() {
    next();
    const out = {};
    for (;;) {
      skip();
      if (peek() === "}") { next(); return out; }
      let key;
      const c = peek();
      if (c === '"' || c === "'" || c === "`") key = parseString();
      else if (c >= "0" && c <= "9") key = String(parseNumber());
      else key = parseIdent();
      skip();
      if (peek() !== ":") fail("Setelah nama field '" + key + "' harus ada titik dua");
      next();
      out[key] = parseValue();
      skip();
      const d = peek();
      if (d === ",") { next(); continue; }
      if (d === "}") { next(); return out; }
      fail("Objek { ... } kurang koma atau tidak ditutup setelah field '" + key + "'");
    }
  }

  const value = parseValue();
  skip();
  if (i < src.length) fail("Ada teks lain setelah data selesai");
  return value;
}

// ---------------------------------------------------------------------------
// Link gambar Google Drive -> lh3
// ---------------------------------------------------------------------------

function driveToLh3(url) {
  const s = String(url || "").trim();
  if (!s) return "";
  if (s.indexOf("https://lh3.googleusercontent.com/") === 0) return s;
  const m =
    s.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]{10,})/) ||
    s.match(/drive\.google\.com\/(?:open|uc|thumbnail)\?(?:[^#]*&)?id=([A-Za-z0-9_-]{10,})/) ||
    s.match(/docs\.google\.com\/[^?]*[?&]id=([A-Za-z0-9_-]{10,})/);
  if (m) return "https://lh3.googleusercontent.com/d/" + m[1];
  if (/^[A-Za-z0-9_-]{25,}$/.test(s)) return "https://lh3.googleusercontent.com/d/" + s;
  return s;
}

function safeUrl(url) {
  const s = driveToLh3(url);
  return /^https?:\/\//i.test(s) ? s : "";
}

// ---------------------------------------------------------------------------
// Konten kaya
// ---------------------------------------------------------------------------

const BLOCK_ALIAS = {
  paragraph: "paragraph", p: "paragraph", text: "paragraph", paragraf: "paragraph", teks: "paragraph",
  heading: "heading", h: "heading", judul: "heading", title: "heading",
  list: "list", ul: "list", ol: "list", bullets: "list", bullet: "list", numbered: "list", daftar: "list",
  table: "table", tabel: "table",
  image: "image", img: "image", gambar: "image", picture: "image",
  note: "note", callout: "note", box: "note", catatan: "note", highyield: "note", "high-yield": "note", warning: "note", peringatan: "note",
  formula: "formula", math: "formula", rumus: "formula", equation: "formula",
  link: "link", tautan: "link", url: "link",
};

const NOTE_VARIANTS = ["highyield", "warning", "info", "tip"];

function str(v) {
  if (v === undefined || v === null) return "";
  if (typeof v === "string") return fixText(v);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

// Menormalkan satu bidang konten (teks biasa atau daftar blok).
// warn(msg) dipanggil untuk hal yang dilewati. Mengembalikan string atau array.
function normalizeContent(value, warn, where) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string" || typeof value === "number") return str(value);
  if (Array.isArray(value)) {
    const blocks = [];
    value.forEach((b, i) => {
      const nb = normalizeBlock(b, warn, where + " blok " + (i + 1));
      if (nb) blocks.push(nb);
    });
    if (!blocks.length) return "";
    // Satu paragraf polos cukup disimpan sebagai teks biasa.
    if (blocks.length === 1 && blocks[0].type === "paragraph") return blocks[0].text;
    return blocks;
  }
  if (typeof value === "object") {
    // { blocks: [...] } atau satu blok saja.
    if (Array.isArray(value.blocks)) return normalizeContent(value.blocks, warn, where);
    if (value.type) {
      const nb = normalizeBlock(value, warn, where);
      return nb ? (nb.type === "paragraph" ? nb.text : [nb]) : "";
    }
    if (value.text !== undefined) return str(value.text);
  }
  warn(where + ": bentuk konten tidak dikenali, dilewati.");
  return "";
}

function contentToPlain(c) {
  if (!c) return "";
  if (typeof c === "string") return c;
  if (!Array.isArray(c)) return "";
  return c
    .map((b) => {
      if (b.type === "list") return b.items.map(contentToPlain).join(" ");
      if (b.type === "table") return b.rows.map((r) => r.map((cell) => contentToPlain(cell.text || "")).join(" ")).join(" ");
      if (b.type === "note") return contentToPlain(b.content);
      return b.text || b.caption || "";
    })
    .join(" ");
}

function isEmptyContent(c) {
  return !contentToPlain(c).replace(/<[^>]+>/g, "").trim() && !(Array.isArray(c) && c.some((b) => b.type === "image"));
}

function normalizeCell(cell, warn, where) {
  if (cell === undefined || cell === null) return { text: "" };
  if (typeof cell === "string" || typeof cell === "number") return { text: str(cell) };
  if (typeof cell === "object") {
    const out = {};
    const img = cell.image || cell.imageUrl || cell.url || cell.gambar;
    if (img) {
      const u = safeUrl(img);
      if (u) out.image = u;
      else warn(where + ": tautan gambar sel tidak sah, dilewati.");
    }
    out.text = normalizeContent(cell.text !== undefined ? cell.text : cell.content, warn, where);
    if (cell.caption) out.caption = str(cell.caption);
    return out;
  }
  return { text: "" };
}

function normalizeBlock(b, warn, where) {
  if (b === undefined || b === null) return null;
  if (typeof b === "string" || typeof b === "number") {
    const t = str(b);
    return t ? { type: "paragraph", text: t } : null;
  }
  if (typeof b !== "object" || Array.isArray(b)) {
    warn(where + ": bukan blok, dilewati.");
    return null;
  }
  const rawType = String(b.type || b.kind || b.jenis || "paragraph").toLowerCase();
  const type = BLOCK_ALIAS[rawType];
  if (!type) {
    const t = str(b.text || b.content);
    warn(where + ": tipe blok '" + rawType + "' belum didukung" + (t ? ", ditampilkan sebagai paragraf." : ", dilewati."));
    return t ? { type: "paragraph", text: t } : null;
  }

  if (type === "paragraph" || type === "heading" || type === "formula") {
    const t = str(b.text !== undefined ? b.text : b.content !== undefined ? b.content : b.value);
    if (!t) return null;
    return { type: type, text: t };
  }

  if (type === "list") {
    const raw = b.items || b.list || b.content || [];
    if (!Array.isArray(raw)) {
      warn(where + ": daftar harus berisi items: [ ... ], dilewati.");
      return null;
    }
    const items = raw.map((it, k) => normalizeContent(it, warn, where + " butir " + (k + 1))).filter((it) => !isEmptyContent(it));
    if (!items.length) return null;
    const ordered = b.ordered === true || rawType === "ol" || rawType === "numbered" || b.style === "numbered";
    return { type: "list", ordered: ordered, items: items };
  }

  if (type === "table") {
    let rows = b.rows || b.data || b.cells || [];
    if (!Array.isArray(rows)) rows = [];
    const header = Array.isArray(b.header) || Array.isArray(b.headers) ? b.header || b.headers : null;
    if (header) rows = [header].concat(rows);
    const norm = rows
      .filter((r) => Array.isArray(r))
      .map((r, ri) => r.map((cell, ci) => normalizeCell(cell, warn, where + " sel " + (ri + 1) + "," + (ci + 1))));
    if (!norm.length) {
      warn(where + ": tabel tanpa baris, dilewati.");
      return null;
    }
    let headerMode = "none";
    const h = typeof b.header === "string" ? b.header : typeof b.headerMode === "string" ? b.headerMode : "";
    if (header) headerMode = "row";
    else if (["row", "column", "both", "none"].indexOf(h) >= 0) headerMode = h;
    else if (h === "kolom") headerMode = "column";
    else if (h === "baris") headerMode = "row";
    else if (b.headerRow === true) headerMode = b.headerColumn === true ? "both" : "row";
    else if (b.headerColumn === true) headerMode = "column";
    const out = { type: "table", header: headerMode, rows: norm };
    if (b.caption) out.caption = str(b.caption);
    return out;
  }

  if (type === "image") {
    const u = safeUrl(b.url || b.src || b.image || b.imageUrl || b.link || "");
    if (!u) {
      warn(where + ": gambar tanpa tautan yang sah, dilewati.");
      return null;
    }
    const out = { type: "image", url: u };
    if (b.caption || b.keterangan) out.caption = str(b.caption || b.keterangan);
    const w = b.width || b.lebar;
    if (typeof w === "number" && w >= 10 && w <= 100) out.width = Math.round(w);
    else if (typeof w === "string") {
      const pct = parseInt(w, 10);
      if (pct >= 10 && pct <= 100) out.width = pct;
      else if (w === "small" || w === "kecil") out.width = 40;
      else if (w === "medium" || w === "sedang") out.width = 70;
      else if (w === "full" || w === "penuh") out.width = 100;
    }
    return out;
  }

  if (type === "note") {
    let variant = String(b.variant || b.style || b.tone || "").toLowerCase();
    if (rawType === "highyield" || rawType === "high-yield") variant = "highyield";
    if (rawType === "warning" || rawType === "peringatan") variant = "warning";
    if (variant === "high-yield" || variant === "high_yield") variant = "highyield";
    if (NOTE_VARIANTS.indexOf(variant) < 0) variant = "info";
    const content = normalizeContent(b.content !== undefined ? b.content : b.text !== undefined ? b.text : b.blocks, warn, where);
    if (isEmptyContent(content)) return null;
    const out = { type: "note", variant: variant, content: content };
    if (b.title || b.judul) out.title = str(b.title || b.judul);
    return out;
  }

  if (type === "link") {
    const u = safeUrl(b.url || b.href || b.link || "");
    if (!u) {
      warn(where + ": tautan tidak sah, dilewati.");
      return null;
    }
    return { type: "link", url: u, text: str(b.text || b.label || u) };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Normalisasi satu soal
// ---------------------------------------------------------------------------

// Field yang dikenali, termasuk alias lama. Selain ini dicatat sebagai
// "field tidak dikenal".
const KNOWN = [
  "schemaVersion", "id", "code", "kode", "no", "nomor", "number",
  "type", "qtype", "tipe", "questionType", "jenis",
  "difficulty", "tingkat", "level", "kesulitan",
  "questionText", "text", "soal", "pertanyaan", "question", "stem", "vignette",
  "image", "imageUrl", "gambar", "img",
  "options", "choices", "opsi", "pilihan",
  "optionA", "optionB", "optionC", "optionD", "optionE", "a", "b", "c", "d", "e", "A", "B", "C", "D", "E",
  "correctAnswer", "answer", "kunci", "jawaban", "key", "correct",
  "statements", "pernyataan", "trueStatements", "benar",
  "subQuestions", "subquestions", "sub", "isian", "validAnswers", "answers",
  "explanation", "pembahasan", "penjelasan", "distractors", "reasoning",
  "hint", "petunjuk",
  "chapter", "bab", "chapterTitle", "topic", "topik",
  "scope", "campus", "campuses", "kampus",
  "subject", "mataKuliah", "year", "tahun", "order",
  // Field Web Olimp yang tidak dipakai tapi sering ikut tertempel.
  "testedConcept", "blueprint", "references", "referensi", "verification", "sources",
];

function first(item, keys) {
  for (const k of keys) {
    if (item[k] !== undefined && item[k] !== null && item[k] !== "") return item[k];
  }
  return undefined;
}

function normType(raw, item) {
  const t = String(raw || "").toLowerCase().replace(/[\s-]+/g, "_");
  if (["a", "tipe_a", "type_a", "mcq", "mcq_img", "pg", "pilihan_ganda", "single", "multiple_choice"].indexOf(t) >= 0) return "A";
  if (["k", "tipe_k", "type_k", "mtf", "kombinasi", "k_type"].indexOf(t) >= 0) return "K";
  if (["isian", "isian_img", "short", "short_answer", "isian_singkat", "fill"].indexOf(t) >= 0) return "isian";
  if (["esai", "esai_img", "essay", "uraian"].indexOf(t) >= 0) return "esai";
  if (t) return "";
  // Tebak dari isinya.
  if (Array.isArray(item.statements) || Array.isArray(item.pernyataan)) return "K";
  if (Array.isArray(item.subQuestions) || Array.isArray(item.subquestions)) return "isian";
  return "A";
}

function normDifficulty(raw) {
  const t = String(raw === undefined || raw === null ? "" : raw).toLowerCase().trim();
  if (["easy", "mudah", "gampang", "1", "e"].indexOf(t) >= 0) return "easy";
  if (["medium", "sedang", "menengah", "2", "m", "moderate"].indexOf(t) >= 0) return "medium";
  if (["hard", "sulit", "susah", "3", "h", "difficult"].indexOf(t) >= 0) return "hard";
  return "";
}

function letterFrom(raw, optionTexts) {
  if (raw === undefined || raw === null) return "";
  const s = String(raw).trim();
  if (!s) return "";
  const up = s.toUpperCase().replace(/[^A-E0-9]/g, "");
  if (up.length === 1 && LETTERS.indexOf(up) >= 0) return up;
  const n = Number(s);
  if (Number.isInteger(n) && n >= 1 && n <= 5) return LETTERS[n - 1];
  const tidy = (t) => contentToPlain(t).trim().toLowerCase().replace(/\s+/g, " ");
  const want = tidy(s);
  for (let k = 0; k < optionTexts.length; k++) {
    if (optionTexts[k] && tidy(optionTexts[k]) === want) return LETTERS[k];
  }
  return "";
}

// Pembahasan bentuk Web Olimp: { reasoning, correctStatement, distractors: {A..}, pearl, ... }
function olimpExplanation(ex, warn, where) {
  const blocks = [];
  const reasoning = ex.reasoning || ex.correctStatement || ex.alasan || ex.text;
  if (reasoning) blocks.push(normalizeContent(reasoning, warn, where));
  const extra = ex.pearl || ex.highYield || ex.highYieldPearl || ex.clinicalConnection;
  if (extra) blocks.push([{ type: "note", variant: "highyield", content: normalizeContent(extra, warn, where) }]);
  const flat = [];
  blocks.forEach((b) => {
    if (typeof b === "string") { if (b) flat.push({ type: "paragraph", text: b }); }
    else if (Array.isArray(b)) b.forEach((x) => flat.push(x));
  });
  if (!flat.length) return "";
  return flat.length === 1 && flat[0].type === "paragraph" ? flat[0].text : flat;
}

function normalizeSub(sub, k, qtype, warn, errors, where) {
  if (!sub || typeof sub !== "object") {
    errors.push(where + " sub-pertanyaan " + (k + 1) + " bukan objek.");
    return null;
  }
  const label = str(sub.label || sub.huruf || LETTERS[k] || String(k + 1));
  const question = str(sub.question || sub.pertanyaan || sub.text || "");
  let valid = sub.validAnswers || sub.answers || sub.jawaban || sub.answer || sub.kunci || [];
  if (typeof valid === "string") valid = valid.split(/\r?\n/);
  if (!Array.isArray(valid)) valid = [valid];
  valid = valid.map(str).map((s) => s.trim()).filter(Boolean);
  if (qtype === "isian" && !valid.length) {
    errors.push(where + " sub-pertanyaan " + label + " belum punya kunci (validAnswers).");
  }
  const out = { label: label, question: question, validAnswers: valid };
  const n = parseInt(sub.answerCount, 10);
  if (qtype === "isian" && Number.isFinite(n) && n > 1) out.answerCount = Math.min(n, 20);
  const ex = sub.explanation || sub.pembahasan;
  if (ex) out.explanation = normalizeContent(ex, warn, where + " pembahasan " + label);
  if (qtype === "esai") {
    let kp = sub.keyPoints || sub.poin || [];
    if (typeof kp === "string") kp = kp.split(/\r?\n/);
    if (Array.isArray(kp) && kp.length) out.keyPoints = kp.map(str).filter(Boolean);
    if (sub.keyPointsTitle) out.keyPointsTitle = str(sub.keyPointsTitle);
  }
  return out;
}

// Mengembalikan { question, errors, warnings }. question null bila ada error.
function normalizeQuestion(input, ctx) {
  const c = ctx || {};
  const errors = [];
  const warnings = [];
  const warn = (m) => warnings.push(m);

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { question: null, errors: ["Bukan objek soal { ... }."], warnings: warnings };
  }

  // Amplop lama PCV Classroom: options = { qtype, imageUrl, choices, subQuestions, explanation }
  let item = input;
  if (item.options && typeof item.options === "object" && !Array.isArray(item.options) && (item.options.qtype || item.options.choices || item.options.subQuestions)) {
    const env = item.options;
    item = Object.assign({}, item, {
      qtype: item.qtype || env.qtype,
      imageUrl: item.imageUrl || env.imageUrl,
      options: env.choices || [],
      subQuestions: env.subQuestions,
      explanation: item.explanation || env.explanation,
    });
  }

  const unknown = Object.keys(item).filter((k) => KNOWN.indexOf(k) < 0);
  if (unknown.length) warn("Field tidak dikenal diabaikan: " + unknown.join(", ") + ".");

  const sv = item.schemaVersion !== undefined ? Number(item.schemaVersion) : c.schemaVersion || SCHEMA_VERSION;
  if (sv > SCHEMA_VERSION) warn("schemaVersion " + sv + " lebih baru dari yang dikenal web (" + SCHEMA_VERSION + "); field baru diabaikan.");

  const rawType = first(item, ["qtype", "type", "tipe", "questionType", "jenis"]);
  const qtype = normType(rawType, item);
  if (!qtype) {
    errors.push("Tipe soal '" + rawType + "' tidak dikenal. Pakai A, K, isian, atau esai.");
  }
  if (qtype && c.allowedTypes && c.allowedTypes.indexOf(qtype) < 0) {
    errors.push("Tipe " + qtype + " tidak diterima di sini.");
  }

  const stem = normalizeContent(first(item, ["stem", "questionText", "text", "soal", "pertanyaan", "question", "vignette"]), warn, "Teks soal");
  if (isEmptyContent(stem)) errors.push("Teks soal kosong (questionText atau text).");

  const diffRaw = first(item, ["difficulty", "tingkat", "level", "kesulitan"]);
  let difficulty = normDifficulty(diffRaw);
  if (!difficulty) {
    difficulty = c.defaultDifficulty || "medium";
    if (diffRaw !== undefined) warn("Tingkat kesulitan '" + diffRaw + "' tidak dikenal, dipakai " + difficulty + ".");
    else warn("Tingkat kesulitan tidak diisi, dipakai " + difficulty + ".");
  }

  const out = {
    qtype: qtype || "A",
    difficulty: difficulty,
    stem: stem,
    image: safeUrl(first(item, ["imageUrl", "image", "gambar", "img"]) || ""),
    statements: [],
    options: [],
    answer: "",
    subQuestions: [],
    explanation: "",
    hint: str(first(item, ["hint", "petunjuk"]) || ""),
    chapterTitle: str(first(item, ["chapter", "bab", "chapterTitle", "topic", "topik"]) || c.chapterTitle || "").trim(),
    code: str(first(item, ["code", "kode", "id"]) || "").slice(0, 100),
  };
  const rawImg = first(item, ["imageUrl", "image", "gambar", "img"]);
  if (rawImg && !out.image) warn("Tautan gambar soal tidak sah, dilewati.");

  // Pembahasan umum
  let rawEx = first(item, ["explanation", "pembahasan", "penjelasan"]);
  let distractors = item.distractors || null;
  if (rawEx && typeof rawEx === "object" && !Array.isArray(rawEx) && !rawEx.type && !rawEx.blocks) {
    distractors = rawEx.distractors || distractors;
    out.explanation = olimpExplanation(rawEx, warn, "Pembahasan");
  } else if (rawEx !== undefined) {
    out.explanation = normalizeContent(rawEx, warn, "Pembahasan");
  } else if (item.reasoning) {
    out.explanation = normalizeContent(item.reasoning, warn, "Pembahasan");
  }

  if (out.qtype === "A" || out.qtype === "K") {
    // Pernyataan tipe K
    if (out.qtype === "K") {
      let st = first(item, ["statements", "pernyataan"]);
      if (!Array.isArray(st)) st = [];
      out.statements = st.map((s, k) => normalizeContent(s, warn, "Pernyataan " + (k + 1)));
      if (out.statements.length !== 4 || out.statements.some(isEmptyContent)) {
        errors.push("Soal tipe K butuh tepat 4 pernyataan yang terisi (statements).");
      }
    }

    // Opsi
    let rawOpts = first(item, ["options", "choices", "opsi", "pilihan"]);
    const opts = [];
    const optEx = [];
    let flagged = [];
    if (Array.isArray(rawOpts) && rawOpts.length) {
      if (rawOpts.length > 5) errors.push("Ada " + rawOpts.length + " pilihan, paling banyak 5 (A-E).");
      rawOpts.slice(0, 5).forEach((o, k) => {
        if (o && typeof o === "object" && !Array.isArray(o) && !o.type) {
          opts.push(normalizeContent(o.text !== undefined ? o.text : o.teks !== undefined ? o.teks : o.content, warn, "Opsi " + LETTERS[k]));
          optEx.push(normalizeContent(o.explanation !== undefined ? o.explanation : o.pembahasan, warn, "Pembahasan opsi " + LETTERS[k]));
          if (o.correct === true || o.benar === true || o.isCorrect === true) flagged.push(LETTERS[k]);
        } else {
          opts.push(normalizeContent(o, warn, "Opsi " + LETTERS[k]));
          optEx.push("");
        }
      });
    } else if (rawOpts && typeof rawOpts === "object" && !Array.isArray(rawOpts)) {
      LETTERS.forEach((L) => {
        const v = rawOpts[L] !== undefined ? rawOpts[L] : rawOpts[L.toLowerCase()];
        if (v !== undefined && v !== null && v !== "") {
          opts.push(normalizeContent(v, warn, "Opsi " + L));
          optEx.push("");
        }
      });
    } else {
      LETTERS.forEach((L) => {
        const v = first(item, ["option" + L, "option" + L.toLowerCase(), L, L.toLowerCase()]);
        if (v !== undefined) {
          opts.push(normalizeContent(v, warn, "Opsi " + L));
          optEx.push("");
        }
      });
    }

    if (out.qtype === "K" && !opts.length) {
      LETTERS.forEach((L) => { opts.push(K_OPTION_TEXT[L]); optEx.push(""); });
    }
    if (opts.length < 2) errors.push("Pilihan jawaban kurang dari dua (options atau optionA-optionE).");
    opts.forEach((o, k) => { if (isEmptyContent(o)) errors.push("Opsi " + LETTERS[k] + " kosong."); });

    // Pembahasan per opsi bentuk Olimp
    if (distractors && typeof distractors === "object") {
      LETTERS.forEach((L, k) => {
        if (distractors[L] && k < optEx.length && isEmptyContent(optEx[k])) {
          optEx[k] = normalizeContent(distractors[L], warn, "Pembahasan opsi " + L);
        }
      });
    }

    // Kunci
    let answer = "";
    if (flagged.length > 1) errors.push("Ada " + flagged.length + " opsi yang ditandai benar (" + flagged.join(", ") + "); harus tepat satu.");
    else if (flagged.length === 1) answer = flagged[0];
    const rawKey = first(item, ["correctAnswer", "answer", "kunci", "jawaban", "key"]);
    if (!answer && rawKey !== undefined && rawKey !== null && typeof rawKey !== "object") {
      answer = letterFrom(rawKey, opts);
      if (!answer) errors.push("Kunci '" + rawKey + "' tidak cocok dengan opsi mana pun. Pakai huruf A-E.");
    }
    if (!answer && out.qtype === "K") {
      let ts = first(item, ["trueStatements", "benar"]);
      if (typeof ts === "string") ts = ts.split(/[^\d]+/).filter(Boolean).map(Number);
      if (Array.isArray(ts) && ts.length) {
        const want = ts.map(Number).sort().join(",");
        const hit = LETTERS.find((L) => K_COMBOS[L].join(",") === want);
        if (hit) answer = hit;
        else errors.push("Kombinasi pernyataan benar (" + want + ") bukan kombinasi baku tipe K. Tulis opsi dan kuncinya sendiri.");
      }
    }
    if (!answer && !errors.some((m) => m.indexOf("Kunci") === 0 || m.indexOf("Kombinasi") === 0)) {
      errors.push("Kunci jawaban belum diisi (correctAnswer, atau correct: true pada salah satu opsi).");
    }
    if (answer && LETTERS.indexOf(answer) >= opts.length) errors.push("Kunci " + answer + " menunjuk opsi yang tidak ada.");

    out.answer = answer;
    out.options = opts.map((t, k) => {
      const o = { label: LETTERS[k], text: t };
      if (!isEmptyContent(optEx[k])) o.explanation = optEx[k];
      return o;
    });
  } else {
    // Isian & esai
    let subs = first(item, ["subQuestions", "subquestions", "sub", "isian"]);
    if (!Array.isArray(subs) || !subs.length) {
      // Isian satu kotak yang ditulis langsung: { text, answer }
      const rawKey = first(item, ["validAnswers", "answer", "jawaban", "kunci"]);
      if (rawKey !== undefined) subs = [{ label: "A", question: "", validAnswers: rawKey }];
      else subs = [];
    }
    if (!subs.length) errors.push("Soal " + out.qtype + " butuh minimal satu sub-pertanyaan (subQuestions).");
    out.subQuestions = subs
      .map((s, k) => normalizeSub(s, k, out.qtype, warn, errors, ""))
      .filter(Boolean);
  }

  if (out.chapterTitle.length > 200) out.chapterTitle = out.chapterTitle.slice(0, 200);

  return { question: errors.length ? null : out, errors: errors, warnings: warnings, raw: out };
}

// ---------------------------------------------------------------------------
// Membaca satu kiriman utuh
// ---------------------------------------------------------------------------

// input: teks (JSON/array JS) atau nilai yang sudah diurai.
// Mengembalikan { items: [{ index, chapterTitle, question, errors, warnings }], warnings, schemaVersion }
function parseImport(input, ctx) {
  const c = Object.assign({}, ctx || {});
  let data = input;
  if (typeof input === "string") data = parseLoose(input);
  const warnings = [];
  let list = [];

  if (Array.isArray(data)) {
    list = data.map((q) => ({ q: q, chapterTitle: c.chapterTitle || "" }));
  } else if (data && typeof data === "object") {
    if (data.schemaVersion !== undefined) c.schemaVersion = Number(data.schemaVersion);
    const topChapter = data.chapter || data.bab || data.chapterTitle || c.chapterTitle || "";
    if (data.subject || data.mataKuliah) warnings.push("Field mata kuliah di file diabaikan; mata kuliah dipilih saat impor.");
    if (data.scope || data.campus || data.campuses) warnings.push("Pembatasan kampus di file diabaikan; kampus selalu diambil dari pengajuan atau pilihan admin.");
    if (Array.isArray(data.questions)) {
      list = data.questions.map((q) => ({ q: q, chapterTitle: str(topChapter) }));
    } else if (Array.isArray(data.chapters)) {
      data.chapters.forEach((ch) => {
        const title = str((ch && (ch.title || ch.name || ch.chapter || ch.bab)) || "");
        const qs = (ch && (ch.questions || ch.soal)) || [];
        if (!Array.isArray(qs)) return;
        qs.forEach((q) => list.push({ q: q, chapterTitle: title }));
      });
    } else if (data.questionText || data.text || data.stem || data.soal) {
      list = [{ q: data, chapterTitle: str(topChapter) }];
    } else {
      throw new Error("Tidak menemukan daftar soal. Pakai [ ... ], { questions: [ ... ] }, atau { chapters: [ ... ] }.");
    }
  } else {
    throw new Error("Isinya harus berupa daftar soal [ ... ] atau objek { questions: [ ... ] }.");
  }
  if (!list.length) throw new Error("Daftarnya kosong, tidak ada soal untuk diimpor.");

  const items = list.map((entry, k) => {
    const r = normalizeQuestion(entry.q, Object.assign({}, c, { chapterTitle: entry.chapterTitle || c.chapterTitle }));
    if (r.raw && !r.raw.chapterTitle && c.requireChapter) {
      r.errors.push("BAB belum diisi. Tulis field chapter pada soal atau pilih BAB saat impor.");
      r.question = null;
    }
    return {
      index: k + 1,
      chapterTitle: r.raw ? r.raw.chapterTitle : "",
      question: r.question,
      preview: r.raw,
      errors: r.errors,
      warnings: r.warnings,
    };
  });
  return { items: items, warnings: warnings, schemaVersion: c.schemaVersion || SCHEMA_VERSION };
}

module.exports = {
  SCHEMA_VERSION,
  LETTERS,
  K_COMBOS,
  K_OPTION_TEXT,
  parseLoose,
  driveToLh3,
  normalizeContent,
  contentToPlain,
  isEmptyContent,
  normalizeQuestion,
  parseImport,
};
