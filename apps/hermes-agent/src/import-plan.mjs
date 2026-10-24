import crypto from 'node:crypto';
import { escapeHtml } from './telegram.mjs';

const PLAN_TTL_MS = 2 * 60 * 60 * 1000;

export class ImportPlanFlow {
  constructor({ config, medcoel, telegram, state }) {
    this.config = config;
    this.medcoel = medcoel;
    this.telegram = telegram;
    this.state = state;
  }

  helpText() {
    return [
      '<b>Import Plan (baru)</b>',
      'Kirim document JSON dengan caption <code>/put [KODE]</code>. KODE boleh dikosongkan jika ada di nama file.',
      '<code>/plan</code> — lihat rencana aktif',
      '<code>/change drilling</code> — tujuan ke section Drilling',
      '<code>/change chapter ID_BAB</code> — tujuan ke bab pada mata kuliah submission',
      '<code>/confirm</code> — dry-run final lalu impor',
      '<code>/cancelplan</code> — batalkan rencana tanpa menulis database',
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
    const explicit = caption.match(/^\/put(?:\s+(\S+))?$/i)?.[1] || '';
    const inferred = fileName.match(/MC\d{6}-[A-Z0-9]{4}/i)?.[0] || '';
    const submissionId = explicit || inferred;
    if (!submissionId) {
      return this.telegram.sendMessage(msg.chat.id, 'Kode pengajuan tidak ditemukan. Gunakan caption <code>/put MC261024-ABCD</code> atau beri nama file yang memuat kode MC.');
    }
    return this.createPlanFromDocument(msg, submissionId, { type: 'drilling' });
  }

  async createPlanFromDocument(msg, submissionId, destination) {
    const fileName = String(msg.document.file_name || 'upload');
    if (!/\.(json|txt)$/i.test(fileName)) {
      return this.telegram.sendMessage(msg.chat.id, 'Hermes menerima JSON sebagai Telegram document <code>.json</code> (atau .txt berisi JSON murni).');
    }

    const bytes = await this.telegram.downloadFile(msg.document.file_id, this.config.maxJsonBytes);
    const raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    let parsed;
    try { parsed = JSON.parse(raw); } catch (err) {
      return this.telegram.sendMessage(msg.chat.id, `❌ JSON tidak valid: ${escapeHtml(err.message)}`);
    }

    const sub = await this.medcoel.getSubmission(submissionId);
    const plan = await this.state.putImportPlan(msg.chat.id, msg.from.id, {
      chatId: String(msg.chat.id),
      actorId: String(msg.from.id),
      submissionId: sub.id || submissionId,
      submissionCode: sub.code || submissionId,
      telegramFileId: String(msg.document.file_id),
      fileName,
      fileHash: hashRaw(raw),
      questionCount: countQuestions(parsed),
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
      destination,
    });

    return this.telegram.sendMessage(msg.chat.id, planCard(plan));
  }

  async showPlan(chatId, actorId) {
    const plan = this.requirePlan(chatId, actorId);
    return this.telegram.sendMessage(chatId, planCard(plan));
  }

  async changeToDrilling(chatId, actorId) {
    const plan = this.requirePlan(chatId, actorId);
    plan.destination = { type: 'drilling' };
    const updated = await this.state.putImportPlan(chatId, actorId, plan);
    return this.telegram.sendMessage(chatId, `✏️ Tujuan diubah.\n\n${planCard(updated)}`);
  }

  async changeToChapter(chatId, actorId, chapterId) {
    const plan = this.requirePlan(chatId, actorId);
    plan.destination = { type: 'subject', chapterId: String(chapterId) };
    const updated = await this.state.putImportPlan(chatId, actorId, plan);
    return this.telegram.sendMessage(chatId, `✏️ Tujuan diubah.\n\n${planCard(updated)}`);
  }

  async cancel(chatId, actorId) {
    const plan = this.state.getImportPlan(chatId, actorId);
    if (!plan) return this.telegram.sendMessage(chatId, 'Tidak ada Import Plan aktif.');
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

    const bytes = await this.telegram.downloadFile(plan.telegramFileId, this.config.maxJsonBytes);
    const raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const currentHash = hashRaw(raw);
    if (!safeEqual(currentHash, plan.fileHash)) {
      await this.state.deleteImportPlan(chatId, actorId);
      return this.telegram.sendMessage(chatId, '❌ File JSON berubah sejak Import Plan dibuat. Plan dibuang; kirim ulang dengan <code>/put</code>.');
    }

    await this.telegram.sendMessage(chatId, `🔎 Final dry-run <b>${escapeHtml(plan.submissionCode)}</b> → ${destinationLabel(plan.destination)}…`);

    let check;
    try {
      check = await this.runImport(plan, raw, true);
    } catch (err) {
      if (plan.destination?.type === 'drilling' && err?.status === 404) {
        return this.telegram.sendMessage(chatId,
          '⚠️ Import Plan aman dan belum menulis data, tetapi endpoint Drilling MEDCOEL belum aktif. Selesaikan backend Drilling lalu jalankan <code>/confirm</code> lagi.'
        );
      }
      throw err;
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
      `Created: ${Number(imported?.created || 0)}\n` +
      `Duplikat dilewati: ${Number(imported?.duplicates || 0)}\n` +
      `Hash: <code>${escapeHtml(plan.fileHash)}</code>`
    );
  }

  runImport(plan, raw, dryRun) {
    const common = { text: raw, skipInvalid: false, dryRun };
    if (plan.destination?.type === 'drilling') {
      return this.medcoel.importDrillingSubmission(plan.submissionId, common);
    }
    return this.medcoel.importSubmission(plan.submissionId, {
      ...common,
      chapter: plan.destination.chapterId,
    });
  }

  requirePlan(chatId, actorId) {
    const plan = this.state.getImportPlan(chatId, actorId);
    if (!plan) {
      const err = new Error('Tidak ada Import Plan aktif. Kirim JSON sebagai document dengan caption /put [KODE].');
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
  return [
    '<b>📦 IMPORT PLAN</b>',
    `<b>${escapeHtml(plan.submissionCode)}</b>`,
    '',
    `JSON: ${escapeHtml(plan.fileName)}`,
    `Soal terdeteksi: ${Number(plan.questionCount || 0) || '—'}`,
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

function destinationLabel(destination) {
  if (destination?.type === 'drilling') return '<b>DRILLING</b> <i>(section terpisah)</i>';
  if (destination?.type === 'subject') return `Mata kuliah → BAB <code>${escapeHtml(destination.chapterId || '—')}</code>`;
  return '—';
}

function countQuestions(parsed) {
  if (Array.isArray(parsed)) return parsed.length;
  if (Array.isArray(parsed?.questions)) return parsed.questions.length;
  if (Array.isArray(parsed?.items)) return parsed.items.length;
  return 0;
}

function hashRaw(raw) {
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
}

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ''), 'utf8');
  const bb = Buffer.from(String(b || ''), 'utf8');
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function summarizeIssues(items) {
  const bad = items.filter((x) => Array.isArray(x?.errors) && x.errors.length).slice(0, 8);
  if (!bad.length) return '';
  return '\n\n<b>Masalah:</b>\n' + bad
    .map((x) => `#${escapeHtml(x.index ?? x.number ?? '?')}: ${escapeHtml(x.errors.join('; '))}`)
    .join('\n');
}
