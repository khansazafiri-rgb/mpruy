import { loadConfig } from './config.mjs';
import { MedcoelClient } from './medcoel.mjs';
import { StateStore } from './state.mjs';
import { TelegramClient, escapeHtml } from './telegram.mjs';
import { DriveClient } from './drive.mjs';
import { ImportPlanFlow } from './import-plan.mjs';

const config = loadConfig();
const medcoel = new MedcoelClient(config);
const telegram = new TelegramClient(config);
const drive = new DriveClient(config);
const state = new StateStore(config.stateDir);
await state.load();

const importPlans = new ImportPlanFlow({ config, medcoel, telegram, state });
let stopping = false;

process.on('SIGTERM', () => { stopping = true; });
process.on('SIGINT', () => { stopping = true; });

console.log('[Hermes] starting');
await medcoel.login();
console.log('[Hermes] MEDCOEL agent login OK');
console.log(`[Hermes] Drive PDF relay ${drive.configured ? 'enabled' : 'disabled'}`);
console.log('[Hermes] Import Plan flow enabled');

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

  if (update.callback_query) {
    await telegram.answerCallbackQuery(update.callback_query.id, 'Tombol lama tidak dipakai lagi. Gunakan /plan atau /confirm.');
    return;
  }
  if (!update.message) return;

  const msg = update.message;
  const text = String(msg.text || msg.caption || '').trim();

  if (/^\/chapters$/i.test(text) || /^\/change\s+(?:chapter|bab)$/i.test(text)) {
    return showChapters(msg.chat.id, msg.from.id);
  }

  if (await importPlans.handleMessage(msg, text)) return;

  if (msg.document) {
    return telegram.sendMessage(msg.chat.id,
      'Document tidak diproses. Untuk JSON gunakan caption <code>/put [KODE]</code>. '
      + 'Command lama <code>/dryrun KODE ID_BAB</code> juga masih diterima.'
    );
  }
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
    '<b>MEDCOEL Hermes Agent</b>\n\n'
    + '/queue — lihat pengajuan berstatus Antre\n'
    + '/show KODE — lihat detail pengajuan\n'
    + '/files KODE — kirim PDF pengajuan dari Drive\n'
    + '/claim KODE — ubah menjadi Diproses\n'
    + '/fix KODE alasan — tandai Perlu perbaikan\n\n'
    + importPlans.helpText()
    + '\n<code>/chapters</code> — kirim daftar ID bab untuk mata kuliah pada Import Plan aktif\n'
    + '<code>/change chapter</code> — shortcut untuk menampilkan daftar bab\n'
    + '\n<b>Catatan:</b> scope/kampus selalu dikunci dari submission MEDCOEL; JSON tidak boleh mengubahnya.'
  );
}

async function showChapters(chatId, actorId) {
  const plan = state.getImportPlan(chatId, actorId);
  if (!plan) {
    return telegram.sendMessage(chatId,
      'Belum ada Import Plan aktif. Kirim JSON sebagai document dengan caption <code>/put [KODE]</code> dulu.'
    );
  }
  const subjectId = plan.source?.subjectId;
  if (!subjectId) return telegram.sendMessage(chatId, 'Import Plan ini tidak memiliki mata kuliah sumber.');

  const catalog = await medcoel.getSubjectCatalog(subjectId);
  const chapters = Array.isArray(catalog?.chapters) ? catalog.chapters : [];
  if (!chapters.length) {
    return telegram.sendMessage(chatId,
      `Tidak ada bab aktif untuk <b>${escapeHtml(plan.source?.subjectName || subjectId)}</b>.`
    );
  }

  const lines = chapters.map((ch, i) =>
    `${i + 1}. <code>${escapeHtml(ch.id)}</code> — ${escapeHtml(ch.title || ch.name || '-')}`
  );
  const chunks = chunkLines(lines, 3500);
  for (let i = 0; i < chunks.length; i += 1) {
    const head = i === 0
      ? `<b>📚 BAB ${escapeHtml(plan.source?.subjectName || subjectId)}</b>\n\n`
      : `<b>📚 BAB lanjutan ${i + 1}/${chunks.length}</b>\n\n`;
    const tail = i === chunks.length - 1
      ? '\n\nPilih dengan: <code>/change chapter ID_BAB</code>'
      : '';
    await telegram.sendMessage(chatId, head + chunks[i] + tail);
  }
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
  return telegram.sendMessage(chatId,
    `⚠️ <b>${escapeHtml(sub.code || id)}</b> ditandai Perlu perbaikan.\n${escapeHtml(note.trim())}`
  );
}

async function reportUpdateError(update, err) {
  console.error('[Hermes] update error:', err);
  const chatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
  if (!chatId) return;
  const body = err?.body;
  const issues = summarizeIssues(body?.items || []);
  const message = err?.userMessage ? err.message : (err?.message || 'Terjadi kesalahan.');
  try { await telegram.sendMessage(chatId, `❌ ${escapeHtml(message)}${issues}`); } catch (_) {}
}

function queueCard(sub, queue) {
  const files = (sub.files || [])
    .map((f) => `• ${escapeHtml(f.name)}${f.driveFileId ? ' · siap dikirim dari Drive' : ''}`)
    .join('\n') || '• tidak ada file';
  const q = queue
    ? `\nAntrean PDF: ${Number(queue.totalQueuedPdf || 0)} · estimasi ${Number(queue.estimateDays || 0)} hari`
    : '';
  const scope = sub.restriction === 'campus'
    ? `campus${sub.campus?.name ? ` · ${escapeHtml(sub.campus.name)}` : ''}`
    : (sub.restriction || sub.scope || '-');
  return `<b>📥 ${escapeHtml(sub.code || sub.id)}</b>\n`
    + `Status: ${escapeHtml(sub.status)}\n`
    + `Sumber mata kuliah: ${escapeHtml(sub.subject?.name || sub.subject?.id || '-')}\n`
    + `Cakupan: ${scope}\n`
    + `Bahasa: ${escapeHtml(sub.language || '-')}\n`
    + `PDF: ${Number(sub.pdfCount || (sub.files || []).length)}\n`
    + `${files}${q}`;
}

function compactSubmission(sub) {
  return `<b>${escapeHtml(sub.code || sub.id)}</b> · ${escapeHtml(sub.subject?.name || '-')} · ${Number(sub.pdfCount || 0)} PDF`;
}

function summarizeIssues(items) {
  const bad = items.filter((x) => Array.isArray(x?.errors) && x.errors.length).slice(0, 8);
  if (!bad.length) return '';
  return '\n\n<b>Masalah:</b>\n'
    + bad.map((x) => `#${escapeHtml(x.index ?? x.number ?? '?')}: ${escapeHtml(x.errors.join('; '))}`).join('\n');
}

function chunkLines(lines, maxChars) {
  const chunks = [];
  let current = '';
  for (const line of lines) {
    const next = current ? `${current}\n${line}` : line;
    if (next.length > maxChars && current) {
      chunks.push(current);
      current = line;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fatal(where, err) {
  console.error(`[Hermes] fatal ${where}:`, err);
  process.exitCode = 1;
  stopping = true;
}
