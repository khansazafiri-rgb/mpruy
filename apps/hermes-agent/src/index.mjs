import { acquireAgentLock } from './process-lock.mjs';
import { PdfQueue } from './pdf-queue.mjs';
import { safeError } from './delivery-errors.mjs';
import { loadConfig } from './config.mjs';
import { MedcoelClient } from './medcoel.mjs';
import { StateStore } from './state.mjs';
import { TelegramClient, escapeHtml } from './telegram.mjs';
import { DriveClient } from './drive.mjs';
import { pickFiles } from './files.mjs';
import { ImportPlanFlow } from './import-plan.mjs';
import { RetargetFlow } from './retarget.mjs';
import { buildHelp } from './help.mjs';
import { newSubmissionMessage, queueCard, compactSubmission, howToSubmit, BOT_COMMANDS, statusLabel, kindOf } from './notify.mjs';

const config = loadConfig();
const medcoel = new MedcoelClient(config);
const telegram = new TelegramClient(config);
const drive = new DriveClient(config);
const state = new StateStore(config.stateDir);
const releaseAgentLock = acquireAgentLock(config.stateDir);
process.on('exit', releaseAgentLock);
await state.load();

const pdfQueue = new PdfQueue({ state, drive, telegram, medcoel, config });
await pdfQueue.recover();

const importPlans = new ImportPlanFlow({ config, medcoel, telegram, state });
const retarget = new RetargetFlow({ medcoel, telegram, importPlans });
let stopping = false;

process.on('SIGTERM', () => { stopping = true; });
process.on('SIGINT', () => { stopping = true; });

console.log('[Hermes] starting');
await medcoel.login();
console.log('[Hermes] MEDCOEL agent login OK');
console.log(`[Hermes] Drive PDF relay ${drive.configured ? 'enabled' : 'disabled'}`);
console.log('[Hermes] Import Plan flow enabled (file dan tempel teks)');
console.log('[Hermes] Ubah tujuan pengajuan enabled (/jenis, /matkul, /pindah)');
console.log(`[Hermes] Notifikasi pengajuan Menunggu konfirmasi ${config.notifyWaiting ? 'aktif' : 'nonaktif'}`);
telegram.setMyCommands(BOT_COMMANDS).catch((err) => console.error('[Hermes] setMyCommands:', safeError(err, config)));

queueLoop().catch((err) => fatal('queue loop', err));
telegramLoop().catch((err) => fatal('telegram loop', err));
pdfLoop().catch((err) => fatal('PDF worker', err));

async function pdfLoop() {
  while (!stopping) {
    try { await pdfQueue.tick(); } catch (err) { console.error('[HermesQueue]', safeError(err, config)); }
    await sleep(config.pdfPollMs);
  }
}

async function telegramLoop() {
  while (!stopping) {
    try {
      const updates = await telegram.getUpdates(state.data.telegramOffset, config.telegramLongPollSeconds);
      for (const update of updates) {
        await state.setOffset(update.update_id + 1);
        try { await handleUpdate(update); } catch (err) { await reportUpdateError(update, err); }
      }
    } catch (err) {
      console.error('[Hermes] Telegram polling:', safeError(err, config));
      await sleep(3000);
    }
  }
}

async function queueLoop() {
  while (!stopping) {
    try {
      // 1) Pengajuan yang baru dikirim pengguna dan belum dikonfirmasi: langsung kabari admin.
      if (config.notifyWaiting) {
        const since = new Date(Date.now() - config.waitingLookbackHours * 3600 * 1000).toISOString();
        const waiting = await medcoel.listSubmissions('menunggu_konfirmasi', since);
        for (const sub of waiting?.items || []) await announce(sub, waiting.queue, `${sub.id}:menunggu_konfirmasi`);
      }
      // 2) Pengajuan yang sudah Antre (sudah dikonfirmasi).
      const result = await medcoel.listQueued();
      for (const sub of result?.items || []) {
        // Delivery is independent of the old notification key, including /terima.
        await pdfQueue.enqueue(sub, config.telegramAdmins);
        await announce(sub, result.queue, `${sub.id}:${sub.updated || sub.confirmedAt || sub.status || 'antre'}`);
      }
      // A claim or restart must not strand PDFs already marked diproses.
      const processing = await medcoel.listSubmissions('diproses');
      for (const sub of processing?.items || []) await pdfQueue.enqueue(sub, config.telegramAdmins);
    } catch (err) {
      console.error('[Hermes] queue poll:', safeError(err, config));
    }
    await sleep(config.queuePollMs);
  }
}

async function announce(sub, queue, key) {
  if (state.hasAnnounced(key)) return;
  let allNotified = true;
  for (const adminId of config.telegramAdmins) {
    const adminKey = key + ':' + adminId;
    if (state.hasAnnounced(adminKey)) continue;
    try {
      await telegram.sendMessage(adminId, newSubmissionMessage(sub, queue));
      await state.markAnnounced(adminKey);

    } catch (err) {
      allNotified = false;
      console.error('[Hermes] notify:', safeError(err, config));
    }
  }
  await state.setLastNotified(sub.code || sub.id);
  if (allNotified) await state.markAnnounced(key);
}

async function handleUpdate(update) {
  const actor = String(update.message?.from?.id || update.callback_query?.from?.id || '');
  if (!config.telegramAdmins.has(actor)) {
    if (update.callback_query) await telegram.answerCallbackQuery(update.callback_query.id, 'Tidak diizinkan.');
    return;
  }

  if (update.callback_query) {
    await telegram.answerCallbackQuery(update.callback_query.id, 'Tombol lama tidak dipakai lagi. Gunakan /plan atau /confirm.');
    return;
  }
  if (!update.message) return;

  const msg = update.message;
  const text = String(msg.text || msg.caption || '').trim();

  if (await importPlans.handleMessage(msg, text)) return;
  if (await retarget.handleMessage(msg, text)) return;

  if (msg.document) {
    return telegram.sendMessage(msg.chat.id,
      'Document tidak diproses. Untuk JSON kirim file .json dengan caption <code>/put [KODE]</code>, '
      + 'atau tempel langsung: <code>/put KODE</code> lalu isi JSON-nya. '
      + 'Command lama <code>/dryrun KODE ID_BAB</code> juga masih diterima.'
    );
  }
  if (!text) return;
  if (text === '/start' || text === '/help') return help(msg.chat.id);
  if (text === '/queue') return showQueue(msg.chat.id);

  let m = text.match(/^\/terima\s+(\S+)$/i);
  if (m) return accept(msg.chat.id, m[1]);
  m = text.match(/^\/claim\s+(\S+)$/i);
  if (m) return claim(msg.chat.id, m[1]);
  m = text.match(/^\/fix\s+(\S+)\s+(.+)$/is);
  if (m) return needsFix(msg.chat.id, m[1], m[2]);
  m = text.match(/^\/show\s+(\S+)$/i);
  if (m) return showSubmission(msg.chat.id, m[1]);
  m = text.match(/^\/files\s+(\S+)(?:\s+(\d+))?$/i);
  if (m) return showFiles(msg.chat.id, m[1], m[2]);
  m = text.match(/^\/retryfiles\s+(\S+)(?:\s+(\d+))?$/i);
  if (m) {
    const sub = await medcoel.getSubmission(m[1]);
    await pdfQueue.retry(sub, msg.chat.id, m[2]);
    return telegram.sendMessage(msg.chat.id, 'Retry PDF diantrekan. File yang sudah terkonfirmasi terkirim tidak dikirim ulang.');
  }

  return telegram.sendMessage(msg.chat.id, 'Perintah tidak dikenali. Kirim /help.');
}

async function help(chatId) {
  const parts = buildHelp({ retargetHelp: retarget.helpText(), importHelp: importPlans.helpText() });
  for (const part of parts) await telegram.sendMessage(chatId, part);
}

async function showQueue(chatId) {
  const [waiting, queued] = await Promise.all([
    medcoel.listSubmissions('menunggu_konfirmasi'),
    medcoel.listQueued(),
  ]);
  const w = waiting?.items || [];
  const items = queued?.items || [];
  if (!w.length && !items.length) return telegram.sendMessage(chatId, 'Antrean Hermes kosong.');
  const parts = [];
  if (w.length) parts.push(`<b>Menunggu konfirmasi (${w.length})</b>\n\n${w.slice(0, 20).map((s) => compactSubmission(s)).join('\n\n')}`);
  if (items.length) parts.push(`<b>Antre (${items.length})</b>\n\n${items.slice(0, 20).map((s) => compactSubmission(s)).join('\n\n')}`);
  return telegram.sendMessage(chatId, parts.join('\n\n'));
}

async function showSubmission(chatId, id) {
  const sub = await medcoel.getSubmission(id);
  return telegram.sendMessage(chatId, `${queueCard(sub)}\n${escapeHtml(pdfQueue.summary(sub.id, chatId))}\n\n${howToSubmit(sub.code || id, sub.status, kindOf(sub), Number(sub.pdfCount || (sub.files || []).length))}`);
}

async function showFiles(chatId, id, only) {
  const sub = await medcoel.getSubmission(id);
  if (!drive.configured) return telegram.sendMessage(chatId, 'Drive relay Hermes belum dikonfigurasi.');
  const total = (sub.files || []).filter((f) => f.driveFileId).length;
  if (only && !pickFiles(sub.files || [], only)) {
    return telegram.sendMessage(chatId, `PDF nomor ${escapeHtml(only)} tidak ada. <b>${escapeHtml(sub.code || id)}</b> punya ${total} PDF.`);
  }
  await pdfQueue.enqueue(sub, [chatId]);
  await pdfQueue.retry(sub, chatId, only, { allowUncertain: false });
  return telegram.sendMessage(chatId, '📎 Pengiriman PDF diantrekan. File yang sudah terkonfirmasi terkirim dilewati.\n' + pdfQueue.summary(sub.id, chatId));
}

async function accept(chatId, id) {
  const sub = await medcoel.setStatus(id, 'antre');
  const code = sub.code || id;
  await pdfQueue.enqueue(sub, config.telegramAdmins);
  await state.setLastNotified(code);
  // Pengumuman "masuk antrean" untuk pengajuan ini tidak perlu dikirim lagi: admin baru saja menerimanya.
  await state.markAnnounced(`${sub.id}:${sub.updated || sub.confirmedAt || sub.status || 'antre'}:${chatId}`);
  return telegram.sendMessage(chatId, `✅ <b>${escapeHtml(code)}</b> sekarang ${escapeHtml(statusLabel(sub.status))}.\n\n${howToSubmit(code, sub.status, kindOf(sub), Number(sub.pdfCount || (sub.files || []).length))}`);
}

async function claim(chatId, id) {
  const sub = await medcoel.setStatus(id, 'diproses');
  await pdfQueue.enqueue(sub, config.telegramAdmins);
  return telegram.sendMessage(chatId, `✅ <b>${escapeHtml(sub.code || id)}</b> sekarang Diproses.`);
}

async function needsFix(chatId, id, note) {
  const sub = await medcoel.setStatus(id, 'perlu_perbaikan', note.trim());
  return telegram.sendMessage(chatId,
    `⚠️ <b>${escapeHtml(sub.code || id)}</b> ditandai Perlu perbaikan.\n${escapeHtml(note.trim())}`
  );
}

async function reportUpdateError(update, err) {
  console.error('[Hermes] update error:', safeError(err, config));
  const chatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
  if (!chatId) return;
  const body = err?.body;
  const issues = summarizeIssues(body?.items || []);
  const message = safeError(err, config) || 'Terjadi kesalahan.';
  try { await telegram.sendMessage(chatId, `❌ ${escapeHtml(message)}${issues}`); } catch (_) {}
}

function summarizeIssues(items) {
  const bad = items.filter((x) => Array.isArray(x?.errors) && x.errors.length).slice(0, 8);
  if (!bad.length) return '';
  return '\n\n<b>Masalah:</b>\n'
    + bad.map((x) => `#${escapeHtml(x.index ?? x.number ?? '?')}: ${escapeHtml(x.errors.join('; '))}`).join('\n');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fatal(where, err) {
  console.error(`[Hermes] fatal ${where}:`, safeError(err, config));
  process.exitCode = 1;
  stopping = true;
}
