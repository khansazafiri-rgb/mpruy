import crypto from 'node:crypto';
import { loadConfig } from './config.mjs';
import { MedcoelClient } from './medcoel.mjs';
import { StateStore } from './state.mjs';
import { TelegramClient, escapeHtml } from './telegram.mjs';
import { DriveClient } from './drive.mjs';

const config = loadConfig();
const medcoel = new MedcoelClient(config);
const telegram = new TelegramClient(config);
const drive = new DriveClient(config);
const state = new StateStore(config.stateDir);
await state.load();

const APPROVAL_TTL_MS = 2 * 60 * 60 * 1000;
let stopping = false;

process.on('SIGTERM', () => { stopping = true; });
process.on('SIGINT', () => { stopping = true; });

console.log('[Hermes] starting');
await medcoel.login();
console.log('[Hermes] MEDCOEL agent login OK');
console.log(`[Hermes] Drive PDF relay ${drive.configured ? 'enabled' : 'disabled'}`);

queueLoop().catch((err) => fatal('queue loop', err));
telegramLoop().catch((err) => fatal('telegram loop', err));

async function telegramLoop() {
  while (!stopping) {
    try {
      const updates = await telegram.getUpdates(state.data.telegramOffset, config.telegramLongPollSeconds);
      for (const update of updates) {
        await state.setOffset(update.update_id + 1);
        try { await handleUpdate(update); } catch (err) { await reportUpdateError(update, err); }
      }
    } catch (err) {
      console.error('[Hermes] Telegram polling:', err.message);
      await sleep(3000);
    }
  }
}

async function queueLoop() {
  while (!stopping) {
    try {
      const result = await medcoel.listQueued();
      for (const sub of result?.items || []) {
        const key = `${sub.id}:${sub.updated || sub.confirmedAt || sub.status || 'antre'}`;
        if (state.hasAnnounced(key)) continue;
        for (const adminId of config.telegramAdmins) {
          try {
            await telegram.sendMessage(adminId, queueCard(sub, result.queue));
            if (drive.configured) await relaySubmissionFiles(adminId, sub);
          } catch (err) {
            console.error(`[Hermes] notify ${adminId}:`, err.message);
          }
        }
        await state.markAnnounced(key);
      }
    } catch (err) {
      console.error('[Hermes] queue poll:', err.message);
    }
    await sleep(config.queuePollMs);
  }
}

async function handleUpdate(update) {
  const actor = String(update.message?.from?.id || update.callback_query?.from?.id || '');
  if (!config.telegramAdmins.has(actor)) {
    if (update.callback_query) await telegram.answerCallbackQuery(update.callback_query.id, 'Tidak diizinkan.');
    return;
  }
  if (update.callback_query) return handleCallback(update.callback_query);
  if (!update.message) return;
  const msg = update.message;
  const text = String(msg.text || msg.caption || '').trim();

  if (msg.document) return handleDocument(msg, text);
  if (!text) return;
  if (text === '/start' || text === '/help') return help(msg.chat.id);
  if (text === '/queue') return showQueue(msg.chat.id);

  let m = text.match(/^\/claim\s+(\S+)$/i);
  if (m) return claim(msg.chat.id, m[1]);
  m = text.match(/^\/fix\s+(\S+)\s+(.+)$/is);
  if (m) return needsFix(msg.chat.id, m[1], m[2]);
  m = text.match(/^\/show\s+(\S+)$/i);
  if (m) return showSubmission(msg.chat.id, m[1]);
  m = text.match(/^\/files\s+(\S+)$/i);
  if (m) return showFiles(msg.chat.id, m[1]);

  return telegram.sendMessage(msg.chat.id, 'Perintah tidak dikenali. Kirim /help.');
}

async function help(chatId) {
  return telegram.sendMessage(chatId,
    '<b>MEDCOEL Hermes Agent</b>\n\n' +
    '/queue — lihat pengajuan berstatus Antre\n' +
    '/show KODE — lihat detail pengajuan\n' +
    '/files KODE — kirim PDF pengajuan ke chat ini\n' +
    '/claim KODE — ubah menjadi Diproses\n' +
    '/fix KODE alasan — tandai Perlu perbaikan\n\n' +
    '<b>Dry-run JSON</b>\n' +
    'Kirim file .json dengan caption:\n' +
    '<code>/dryrun KODE_PENGAJUAN ID_BAB</code>\n\n' +
    'Hermes akan dry-run dahulu. Impor nyata hanya muncul lewat tombol persetujuan dan terikat ke hash file JSON + ID BAB.'
  );
}

async function showQueue(chatId) {
  const result = await medcoel.listQueued();
  const items = result?.items || [];
  if (!items.length) return telegram.sendMessage(chatId, 'Antrean Hermes kosong.');
  const blocks = items.slice(0, 20).map((s) => compactSubmission(s));
  return telegram.sendMessage(chatId, `<b>Antrean (${items.length})</b>\n\n${blocks.join('\n\n')}`);
}

async function showSubmission(chatId, id) {
  const sub = await medcoel.getSubmission(id);
  return telegram.sendMessage(chatId, queueCard(sub));
}

async function showFiles(chatId, id) {
  const sub = await medcoel.getSubmission(id);
  if (!drive.configured) return telegram.sendMessage(chatId, 'Drive relay Hermes belum dikonfigurasi.');
  await telegram.sendMessage(chatId, `📎 Mengirim ${(sub.files || []).length} PDF untuk <b>${escapeHtml(sub.code || id)}</b>…`);
  return relaySubmissionFiles(chatId, sub);
}

async function relaySubmissionFiles(chatId, sub) {
  const files = (sub.files || []).filter((f) => f.driveFileId);
  if (!files.length) return telegram.sendMessage(chatId, 'Tidak ada PDF Drive yang dapat dikirim.');

  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    const response = await drive.openFile(file.driveFileId);
    const caption = `${sub.code || sub.id} · PDF ${i + 1}/${files.length}`;
    await telegram.sendDocumentStream(chatId, file.name || `submission-${i + 1}.pdf`, response, caption);
  }
}

async function claim(chatId, id) {
  const sub = await medcoel.setStatus(id, 'diproses');
  return telegram.sendMessage(chatId, `✅ <b>${escapeHtml(sub.code || id)}</b> sekarang Diproses.`);
}

async function needsFix(chatId, id, note) {
  const sub = await medcoel.setStatus(id, 'perlu_perbaikan', note.trim());
  return telegram.sendMessage(chatId, `⚠️ <b>${escapeHtml(sub.code || id)}</b> ditandai Perlu perbaikan.\n${escapeHtml(note.trim())}`);
}

async function handleDocument(msg, caption) {
  const fileName = String(msg.document.file_name || 'upload');
  const match = caption.match(/^\/dryrun\s+(\S+)\s+(\S+)$/i);
  if (!match) {
    return telegram.sendMessage(msg.chat.id, 'File tidak diproses. Untuk JSON pengajuan gunakan caption <code>/dryrun KODE_PENGAJUAN ID_BAB</code>.');
  }
  if (!/\.json$/i.test(fileName)) return telegram.sendMessage(msg.chat.id, 'Untuk tahap ini Hermes hanya menerima file .json.');

  const submissionId = match[1];
  const chapterId = match[2];
  const bytes = await telegram.downloadFile(msg.document.file_id, config.maxJsonBytes);
  const raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const digest = hashPayload(submissionId, chapterId, raw);

  await telegram.sendMessage(msg.chat.id, `🔎 Dry-run <b>${escapeHtml(submissionId)}</b> · BAB <code>${escapeHtml(chapterId)}</code>\nHash: <code>${digest.slice(0, 16)}</code>`);

  const result = await medcoel.importSubmission(submissionId, {
    chapter: chapterId,
    text: raw,
    skipInvalid: false,
    dryRun: true,
  });

  const invalid = Number(result?.invalid || 0);
  const duplicates = Number(result?.duplicates || 0);
  const valid = Number(result?.valid || 0);
  const created = Number(result?.created || 0);
  const issues = summarizeIssues(result?.items || []);

  if (invalid > 0) {
    return telegram.sendMessage(msg.chat.id,
      `❌ <b>Dry-run diblokir</b>\nValid: ${valid}\nInvalid: ${invalid}\nDuplikat: ${duplicates}${issues}`
    );
  }

  const approvalId = crypto.randomBytes(8).toString('hex');
  await state.putApproval(approvalId, {
    chatId: String(msg.chat.id),
    actorId: String(msg.from.id),
    submissionId,
    chapterId,
    fileName,
    telegramFileId: String(msg.document.file_id),
    hash: digest,
    dryRun: { valid, invalid, duplicates, created },
  });

  return telegram.sendMessage(msg.chat.id,
    `✅ <b>Dry-run lolos</b>\n` +
    `Pengajuan: <b>${escapeHtml(submissionId)}</b>\n` +
    `BAB ID: <code>${escapeHtml(chapterId)}</code>\n` +
    `Valid: ${valid}\nInvalid: ${invalid}\nDuplikat: ${duplicates}\n` +
    `Hash JSON: <code>${digest}</code>${issues}\n\n` +
    `Periksa isi soal sebelum menekan Setujui impor.`,
    { reply_markup: { inline_keyboard: [[
      { text: '✅ Setujui impor', callback_data: `approve:${approvalId}` },
      { text: '❌ Tolak', callback_data: `reject:${approvalId}` },
    ]] } }
  );
}

async function handleCallback(query) {
  const data = String(query.data || '');
  const match = data.match(/^(approve|reject):([a-f0-9]{16})$/);
  if (!match) return telegram.answerCallbackQuery(query.id, 'Aksi tidak dikenal.');

  const action = match[1];
  const approvalId = match[2];
  const pending = state.getApproval(approvalId);
  if (!pending) return telegram.answerCallbackQuery(query.id, 'Persetujuan sudah tidak berlaku.');
  if (String(query.from.id) !== String(pending.actorId)) return telegram.answerCallbackQuery(query.id, 'Hanya admin yang memulai dry-run ini yang dapat menyetujui.');
  if (Date.now() - Date.parse(pending.createdAt) > APPROVAL_TTL_MS) {
    await state.deleteApproval(approvalId);
    return telegram.answerCallbackQuery(query.id, 'Persetujuan kedaluwarsa. Jalankan dry-run lagi.');
  }

  if (action === 'reject') {
    await state.deleteApproval(approvalId);
    await telegram.answerCallbackQuery(query.id, 'Dibatalkan.');
    return telegram.sendMessage(pending.chatId, `❌ Impor <b>${escapeHtml(pending.submissionId)}</b> dibatalkan. Tidak ada data ditulis.`);
  }

  if (!pending.telegramFileId) {
    await state.deleteApproval(approvalId);
    return telegram.answerCallbackQuery(query.id, 'Approval lama tidak memiliki referensi file. Jalankan dry-run lagi.');
  }

  const bytes = await telegram.downloadFile(pending.telegramFileId, config.maxJsonBytes);
  const raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const digest = hashPayload(pending.submissionId, pending.chapterId, raw);
  if (!crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(pending.hash))) {
    await state.deleteApproval(approvalId);
    return telegram.answerCallbackQuery(query.id, 'Hash berubah; impor ditolak.');
  }

  await telegram.answerCallbackQuery(query.id, 'Menjalankan verifikasi final…');
  const payload = { chapter: pending.chapterId, text: raw, skipInvalid: false, dryRun: true };
  const check = await medcoel.importSubmission(pending.submissionId, payload);
  if (Number(check?.invalid || 0) > 0) throw new Error('Dry-run final tidak lagi valid; impor dibatalkan.');

  const imported = await medcoel.importSubmission(pending.submissionId, { ...payload, dryRun: false });
  await state.deleteApproval(approvalId);
  return telegram.sendMessage(pending.chatId,
    `🚀 <b>Impor berhasil</b>\nPengajuan: <b>${escapeHtml(pending.submissionId)}</b>\nCreated: ${Number(imported?.created || 0)}\nDuplikat dilewati: ${Number(imported?.duplicates || 0)}\nHash: <code>${pending.hash}</code>`
  );
}

async function reportUpdateError(update, err) {
  console.error('[Hermes] update error:', err);
  const chatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
  if (!chatId) return;
  const body = err?.body;
  const issues = summarizeIssues(body?.items || []);
  try { await telegram.sendMessage(chatId, `❌ ${escapeHtml(err.message)}${issues}`); } catch (_) {}
}

function queueCard(sub, queue) {
  const files = (sub.files || []).map((f) => `• ${escapeHtml(f.name)}${f.driveFileId ? ' · siap dikirim dari Drive' : ''}`).join('\n') || '• tidak ada file';
  const q = queue ? `\nAntrean PDF: ${Number(queue.totalQueuedPdf || 0)} · estimasi ${Number(queue.estimateDays || 0)} hari` : '';
  return `<b>📥 ${escapeHtml(sub.code || sub.id)}</b>\nStatus: ${escapeHtml(sub.status)}\nMata kuliah: ${escapeHtml(sub.subject?.name || sub.subject?.id || '-')}\nCakupan: ${escapeHtml(sub.restriction || sub.scope || '-')}\nPDF: ${Number(sub.pdfCount || (sub.files || []).length)}\n${files}${q}`;
}

function compactSubmission(sub) {
  return `<b>${escapeHtml(sub.code || sub.id)}</b> · ${escapeHtml(sub.subject?.name || '-')} · ${Number(sub.pdfCount || 0)} PDF`;
}

function summarizeIssues(items) {
  const bad = items.filter((x) => Array.isArray(x?.errors) && x.errors.length).slice(0, 8);
  if (!bad.length) return '';
  return '\n\n<b>Masalah:</b>\n' + bad.map((x) => `#${escapeHtml(x.index ?? x.number ?? '?')}: ${escapeHtml(x.errors.join('; '))}`).join('\n');
}

function hashPayload(submissionId, chapterId, raw) {
  return crypto.createHash('sha256').update(`${submissionId}\n${chapterId}\n`, 'utf8').update(raw, 'utf8').digest('hex');
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function fatal(where, err) { console.error(`[Hermes] fatal ${where}:`, err); process.exitCode = 1; stopping = true; }
