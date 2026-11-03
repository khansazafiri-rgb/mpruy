import https from 'node:https';
import http from 'node:http';
import { DeliveryError, apiFailure } from './delivery-errors.mjs';
import { Readable, Transform } from 'node:stream';
import crypto from 'node:crypto';

export class TelegramClient {
  constructor(config) {
    this.token = config.telegramToken;
    this.requestTimeoutMs = config.telegramRequestTimeoutMs || 45000;
    this.uploadTimeoutMs = config.pdfUploadTimeoutMs || 300000;
    this.maxBytes = config.pdfMaxBytes || 50 * 1024 * 1024;
    // TELEGRAM_API_BASE hanya dipakai untuk uji dengan server palsu; produksi memakai alamat bawaan.
    this.base = config.telegramApiBase || 'https://api.telegram.org';
    this.api = `${this.base}/bot${this.token}`;
  }

  async call(method, body = {}) {
    const res = await fetch(`${this.api}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.requestTimeoutMs),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw apiFailure('Telegram '+method, data.error_code || res.status, data);
    return data.result;
  }

  getUpdates(offset, timeout) {
    return this.call('getUpdates', {
      offset,
      timeout,
      allowed_updates: ['message', 'callback_query'],
    });
  }

  sendMessage(chatId, text, extra = {}) {
    return this.call('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...extra,
    });
  }

  // Menu "/" di Telegram: daftar shortcut yang muncul saat admin mengetik garis miring.
  setMyCommands(commands) {
    return this.call('setMyCommands', { commands });
  }

  answerCallbackQuery(id, text = '') {
    return this.call('answerCallbackQuery', { callback_query_id: id, text, show_alert: false });
  }

  async getFile(fileId) {
    return this.call('getFile', { file_id: fileId });
  }

  async downloadFile(fileId, maxBytes) {
    const meta = await this.getFile(fileId);
    if (meta.file_size && meta.file_size > maxBytes) throw new Error(`File terlalu besar (${meta.file_size} bytes)`);
    const res = await fetch(`${this.base}/file/bot${this.token}/${meta.file_path}`);
    if (!res.ok) throw new Error(`Telegram file download failed: HTTP ${res.status}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength > maxBytes) throw new Error(`File terlalu besar (${bytes.byteLength} bytes)`);
    return bytes;
  }

  // Relays a remote Response body to Telegram without writing a temporary file
  // and without buffering the entire PDF in memory.
  async sendDocumentStream(chatId, fileName, sourceResponse, caption = '') {
    if (!sourceResponse?.body) throw new Error('Sumber dokumen tidak memiliki stream.');
    const boundary = `----medcoel-${crypto.randomBytes(12).toString('hex')}`;
    const safeName = String(fileName || 'document.pdf').replace(/[\r\n"]/g, '_');
    const mime = sourceResponse.headers.get('content-type') || 'application/octet-stream';
    const parts = [
      `--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${chatId}\r\n`,
    ];
    if (caption) {
      parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${String(caption).slice(0, 1024)}\r\n`);
    }
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="document"; filename="${safeName}"\r\nContent-Type: ${mime}\r\n\r\n`,
    );
    const prefix = parts.join('');
    const suffix = `\r\n--${boundary}--\r\n`;

    const declared = Number(sourceResponse.headers.get('content-length'));
    if (declared > this.maxBytes) { await sourceResponse.body.cancel(); throw new DeliveryError('PDF melebihi batas unggahan Telegram.', { retryable: false }); }
    const endpoint = new URL(this.api + '/sendDocument');
    return new Promise((resolve, reject) => {
      let stream, validate, timer, settled = false, finishedUpload = false, bytes = 0, signature = Buffer.alloc(0);
      const complete = (error, value) => {
        if (settled) return; settled = true; clearTimeout(timer);
        if (error) { stream?.destroy(); validate?.destroy(); req.destroy(); reject(error); } else { stream?.destroy(); validate?.destroy(); resolve(value); }
      };
      const req = (endpoint.protocol === 'http:' ? http : https).request(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'multipart/form-data; boundary=' + boundary },
      }, res => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('error', () => complete(new DeliveryError('Telegram response interrupted.', { uncertain: finishedUpload })));
        res.on('data', chunk => { raw += chunk; if (raw.length > 1000000) complete(new DeliveryError('Telegram response too large.', { uncertain: finishedUpload })); });
        res.on('end', () => {
          let data; try { data = JSON.parse(raw); } catch { return complete(new DeliveryError('Telegram response is not valid JSON.', { uncertain: finishedUpload })); }
          if (res.statusCode >= 300 || !data.ok) return complete(apiFailure('Telegram sendDocument', data.error_code || res.statusCode, data));
          if (!Number.isInteger(data.result?.message_id)) return complete(new DeliveryError('Telegram confirmation has no message_id.', { uncertain: true }));
          complete(null, data.result);
        });
      });
      req.on('error', () => complete(new DeliveryError('Telegram document transport failed.', { uncertain: finishedUpload })));
      timer = setTimeout(() => complete(new DeliveryError('Telegram upload timed out.', { uncertain: finishedUpload })), this.uploadTimeoutMs);
      req.write(prefix);
      stream = Readable.fromWeb(sourceResponse.body);
      validate = new Transform({ transform: (chunk, _, callback) => {
        bytes += chunk.length;
        if (bytes > this.maxBytes) return callback(new DeliveryError('PDF melebihi batas unggahan Telegram.', { retryable: false }));
        if (signature.length < 5) signature = Buffer.concat([signature, chunk.subarray(0, 5 - signature.length)]);
        if (signature.length >= 5 && signature.toString('ascii') !== '%PDF-') return callback(new DeliveryError('Drive mengembalikan isi yang bukan PDF.', { retryable: false }));
        callback(null, chunk);
      }});
      stream.on('error', error => { validate.destroy(); complete(error instanceof DeliveryError ? error : new DeliveryError('Drive PDF stream interrupted.', { stage: 'Drive' })); });
      validate.on('error', error => { stream.destroy(); complete(error); });
      validate.on('end', () => {
        if (signature.length < 5 || settled) return complete(new DeliveryError('PDF kosong atau tidak valid.', { retryable: false }));
        req.end(suffix); finishedUpload = true;
      });
      stream.pipe(validate).pipe(req, { end: false });
    });
  }
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
