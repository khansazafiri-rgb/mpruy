import crypto from 'node:crypto';
import { escapeHtml } from './telegram.mjs';
import { parsePut, joinChunks, tryParse, countQuestions, countSlides, detectKind, pdfNumberFromName, resolvePdf } from './json-paste.mjs';
import { kindOf } from './notify.mjs';

const PLAN_TTL_MS = 2 * 60 * 60 * 1000;

export class ImportPlanFlow {
  constructor({ config, medcoel, telegram, state }) {
    this.config = config;
    this.medcoel = medcoel;
    this.telegram = telegram;
    this.state = state;
    // Sesi tempel JSON per admin. Sengaja di memori: kalau Hermes restart, tempelan diulang dari /put.
    this.sessions = new Map();
  }

  sessionKey(chatId, actorId) {
    return `${chatId}:${actorId}`;
  }

  helpText() {
    return [
      '<b>Kirim hasil (JSON)</b>',
      '<code>/put KODE</code> lalu tempel JSON langsung di chat. Boleh beberapa pesan; selesai otomatis saat JSON lengkap, atau kirim <code>/selesai</code>.',
      '<code>/put</code> saja memakai pengajuan yang terakhir diumumkan.',
      'Judul di web otomatis dari <b>judul PDF</b> pengajuan. Kalau pengajuan punya beberapa PDF, tambahkan nomor PDF-nya: <code>/put KODE 2</code> (nomor sama dengan <code>/files KODE 2</code>), atau beri nama file JSON seperti nama PDF-nya (<code>KODE_PDF-02-dari-3_nama.json</code>).',
      'Alternatif: kirim file .json dengan caption <code>/put [KODE]</code>.',
      '<code>/plan</code> — lihat rencana aktif',
      'Untuk pengajuan <b>PPT materi</b> isinya JSON materi (slide + penjelasan); tujuannya otomatis Drilling (materi).',
      '<code>/change drilling</code> — tujuan ke section Drilling',
      '<code>/change chapter ID_BAB</code> — tujuan ke bab pada mata kuliah submission',
      '<code>/confirm</code> — dry-run final lalu impor',
      '<code>/cancelplan</code> — batalkan rencana atau tempelan tanpa menulis database',
    ].join('\n');
  }

  async handleMessage(msg, text) {
    if (msg.document && /^\/put(?:\s|$)/i.test(text)) {
      await this.handlePut(msg, text);
      return true;
    }
    const legacy = msg.document ? text.match(/^\/dryrun\s+(\S+)\s+(\S+)$/i) : null;
    if (legacy) {
      await this.createPlanFromDocument(msg, legacy[1], { type: 'subject', chapterId: legacy[2] });
      return true;
    }
    if (msg.document) return false;

    const put = parsePut(text);
    if (put) {
      await this.handleTextPut(msg, put);
      return true;
    }
    if (/^\/(?:selesai|done)(?:@[A-Za-z0-9_]+)?$/i.test(text)) {
      await this.finishPaste(msg, true);
      return true;
    }
    if (text && !text.startsWith('/') && this.sessions.has(this.sessionKey(msg.chat.id, msg.from.id))) {
      await this.appendPaste(msg, text);
      return true;
    }

    if (/^\/plan$/i.test(text)) {
      await this.showPlan(msg.chat.id, msg.from.id);
      return true;
    }
    let m = text.match(/^\/change\s+(drilling)$/i);
    if (m) {
      await this.changeToDrilling(msg.chat.id, msg.from.id);
      return true;
    }
    m = text.match(/^\/change\s+(?:chapter|bab)\s+(\S+)$/i);
    if (m) {
      await this.changeToChapter(msg.chat.id, msg.from.id, m[1]);
      return true;
    }
    if (/^\/confirm$/i.test(text)) {
      await this.confirm(msg.chat.id, msg.from.id);
      return true;
    }
    if (/^\/cancelplan$/i.test(text)) {
      await this.cancel(msg.chat.id, msg.from.id);
      return true;
    }
    return false;
  }

  async handlePut(msg, caption) {
    const fileName = String(msg.document.file_name || 'upload');
    const cap = caption.match(/^\/put(?:\s+(\S+))?(?:\s+(?:#|no\.?\s*|nomor\s*|pdf\s*#?\s*)?(\d{1,2}))?$/i);
    const explicit = cap?.[1] || '';
    const inferred = fileName.match(/MC\d{6}-[A-Z0-9]{4}/i)?.[0] || '';
    const submissionId = explicit || inferred || this.state.data.lastNotified;
    const pdf = Number(cap?.[2] || 0) || pdfNumberFromName(fileName);
    if (!submissionId) {
      return this.telegram.sendMessage(msg.chat.id, 'Kode pengajuan tidak ditemukan. Gunakan caption <code>/put MC261024-ABCD</code> atau beri nama file yang memuat kode MC.');
    }
    return this.createPlanFromDocument(msg, submissionId, { type: 'drilling' }, pdf);
  }

  async createPlanFromDocument(msg, submissionId, destination, pdf = 0) {
    const fileName = String(msg.document.file_name || 'upload');
    if (!/\.(json|txt)$/i.test(fileName)) {
      return this.telegram.sendMessage(msg.chat.id, 'Hermes menerima JSON sebagai Telegram document <code>.json</code> (atau .txt berisi JSON murni). Bisa juga ditempel langsung: <code>/put KODE</code> lalu isi JSON-nya.');
    }

    const bytes = await this.telegram.downloadFile(msg.document.file_id, this.config.maxJsonBytes);
    const raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const parsed = tryParse(raw);
    if (!parsed.ok) return this.telegram.sendMessage(msg.chat.id, jsonErrorMessage(parsed));
    return this.createPlanFromRaw(msg, submissionId, raw, parsed.value, { fileName, telegramFileId: String(msg.document.file_id), destination, pdf });
  }

  // Dipakai bersama oleh jalur file dan jalur tempel teks.
  async createPlanFromRaw(msg, submissionId, raw, parsedValue, { fileName, telegramFileId = '', destination, pdf = 0 }) {
    const sub = await this.medcoel.getSubmission(submissionId);
    const kind = kindOf(sub);
    // JSON yang salah jalur ditolak sebelum rencana dibuat: PPT materi butuh JSON slide, pengajuan soal butuh JSON soal.
    const found = detectKind(parsedValue);
    if (found !== 'unknown' && found !== kind) {
      return this.telegram.sendMessage(msg.chat.id, wrongKindMessage(sub.code || submissionId, kind, found));
    }
    if (kind === 'materi' && destination?.type === 'subject') {
      return this.telegram.sendMessage(msg.chat.id, `❌ <b>${escapeHtml(sub.code || submissionId)}</b> adalah PPT materi, jadi tidak bisa dimasukkan ke BAB. Materi tayang di Drilling mata kuliahnya.`);
    }
    // Judul di web diambil dari judul PDF pengajuan (satu PDF otomatis; beberapa PDF lewat nomor PDF).
    const picked = resolvePdf(sub.files, pdf);
    if (picked.missing) {
      return this.telegram.sendMessage(msg.chat.id, `❌ PDF nomor ${escapeHtml(pdf)} tidak ada. <b>${escapeHtml(sub.code || submissionId)}</b> punya ${picked.count} PDF (nomor 1 sampai ${picked.count}).`);
    }
    const bodyRef = telegramFileId ? '' : await this.state.putBody(msg.chat.id, msg.from.id, raw);
    const plan = await this.state.putImportPlan(msg.chat.id, msg.from.id, {
      chatId: String(msg.chat.id),
      actorId: String(msg.from.id),
      submissionId: sub.id || submissionId,
      submissionCode: sub.code || submissionId,
      telegramFileId,
      bodyRef,
      fileName,
      fileHash: hashRaw(raw),
      contentKind: kind,
      pdfNumber: picked.pdf,
      pdfCount: picked.count,
      pdfTitle: picked.title,
      jsonTitle: kind === 'materi' && typeof parsedValue?.title === 'string' ? parsedValue.title.trim() : '',
      questionCount: kind === 'materi' ? 0 : countQuestions(parsedValue),
      slideCount: kind === 'materi' ? countSlides(parsedValue) : 0,
      source: {
        subjectId: sub.subject?.id || '',
        subjectName: sub.subject?.name || '',
        restriction: sub.restriction || sub.scope || '',
        campusId: sub.campus?.id || '',
        campusName: sub.campus?.name || '',
        language: sub.language || '',
      },
      // Jangan menebak bab dari isi JSON. /put default ke Drilling, sedangkan
      // /dryrun legacy membawa chapter eksplisit.
      destination: kind === 'materi' ? { type: 'deck' } : destination,
    });

    return this.telegram.sendMessage(msg.chat.id, planCard(plan));
  }

  // ---- JSON yang ditempel sebagai teks ----

  async handleTextPut(msg, put) {
    const chatId = msg.chat.id;
    const code = put.code || this.state.data.lastNotified;
    if (!code) {
      return this.telegram.sendMessage(chatId, 'Kode pengajuan belum ada. Tulis <code>/put MC261024-ABCD</code> lalu tempel JSON-nya. Kodenya ada di notifikasi pengajuan atau di /queue.');
    }
    const sub = await this.medcoel.getSubmission(code);
    const now = Date.now();
    this.sessions.set(this.sessionKey(chatId, msg.from.id), {
      submissionId: sub.id || code,
      submissionCode: sub.code || code,
      pdf: put.pdf || 0,
      chunks: [],
      bytes: 0,
      startedAt: now,
      touchedAt: now,
    });
    if (!put.body) {
      return this.telegram.sendMessage(chatId,
        `📝 Siap menerima JSON untuk <b>${escapeHtml(sub.code || code)}</b>${put.code ? '' : ' <i>(pengajuan terakhir yang diumumkan)</i>'}.\n`
        + 'Tempel JSON-nya di chat sekarang. Boleh dipecah beberapa pesan; selesai otomatis begitu JSON lengkap, atau kirim <code>/selesai</code>. Batalkan dengan <code>/cancelplan</code>.'
      );
    }
    return this.appendPaste(msg, put.body);
  }

  async appendPaste(msg, text) {
    const chatId = msg.chat.id;
    const key = this.sessionKey(chatId, msg.from.id);
    const session = this.sessions.get(key);
    if (!session) return undefined;
    if (Date.now() - session.touchedAt > this.config.pasteTtlMs) {
      this.sessions.delete(key);
      return this.telegram.sendMessage(chatId, 'Tempelan kedaluwarsa. Mulai lagi dengan <code>/put KODE</code>.');
    }
    session.chunks.push(text);
    session.bytes += Buffer.byteLength(text, 'utf8');
    session.touchedAt = Date.now();
    if (session.bytes > this.config.maxJsonBytes) {
      this.sessions.delete(key);
      return this.telegram.sendMessage(chatId, `❌ Tempelan melebihi batas ${Math.round(this.config.maxJsonBytes / 1024)} KB. Kirim sebagai file .json atau pecah menjadi beberapa pengajuan.`);
    }
    const raw = joinChunks(session.chunks);
    const parsed = tryParse(raw);
    if (parsed.ok) return this.finishPaste(msg, false, raw, parsed.value);
    return this.telegram.sendMessage(chatId,
      `✔️ Bagian ${session.chunks.length} diterima (${raw.length} karakter, JSON belum lengkap). Lanjutkan menempel, atau kirim <code>/selesai</code> kalau sudah semuanya.`
    );
  }

  async finishPaste(msg, forced, rawIn, valueIn) {
    const chatId = msg.chat.id;
    const key = this.sessionKey(chatId, msg.from.id);
    const session = this.sessions.get(key);
    if (!session) {
      return forced
        ? this.telegram.sendMessage(chatId, 'Tidak ada tempelan aktif. Mulai dengan <code>/put KODE</code>.')
        : undefined;
    }
    const raw = rawIn ?? joinChunks(session.chunks);
    const parsed = rawIn === undefined ? tryParse(raw) : { ok: true, value: valueIn };
    if (!parsed.ok) {
      // Sesi dibiarkan terbuka supaya admin bisa menambah/memperbaiki bagian yang kurang.
      return this.telegram.sendMessage(chatId, `${jsonErrorMessage(parsed)}\n\nSesi tempel masih terbuka. Kirim bagian yang kurang, atau <code>/cancelplan</code> untuk membatalkan.`);
    }
    this.sessions.delete(key);
    return this.createPlanFromRaw(msg, session.submissionId, raw, parsed.value, {
      fileName: '(ditempel lewat teks)',
      destination: { type: 'drilling' },
      pdf: session.pdf || 0,
    });
  }
  async showPlan(chatId, actorId) {
    const plan = this.requirePlan(chatId, actorId);
    return this.telegram.sendMessage(chatId, planCard(plan));
  }

  async changeToDrilling(chatId, actorId) {
    const plan = this.requirePlan(chatId, actorId);
    if (plan.contentKind === 'materi') return this.telegram.sendMessage(chatId, 'PPT materi selalu tayang di Drilling (materi). Tidak ada tujuan lain; kirim <code>/confirm</code> bila rencananya sudah benar.');
    plan.destination = { type: 'drilling' };
    const updated = await this.state.putImportPlan(chatId, actorId, plan);
    return this.telegram.sendMessage(chatId, `✏️ Tujuan diubah.\n\n${planCard(updated)}`);
  }

  async changeToChapter(chatId, actorId, chapterId) {
    const plan = this.requirePlan(chatId, actorId);
    if (plan.contentKind === 'materi') return this.telegram.sendMessage(chatId, '❌ PPT materi tidak bisa dimasukkan ke BAB. Materi tayang di Drilling mata kuliahnya.');
    plan.destination = { type: 'subject', chapterId: String(chapterId) };
    const updated = await this.state.putImportPlan(chatId, actorId, plan);
    return this.telegram.sendMessage(chatId, `✏️ Tujuan diubah.\n\n${planCard(updated)}`);
  }

  async cancel(chatId, actorId) {
    const pasting = this.sessions.delete(this.sessionKey(chatId, actorId));
    const plan = this.state.getImportPlan(chatId, actorId);
    if (!plan) return this.telegram.sendMessage(chatId, pasting ? '❌ Tempelan JSON dibatalkan. Tidak ada data ditulis.' : 'Tidak ada Import Plan aktif.');
    await this.state.deleteImportPlan(chatId, actorId);
    return this.telegram.sendMessage(chatId, `❌ Import Plan <b>${escapeHtml(plan.submissionCode)}</b> dibatalkan. Tidak ada data ditulis.`);
  }

  async confirm(chatId, actorId) {
    const plan = this.requirePlan(chatId, actorId);
    const lastTouch = Date.parse(plan.updatedAt || plan.createdAt || 0);
    if (!lastTouch || Date.now() - lastTouch > PLAN_TTL_MS) {
      await this.state.deleteImportPlan(chatId, actorId);
      return this.telegram.sendMessage(chatId, 'Import Plan kedaluwarsa. Kirim JSON lagi dengan <code>/put</code>.');
    }
    if (plan.destination?.type === 'subject' && !plan.destination.chapterId) {
      return this.telegram.sendMessage(chatId, 'Tujuan bab belum lengkap. Gunakan <code>/change chapter ID_BAB</code>.');
    }

    let raw;
    if (plan.bodyRef) {
      raw = await this.state.readBody(plan.bodyRef);
    } else {
      const bytes = await this.telegram.downloadFile(plan.telegramFileId, this.config.maxJsonBytes);
      raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    }
    const currentHash = hashRaw(raw);
    if (!safeEqual(currentHash, plan.fileHash)) {
      await this.state.deleteImportPlan(chatId, actorId);
      return this.telegram.sendMessage(chatId, '❌ JSON berubah sejak Import Plan dibuat. Plan dibuang; kirim ulang dengan <code>/put</code>.');
    }

    const current = await this.medcoel.getSubmission(plan.submissionId);
    if (current?.status === 'menunggu_konfirmasi') {
      return this.telegram.sendMessage(chatId,
        `⏳ <b>${escapeHtml(plan.submissionCode)}</b> masih Menunggu konfirmasi, jadi belum bisa diimpor. Kirim <code>/terima ${escapeHtml(plan.submissionCode)}</code> dulu, lalu <code>/confirm</code> lagi. Rencana impormu tetap tersimpan.`
      );
    }

    await this.telegram.sendMessage(chatId, `🔎 Final dry-run <b>${escapeHtml(plan.submissionCode)}</b> → ${destinationLabel(plan.destination)}…`);

    let check;
    try {
      check = await this.runImport(plan, raw, true);
    } catch (err) {
      // Server menjawab 400 untuk materi yang diblokir; tampilkan per slide, bukan galat HTTP mentah.
      if (plan.contentKind === 'materi' && err?.status === 400 && Array.isArray(err.body?.items)) {
        return this.telegram.sendMessage(chatId, `❌ <b>Import materi diblokir</b>${summarizeIssues(err.body.items, 'Slide ')}\n\nPerbaiki JSON-nya lalu kirim ulang dengan <code>/put</code>.`);
      }
      if (plan.destination?.type === 'drilling' && err?.status === 404) {
        return this.telegram.sendMessage(chatId,
          '⚠️ Import Plan aman dan belum menulis data, tetapi endpoint Drilling MEDCOEL belum aktif. Selesaikan backend Drilling lalu jalankan <code>/confirm</code> lagi.'
        );
      }
      throw err;
    }

    if (plan.contentKind === 'materi') {
      if (check?.blocked) {
        return this.telegram.sendMessage(chatId, `❌ <b>Import materi diblokir</b>${summarizeIssues(check?.items || [], 'Slide ')}\n\nPerbaiki JSON-nya lalu kirim ulang dengan <code>/put</code>.`);
      }
      const imported = await this.runImport(plan, raw, false);
      await this.state.deleteImportPlan(chatId, actorId);
      return this.telegram.sendMessage(chatId,
        `🚀 <b>Materi berhasil diimpor</b>\n` +
        `Pengajuan: <b>${escapeHtml(plan.submissionCode)}</b>\n` +
        `Judul di web: <b>${escapeHtml(imported?.title || check?.title || '—')}</b>${imported?.titleSource === 'pdf' ? ' <i>(dari judul PDF)</i>' : imported?.titleSource === 'json' ? ' <i>(dari JSON)</i>' : ''}\n` +
        `Slide: ${Number(imported?.slideCount || 0)}${imported?.replaced ? ' <i>(memperbarui materi dengan judul yang sama)</i>' : ''}\n` +
        `Tujuan: ${destinationLabel(plan.destination)}\n` +
        `Hash: <code>${escapeHtml(plan.fileHash)}</code>`
        + warningsText(imported?.warnings)
      );
    }

    const invalid = Number(check?.invalid || 0);
    const duplicates = Number(check?.duplicates || 0);
    const valid = Number(check?.valid || 0);
    if (invalid > 0 || check?.blocked) {
      return this.telegram.sendMessage(chatId,
        `❌ <b>Import diblokir</b>\nValid: ${valid}\nInvalid: ${invalid}\nDuplikat: ${duplicates}${summarizeIssues(check?.items || [])}`
      );
    }

    const imported = await this.runImport(plan, raw, false);
    await this.state.deleteImportPlan(chatId, actorId);
    return this.telegram.sendMessage(chatId,
      `🚀 <b>Import berhasil</b>\n` +
      `Pengajuan: <b>${escapeHtml(plan.submissionCode)}</b>\n` +
      `Tujuan: ${destinationLabel(plan.destination)}\n` +
      (plan.destination?.type === 'drilling' ? `Bagian di web: <b>${escapeHtml(imported?.setTitle || 'Soal lainnya')}</b>\n` : '') +
      `Created: ${Number(imported?.created || 0)}\n` +
      `Duplikat dilewati: ${Number(imported?.duplicates || 0)}\n` +
      `Hash: <code>${escapeHtml(plan.fileHash)}</code>`
      + (imported?.titleNote ? `\n\n⚠️ ${escapeHtml(imported.titleNote)}` : '')
    );
  }

  runImport(plan, raw, dryRun) {
    const common = { text: raw, skipInvalid: false, dryRun };
    const pdf = plan.pdfNumber || undefined;
    if (plan.destination?.type === 'deck') return this.medcoel.importDeckSubmission(plan.submissionId, { text: raw, dryRun, pdf });
    if (plan.destination?.type === 'drilling') {
      return this.medcoel.importDrillingSubmission(plan.submissionId, { ...common, pdf });
    }
    return this.medcoel.importSubmission(plan.submissionId, {
      ...common,
      chapter: plan.destination.chapterId,
    });
  }

  requirePlan(chatId, actorId) {
    const plan = this.state.getImportPlan(chatId, actorId);
    if (!plan) {
      const err = new Error('Tidak ada Import Plan aktif. Tempel JSON dengan /put KODE, atau kirim file .json dengan caption /put [KODE].');
      err.userMessage = true;
      throw err;
    }
    return plan;
  }
}

function planCard(plan) {
  const s = plan.source || {};
  const scope = s.restriction === 'campus'
    ? `Kampus saja${s.campusName ? ` · ${escapeHtml(s.campusName)}` : ''}`
    : 'Semua kampus';
  if (plan.contentKind === 'materi') {
    return [
      '<b>📦 IMPORT PLAN · 📚 PPT MATERI</b>',
      `<b>${escapeHtml(plan.submissionCode)}</b>`,
      '',
      `JSON: ${escapeHtml(plan.fileName)}`,
      `Slide terdeteksi: ${Number(plan.slideCount || 0) || '—'}`,
      titleLine(plan, 'materi'),
      `Sumber mata kuliah: ${escapeHtml(s.subjectName || s.subjectId || '—')}`,
      `Tujuan: ${destinationLabel(plan.destination)}`,
      `Scope: ${scope} <i>(locked dari submission)</i>`,
      '',
      '<b>Belum ada perubahan ke database.</b>',
      'Jika sudah benar, kirim <code>/confirm</code> (periksa ulang lalu impor).',
    ].join('\n');
  }
  return [
    '<b>📦 IMPORT PLAN</b>',
    `<b>${escapeHtml(plan.submissionCode)}</b>`,
    '',
    `JSON: ${escapeHtml(plan.fileName)}`,
    `Soal terdeteksi: ${Number(plan.questionCount || 0) || '—'}`,
    ...(plan.destination?.type === 'drilling' ? [titleLine(plan, 'soal')] : []),
    `Sumber mata kuliah: ${escapeHtml(s.subjectName || s.subjectId || '—')}`,
    `Tujuan: ${destinationLabel(plan.destination)}`,
    `Scope: ${scope} <i>(locked dari submission)</i>`,
    `Bahasa: ${escapeHtml(s.language || '—')}`,
    '',
    '<b>Belum ada perubahan ke database.</b>',
    'Ubah tujuan dengan <code>/change drilling</code> atau <code>/change chapter ID_BAB</code>.',
    'Jika sudah benar, kirim <code>/confirm</code>.',
  ].join('\n');
}

// Baris "Judul" di kartu rencana. Judul di web: nama PDF (satu PDF otomatis, atau nomor PDF dipilih lewat /put KODE N).
function titleLine(plan, kind) {
  const code = escapeHtml(plan.submissionCode);
  const label = kind === 'materi' ? 'Judul materi di web' : 'Bagian soal di web';
  if (plan.pdfTitle) return `${label}: <b>${escapeHtml(plan.pdfTitle)}</b> <i>(judul PDF ${plan.pdfNumber}${plan.pdfCount > 1 ? ` dari ${plan.pdfCount}` : ''})</i>`;
  if (kind === 'materi' && plan.jsonTitle) return `${label}: <b>${escapeHtml(plan.jsonTitle)}</b> <i>(dari JSON)</i>`;
  if (plan.pdfCount > 1) return `${label}: ⚠️ belum bisa ditentukan, ada ${plan.pdfCount} PDF. Kirim ulang dengan nomor PDF-nya: <code>/put ${code} 2</code>${kind === 'materi' ? ' (atau isi title di JSON)' : ' (tanpa nomor, soal masuk "Soal lainnya")'}.`;
  return `${label}: ${kind === 'materi' ? 'judul bawaan bertanggal' : 'Soal lainnya'}`;
}

function destinationLabel(destination) {
  if (destination?.type === 'deck') return '<b>DRILLING · MATERI</b> <i>(slide + penjelasan)</i>';
  if (destination?.type === 'drilling') return '<b>DRILLING</b> <i>(section terpisah)</i>';
  if (destination?.type === 'subject') return `Mata kuliah → BAB <code>${escapeHtml(destination.chapterId || '—')}</code>`;
  return '—';
}

function jsonErrorMessage(parsed) {
  const where = parsed.line ? ` (baris ${parsed.line}, kolom ${parsed.column})` : '';
  return `❌ JSON tidak valid${where}: ${escapeHtml(parsed.error)}`;
}

function hashRaw(raw) {
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
}

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ''), 'utf8');
  const bb = Buffer.from(String(b || ''), 'utf8');
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function summarizeIssues(items, label = '#') {
  const bad = items.filter((x) => Array.isArray(x?.errors) && x.errors.length).slice(0, 8);
  if (!bad.length) return '';
  return '\n\n<b>Masalah:</b>\n' + bad
    .map((x) => `${label}${escapeHtml(x.index ?? x.number ?? '?')}: ${escapeHtml(x.errors.join('; '))}`)
    .join('\n');
}

function warningsText(warnings) {
  const list = (Array.isArray(warnings) ? warnings : []).slice(0, 5);
  return list.length ? `\n\n<b>Catatan:</b>\n${list.map((w) => `• ${escapeHtml(w)}`).join('\n')}` : '';
}

function wrongKindMessage(code, expected, found) {
  const c = escapeHtml(code);
  return expected === 'materi'
    ? `❌ <b>${c}</b> adalah <b>PPT materi</b>, tetapi JSON-nya terlihat seperti soal. Kirim JSON materi: <code>{ "title": ..., "slides": [ { "image": "https://lh3...", "explanation": "..." } ] }</code>.`
    : `❌ <b>${c}</b> adalah <b>pengajuan soal</b>, tetapi JSON-nya terlihat seperti materi (slide). Kirim JSON soal, atau pastikan pengaju memilih "PPT materi" untuk berkas slide.`;
}
