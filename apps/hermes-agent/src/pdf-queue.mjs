import crypto from 'node:crypto';
import { describeFile } from './files.mjs';
import { DeliveryError, safeError } from './delivery-errors.mjs';
const keyFor = (sub, chat) => crypto.createHash('sha256').update(`${sub}:${chat}`).digest('hex');
const active = status => ['antre', 'diproses'].includes(status);
export class PdfQueue {
  constructor({ state, drive, telegram, medcoel, config = {}, now = Date.now, log = console.log }) {
    Object.assign(this, { state, drive, telegram, medcoel, config, now, log }); this.busy = false;
  }
  emit(tag, message) { this.log(`[${tag}] ${safeError(message, this.config)}`); }
  async recover() {
    for (const [key, job] of Object.entries(this.state.data.pdfJobs)) {
      let changed = false;
      for (const file of job.files) {
        if (file.status === 'preparing') { file.status = 'retry'; file.nextAttemptAt = this.now(); changed = true; }
        if (file.status === 'sending') {
          file.status = 'uncertain'; file.error = 'Service berhenti sebelum konfirmasi pengiriman tersimpan. Periksa chat sebelum /retryfiles.'; changed = true;
        }
      }
      if (changed) { await this.state.putPdfJob(key, job); this.emit('HermesQueue', `recovered ${job.code}`); }
    }
  }
  async enqueue(sub, chats) {
    if (!active(sub.status)) return;
    const unique = [...new Map((sub.files || []).filter(f => f.driveFileId).map(f => [f.driveFileId, f])).values()];
    if (!unique.length) return;
    for (const chat of chats) {
      const key = keyFor(sub.id, chat), old = this.state.data.pdfJobs[key];
      const job = old ? structuredClone(old) : { id: sub.id, code: sub.code || sub.id, chatId: String(chat), files: [], completionNotified: false, createdAt: this.now() };
      job.contentKind = sub.contentKind === 'materi' ? 'materi' : 'soal';
      const previous = new Map(job.files.map(f => [f.driveFileId, f]));
      const files = unique.map((file, index) => ({ ...previous.get(file.driveFileId), driveFileId: file.driveFileId, name: file.name, index,
        status: previous.get(file.driveFileId)?.status || 'pending', attempts: previous.get(file.driveFileId)?.attempts || 0 }));
      if (files.some(f => !previous.has(f.driveFileId))) { job.completionNotified = false; job.completedAt = null; }
      job.files = files;
      if (!old || JSON.stringify(old) !== JSON.stringify(job)) await this.state.putPdfJob(key, job);
    }
  }
  async retry(sub, chat, only, { allowUncertain = true } = {}) {
    await this.enqueue(sub, [chat]);
    const key = keyFor(sub.id, chat), job = structuredClone(this.state.data.pdfJobs[key]);
    if (!job) throw new DeliveryError('Tidak ada PDF dalam antrean. Konfirmasi pengajuan dengan /terima terlebih dahulu.', { retryable: false });
    if (only && !job.files.some(f => f.index + 1 === Number(only))) throw new DeliveryError('Nomor PDF tidak tersedia.', { retryable: false });
    for (const file of job.files) if ((!only || file.index + 1 === Number(only)) && ['retry', 'blocked', ...(allowUncertain ? ['uncertain'] : [])].includes(file.status)) {
      file.status = 'pending'; file.attempts = 0; file.nextAttemptAt = 0; delete file.error;
    }
    await this.state.putPdfJob(key, job);
  }
  summary(subId, chat) {
    const job = this.state.data.pdfJobs[keyFor(subId, chat)];
    if (!job) return '';
    const count = status => job.files.filter(f => f.status === status).length;
    return `Pengiriman Telegram: ${count('delivered')}/${job.files.length} terkirim · ${count('retry')} retry · ${count('blocked') + count('uncertain')} perlu diperiksa`;
  }
  async notify(job, text) {
    try { await this.telegram.sendMessage(job.chatId, text, { parse_mode: undefined }); return true; }
    catch (error) { this.emit('Telegram', `progress notification failed: ${safeError(error, this.config)}`); return false; }
  }
  async tick() {
    if (this.busy) return { busy: true };
    this.busy = true;
    try {
      for (const [key, stored] of Object.entries(this.state.data.pdfJobs)) {
        const job = structuredClone(stored);
        if (job.files.every(f => f.status === 'delivered')) {
          if (!job.completionNotified && (job.notifyAt || 0) <= this.now()) {
            job.completionNotified = await this.notify(job, `✅ ${job.code}\n${job.files.length} PDF berhasil dikirim`);
            job.notifyAt = this.now() + 60_000;
            await this.state.putPdfJob(key, job);
          }
          continue;
        }
        const file = job.files.find(f => ['pending', 'retry'].includes(f.status) && (f.nextAttemptAt || 0) <= this.now());
        if (!file) {
          if (!job.attentionNotified && job.files.some(f => ['blocked', 'uncertain'].includes(f.status))) {
            job.attentionNotified = await this.notify(job, `⚠️ ${job.code}\nPengiriman perlu diperiksa. Gunakan /show ${job.code}; setelah memastikan file belum terkirim, /retryfiles ${job.code}.`);
            await this.state.putPdfJob(key, job);
          }
          continue;
        }
        await this.deliver(key, job, file);
        return { picked: job.code, file: file.index + 1 };
      }
      return { idle: true };
    } finally { this.busy = false; }
  }
  async deliver(key, job, file) {
    let response;
    this.emit('HermesQueue', `picked ${job.code}`);
    job.deliveryStartedAt ||= this.now();
    file.lastAttemptAt = this.now();
    file.status = 'preparing'; file.attempts++;
    await this.state.putPdfJob(key, job);
    try {
      if (!this.drive.configured) throw new DeliveryError('Drive relay belum dikonfigurasi.', { stage: 'Drive', retryAfterMs: 60_000 });
      // Confirmation/import status belongs to MEDCOEL. PDF delivery has its own ledger.
      const latest = await this.medcoel.getSubmission(job.id);
      if (!active(latest.status) || !(latest.files || []).some(f => f.driveFileId === file.driveFileId)) {
        throw new DeliveryError('Status pengajuan atau daftar PDF berubah; pengiriman dihentikan.', { retryable: false });
      }
      await this.notify(job, `📦 ${job.code}\nMengirim ${file.index + 1}/${job.files.length} — ${file.name}`);
      this.emit('Drive', `downloading fileId=${file.driveFileId}`);
      response = await this.drive.openFile(file.driveFileId);
      const { filename, caption } = describeFile(job.code, file.index, job.files.length, file.name, job.contentKind);
      file.status = 'sending'; file.deliveryStartedAt = this.now(); await this.state.putPdfJob(key, job);
      this.emit('Telegram', `sending ${file.index + 1}/${job.files.length} ${filename}`);
      const sent = await this.telegram.sendDocumentStream(job.chatId, filename, response, caption);
      if (!Number.isInteger(sent?.message_id) || sent.message_id <= 0) throw new DeliveryError('Telegram tidak mengembalikan message_id.', { uncertain: true });
      file.status = 'delivered'; file.messageId = sent.message_id; file.deliveredAt = this.now(); delete file.error;
      // If this write fails, keep the acknowledged result in memory and never re-send.
      await this.state.putPdfJob(key, job);
      this.emit('Telegram', `sent messageId=${sent.message_id}`);
      if (job.files.every(f => f.status === 'delivered')) {
        job.completedAt = this.now(); await this.state.putPdfJob(key, job);
        this.emit('HermesQueue', `completed ${job.code}`);
      }
    } catch (error) {
      if (file.status === 'delivered') { this.emit('HermesQueue', `ack persistence failed for ${job.code}; no resend: ${safeError(error, this.config)}`); throw error; }
      file.error = safeError(error, this.config);
      const unknown = error.uncertain === true;
      file.status = unknown ? 'uncertain' : error.retryable === false || file.attempts >= (this.config.pdfMaxAttempts || 8) ? 'blocked' : 'retry';
      file.nextAttemptAt = this.now() + Math.max(error.retryAfterMs || 0, Math.min(3_600_000, (this.config.pdfRetryMs || 15_000) * 2 ** Math.min(8, file.attempts - 1)));
      job.attentionNotified = false;
      await this.state.putPdfJob(key, job);
      this.emit('HermesQueue', `${job.code} file=${file.index + 1} state=${file.status} ${file.error}`);
      const note = file.status === 'retry' ? 'Retry scheduled.' : unknown ? 'Konfirmasi belum pasti; cek chat sebelum /retryfiles agar tidak duplikat.' : 'Periksa akses/ukuran file, lalu /retryfiles setelah diperbaiki.';
      await this.notify(job, `⚠️ ${job.code}\nFile ${file.index + 1}/${job.files.length} gagal dikirim\n${file.error}\n${note}`);
    } finally { try { await response?.body?.cancel(); } catch { /* stream may already be consumed */ } }
  }
}
