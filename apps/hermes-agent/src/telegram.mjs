import https from 'node:https';
import { Readable } from 'node:stream';
import crypto from 'node:crypto';

export class TelegramClient {
  constructor(config) {
    this.token = config.telegramToken;
    this.api = `https://api.telegram.org/bot${this.token}`;
  }

  async call(method, body = {}) {
    const res = await fetch(`${this.api}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(`Telegram ${method} failed: ${data.description || res.statusText}`);
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

  answerCallbackQuery(id, text = '') {
    return this.call('answerCallbackQuery', { callback_query_id: id, text, show_alert: false });
  }

  async getFile(fileId) {
    return this.call('getFile', { file_id: fileId });
  }

  async downloadFile(fileId, maxBytes) {
    const meta = await this.getFile(fileId);
    if (meta.file_size && meta.file_size > maxBytes) throw new Error(`File terlalu besar (${meta.file_size} bytes)`);
    const res = await fetch(`https://api.telegram.org/file/bot${this.token}/${meta.file_path}`);
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

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.telegram.org',
        method: 'POST',
        path: `/bot${this.token}/sendDocument`,
        headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      }, (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => {
          let data;
          try { data = JSON.parse(raw); } catch (_) { return reject(new Error(`Telegram sendDocument invalid response: HTTP ${res.statusCode}`)); }
          if (res.statusCode >= 300 || !data.ok) return reject(new Error(`Telegram sendDocument failed: ${data.description || res.statusCode}`));
          resolve(data.result);
        });
      });
      req.on('error', reject);
      req.write(prefix);

      const stream = Readable.fromWeb(sourceResponse.body);
      stream.on('error', (err) => req.destroy(err));
      stream.on('end', () => {
        req.write(suffix);
        req.end();
      });
      stream.pipe(req, { end: false });
    });
  }
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
